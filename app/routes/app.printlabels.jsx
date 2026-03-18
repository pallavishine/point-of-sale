// app/routes/app.route.printlabels.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import {
  GET_COLLECTIONS_QUERY,
  GET_PRODUCTTYPES_QUERY,
  GET_PRODUCT_VARIANTS_QUERY,
} from "../Admin_Grapgql_Api/QUERIES";
import VariantList from "../components/VariantList";
import { printJobModel, templateModel } from "../db.schema";
import { BARCODE_FORMATS } from "../components/constants";
import LabelPreview from "../components/LabelPreview";
import { useLinesManager } from "../hooks/useLinesManager";
import { getselectedFieldsAsLines } from "../utils/labelPaperUtils";
// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  const [collectionsRes, typesRes, templates] = await Promise.all([
    admin.graphql(GET_COLLECTIONS_QUERY),
    admin.graphql(GET_PRODUCTTYPES_QUERY),
    templateModel.find({ shop: session.shop }),
  ]);

  const collectionsJson = await collectionsRes.json();
  const typesJson = await typesRes.json();

  const collectionMap = Object.fromEntries(
    collectionsJson.data?.collections.nodes.map((col) => [col.id, col.title]) ??
      [],
  );

  const productTypes =
    typesJson.data?.productTypes.edges.map(({ node }) => node) ?? [];

  const templateList = await JSON.parse(JSON.stringify(templates));

  return { collections: collectionMap, productTypes, templateList ,shop:session.shop};
}

// ─────────────────────────────────────────────────────────────────────────────
// Action
// ─────────────────────────────────────────────────────────────────────────────
export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action");
  const data = JSON.parse(formData.get("data") || "{}");

  // ── Fetch product variants ────────────────────────────────────────────────
  if (actionType === "fetch_variants") {
    const {
      first = 10,
      after,
      before,
      query,
      direction,
      sortBy,
      orderBy,
    } = data;
    try {
      const response = await admin.graphql(GET_PRODUCT_VARIANTS_QUERY, {
        variables: {
          ...(direction === "next" ? { first } : { last: first }),
          query: query || "",
          ...(direction === "next" ? { after } : { before }),
          sortKey: sortBy || "PRODUCT_TITLE",
          reverse: orderBy === "desc",
        },
      });

      const json = await response.json();

      const productVariants =
        json.data?.productVariants?.nodes?.map((variant) => ({
          id: variant.id,
          productId: variant.product.id,
          status: variant.product.status,
          productTitle:variant.product.title,
          vendor:variant.product.vendor,
          descriptionHtml:variant.product.descriptionHtml,
          tags:variant.product.tags,
          title: variant.title,
          sku: variant.sku,
          barcode: variant.barcode,
          price:variant.price,
          compareAtPrice:variant.compareAtPrice,
          displayName: variant.displayName,
          inventoryQuantity: variant.inventoryQuantity,
          label_quantity: 1,
          featuredImage: variant.media?.nodes?.[0]?.preview?.image?.url ?? null,
        })) ?? [];

      return {
        action: "fetch_variants",
        productVariants,
        pageInfo: json.data?.productVariants?.pageInfo ?? {},
        totalCount: json.data?.productVariants?.nodes?.length ?? 0,
      };
    } catch (error) {
      console.error("Error fetching product variants:", error);
      return { action: "fetch_variants", error: error.message };
    }
  }

  // ── Print label ───────────────────────────────────────────────────────────
  if (actionType === "print_label") {
    const { variants, templateId } = data;

    if (!templateId) {
      return {
        action: "print_label",
        status: false,
        error: "No template selected.",
      };
    }
    if (!variants?.length) {
      return {
        action: "print_label",
        status: false,
        error: "No variants provided.",
      };
    }

    try {
      // Verify the template belongs to this shop
      const template = await templateModel.findOne({
        id: templateId,
        shop: session.shop,
      });

      if (!template) {
        return {
          action: "print_label",
          status: false,
          error: "Label template not found.",
        };
      }

      // ── Insert a print job record so you can track / queue printing ────────
      const printJob = await printJobModel.create({
        shop: session.shop,
        templateId,
        variantIds: variants.map((v) => v.id),
        status: "pending",
      });

      // TODO: Trigger your actual label rendering / printer service here,
      // passing printJob.id, template details, and the variant list.
      // e.g.: await labelPrinterService.queue(printJob.id);

      return {
        action: "print_label",
        status: true,
        printJobId: printJob.id,
        message: `Print job created for ${variants.length} variant(s).`,
      };
    } catch (error) {
      console.error("Error creating print job:", error);
      return { action: "print_label", status: false, error: error.message };
    }
  }

  return { error: "Invalid action" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function PrintLabels() {
  const { collections, productTypes, templateList ,shop} = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState(new Set());
  const [printFeedback, setPrintFeedback] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(()=>templateList?.length==1 ? templateList[0] : null);
  const [codeFormat, setCodeFormat] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: [],
    vendor: [],
    collection: [],
    type: "",
    cursor: null,
    direction: "next",
  });
  // ── Handle print_label response ──────────────────────────────────────────
  useEffect(() => {
    if (fetcher?.state === "idle" && fetcher?.data?.action === "print_label") {
      if (fetcher.data.status) {
        setPrintFeedback({
          type: "success",
          message: fetcher.data.message || "Print job sent successfully.",
        });
        clearSelectedVariants();
      } else {
        setPrintFeedback({
          type: "error",
          message: fetcher.data.error || "Failed to send print job.",
        });
      }
    }
  }, [fetcher?.state, fetcher?.data]);
  // ── Selection management ─────────────────────────────────────────────────
  const handleSelectVariants = useCallback((variants, action) => {
    if (action === "add") {
      setSelectedVariants((prev) => {
        const existingIds = new Set(prev.map((v) => v.id));
        const newOnes = variants.filter((v) => !existingIds.has(v.id));
        return [...prev, ...newOnes];
      });
      setSelectedVariantIds((prev) => {
        const next = new Set(prev);
        variants.forEach((v) => next.add(v.id));
        return next;
      });
    } else {
      const removeIds = new Set(variants.map((v) => v.id));
      setSelectedVariants((prev) => prev.filter((v) => !removeIds.has(v.id)));
      setSelectedVariantIds((prev) => {
        const next = new Set(prev);
        removeIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, []);

  const clearSelectedVariants = useCallback(() => {
    setSelectedVariants([]);
    setSelectedVariantIds(new Set());
    setLoading(false);
  }, []);



  return (
    <s-page heading="Label Template Selection">
      <s-link slot="breadcrumb-actions" href="/app">
        pos-app-new
      </s-link>
      <s-stack gap="base" padding="base">
        {printFeedback && (
          <s-box paddingBlockEnd="small-400">
            <s-banner
              tone={printFeedback.type === "success" ? "success" : "critical"}
              onDismiss={() => setPrintFeedback(null)}
            >
              {printFeedback.message}
            </s-banner>
          </s-box>
        )}
       
        {/* ── Template Selector ── */}
        {/* <s-section>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-select
              label="Barcode Format"
              value={codeFormat}
              onChange={(e) => setCodeFormat(e.currentTarget.value)}
            >
              {BARCODE_FORMATS.map((elm, idx) => (
                <s-option key={idx} value={elm.value}>
                  {elm.label}
                </s-option>
              ))}
            </s-select>
          </s-stack>
        </s-section> */}

        <s-grid gridTemplateColumns="repeat(3, 1fr)" gap="large">
          {" "}
          {templateList?.map((template, index) => (
            <s-grid-item key={index}>
              <s-clickable onClick={(e) => setSelectedTemplate(template)} padding="none" >
                <s-box
                  padding="base"
                  background={
                    selectedTemplate?._id == template?._id ? "base" : "subdued"
                  }
                  borderRadius="base"
                  borderWidth={
                    selectedTemplate?._id == template?._id
                      ? "large"
                      : "base"
                  }
                  borderColor={
                    selectedTemplate?._id == template?._id ? "strong" : "base"
                  }
                >
                  <s-stack  gap="none" >
                    <s-stack direction="inline" justifyContent="space-between">
                      <s-heading variant="headingSm">
                        {template.templateName}
                      </s-heading>
                      <s-text color="subdued">{template?.dimension?.labelSize}</s-text>
                    </s-stack>

                      <s-stack alignItems="center" padding="none">
                    
                        <div style={{ transform: "scale(0.8,0.7)" }}>
                          <LabelPreview
                          shop={shop}
                            dimension={template?.dimension?.raw}
                            settings={template?.settings}
                            lines={getselectedFieldsAsLines(template?.lines)}
                            advancedElements={template?.advancedElements}
                          />
                        </div>
                      </s-stack>

                    <s-stack direction="inline" justifyContent="space-between">
                      <s-text color="subdued">sheet</s-text>

                      <s-link
                        href={`/app/template/${template?._id}`}
                        icon="edit"
                        onClick={()=>navigate(`/app/template/${template?._id}` )}
                      >
                        Edit
                      </s-link>
                    </s-stack>
                  </s-stack>
                </s-box>
              </s-clickable>
            </s-grid-item>
          ))}
        </s-grid>

        <VariantList
          shop={shop}
          onSelectVariants={handleSelectVariants}
          selectedVariantIds={selectedVariantIds}
          clearSelectedVariants={clearSelectedVariants}
          collections={collections}
          productTypes={productTypes}
          selectedVariants={selectedVariants}
          setSelectedVariantIds={setSelectedVariantIds}
          setSelectedVariants={setSelectedVariants}
          setLoading={setLoading}
          setIsLoading={setIsLoading}
          loading={loading}
          isLoading={isLoading}
          filters={filters}
          setFilters={setFilters}
          selectedTemplate={selectedTemplate}
        />
      </s-stack>
    </s-page>
  );
}
