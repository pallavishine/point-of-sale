// app/routes/app.generateBarcode.jsx
import { useState, useEffect, useCallback } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { buildVariantUpdates } from "../utils/barcodeGenerator";
import ProductList from "../components/ProductList";
import { authenticate } from "../shopify.server";
import {
  GET_COLLECTIONS_QUERY,
  GET_PRODUCTTYPES_QUERY,
  GET_PRODUCTS_QUERY,
} from "../Admin_Grapgql_Api/QUERIES";
import { PRODUCT_VARIANTS_BULK_UPDATE } from "../Admin_Grapgql_Api/MUTATIONS";

// ─── Loader ───────────────────────────────────────────────────────────────────
export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const [collectionsRes, typesRes] = await Promise.all([
    admin.graphql(GET_COLLECTIONS_QUERY),
    admin.graphql(GET_PRODUCTTYPES_QUERY),
  ]);

  const collectionsJson = await collectionsRes.json();
  const typesJson = await typesRes.json();

  const collectionMap = Object.fromEntries(
    collectionsJson.data.collections.nodes.map((col) => [col.id, col.title]),
  );
  const productTypes = typesJson.data.productTypes.edges.map(
    ({ node }) => node,
  );

  return { collections: collectionMap, productTypes };
}

// ─── Action ───────────────────────────────────────────────────────────────────
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("action");
  const data = JSON.parse(formData.get("data"));

  // ── Fetch products ────────────────────────────────────────────────────────
  if (actionType === "fetch_products") {
    const { first, after, before, query, direction } = data;
    try {
      const response = await admin.graphql(GET_PRODUCTS_QUERY, {
        variables: {
          ...(direction === "next" ? { first } : { last: first }),
          query: query || "",
          ...(direction === "next" ? { after } : { before }),
        },
      });
      const json = await response.json();

      const products =
        json.data?.products?.edges?.map((product) => ({
          id: product.node.id,
          title: product.node.title,
          handle: product.node.handle,
          status: product.node.status,
          productType: product.node.productType,
          vendor: product.node.vendor,
          price: product.node.priceRangeV2.minVariantPrice.amount,
          featuredImage: product.node.media?.nodes?.[0]?.preview.image.url,
          variants:
            product.node.variants?.edges?.map((variant) => ({
              id: variant.node.id,
              productId: product.node.id,
              productTitle: product.node.title,
              title: variant.node.title,
              sku: variant.node.sku,
              barcode: variant.node.barcode,
              price: variant.node.price,
              inventoryQuantity: variant.node.inventoryQuantity,
              featuredImage: variant.node.media?.nodes?.[0]?.preview.image.url,
            })) || [],
        })) || [];

      return {
        action: "fetch_products",
        products,
        pageInfo: json.data?.products?.pageInfo,
        totalCount: json.data?.products?.edges?.length,
      };
    } catch (error) {
      console.error("Error fetching products:", error);
      return { action: "fetch_products", error: error.message };
    }
  }

  // ── Generate barcodes / SKUs ──────────────────────────────────────────────
  if (actionType === "generate_barcode") {
    const {
      assignmentType,
      generationType,
      overwriteExisting,
      variants,
      customConfig = {}, // only relevant when generationType === "custom"
    } = data;
    console.log(
      "Received generation request:",
      assignmentType,
      generationType,
      overwriteExisting,
      customConfig
    );
    // Validate required selection fields
    if (!assignmentType) {
      return {
        action: "generate_barcode",
        status: false,
        error: "assignmentType is required.",
      };
    }
    if (!generationType) {
      return {
        action: "generate_barcode",
        status: false,
        error: "generationType is required.",
      };
    }
    if (!variants?.length) {
      return {
        action: "generate_barcode",
        status: false,
        error: "No variants provided.",
      };
    }
    if (generationType === "custom" && !customConfig?.template) {
      return {
        action: "generate_barcode",
        status: false,
        error: "A template string is required for custom barcode generation.",
      };
    }

    const errors = [];
    const results = [];

    try {
      // ── Build flat update list — one entry per variant that needs updating ──
      // buildVariantUpdates handles the overwrite logic and sequence indexing.
      const allUpdates = buildVariantUpdates({
        generationType,
        assignmentType,
        overwriteExisting,
        variants,
        customConfig,
      });

      if (!allUpdates.length) {
        return {
          action: "generate_barcode",
          status: true,
          results: [],
          errors: [],
          totalProcessed: variants.length,
          successful: 0,
          failed: 0,
          skipped: variants.length,
          message:
            "All selected variants already have values. Enable overwrite to replace them.",
        };
      }

      // ── Group by productId for the bulk mutation ───────────────────────────
      const byProduct = allUpdates.reduce((acc, update) => {
        // Derive productId from the variants array since the update only has variantId
        const variant = variants.find((v) => v.id === update.id);
        const productId = variant?.productId;
        if (!productId) return acc;
        if (!acc[productId]) acc[productId] = [];
        acc[productId].push(update);
        return acc;
      }, {});

      // ── Run one bulk mutation per product ─────────────────────────────────
      for (const [productId, variantUpdates] of Object.entries(byProduct)) {
        if (!variantUpdates.length) continue;

        try {
          const response = await admin.graphql(PRODUCT_VARIANTS_BULK_UPDATE, {
            variables: { productId, variants: variantUpdates },
          });
          const result = await response.json();

          const userErrors =
            result.data?.productVariantsBulkUpdate?.userErrors || [];
          userErrors.forEach((err) =>
            errors.push({ productId, error: err.message, field: err.field }),
          );

          const updated =
            result.data?.productVariantsBulkUpdate?.productVariants || [];
          updated.forEach((v) =>
            results.push({ ...v, generationType, assignmentType }),
          );
        } catch (err) {
          console.error("Bulk update error for product:", productId, err);
          errors.push({ productId, error: err.message });
        }
      }

      return {
        action: "generate_barcode",
        status: true,
        results,
        errors,
        totalProcessed: variants.length,
        successful: results.length,
        failed: errors.length,
        skipped: variants.length - allUpdates.length,
        generationType,
        assignmentType,
      };
    } catch (error) {
      console.error("Generation error:", error);
      return {
        action: "generate_barcode",
        status: false,
        error: error.message,
        results: [],
        errors: [{ error: error.message }],
        totalProcessed: variants?.length || 0,
        successful: 0,
        failed: variants?.length || 0,
      };
    }
  }

  return { error: "Invalid action" };
}

// ─── Page Component ───────────────────────────────────────────────────────────
export default function GenerateBarcodePage() {
  const fetcher = useFetcher();
  const { collections, productTypes } = useLoaderData();

  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [data, setData] = useState({
    assignmentType: "",
    generationType: "",
    overwriteExisting: false,
    // Custom barcode config — only used when generationType === "custom"
    customConfig: {
      template: "{prefix}{variantId}{random6}{suffix}",
      prefix: "",
      suffix: "",
      sequencePadding: 4,
    },
  });

  const [selectedVariants, setSelectedVariants] = useState([]);
  const [selectedVariantIds, setSelectedVariantIds] = useState(new Set());
  const [filters, setFilters] = useState({
    search: "",
    status: [],
    vendor: [],
    collection: [],
    type: "",
    cursor: null,
    direction: "next",
  });

  // ── Reset after successful generation ───────────────────────────────────
  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (fetcher.data?.action !== "generate_barcode") return;
    if (!fetcher.data?.status) return;

    clearSelectedVariants();
    setFilters({
      search: "",
      status: [],
      vendor: [],
      collection: [],
      type: "",
      cursor: null,
      direction: "next",
    });
    setData({
      assignmentType: "",
      generationType: "",
      overwriteExisting: false,
      customConfig: {
        template: "{prefix}{variantId}{random6}{suffix}",
        prefix: "",
        suffix: "",
        sequencePadding: 4,
      },
    });
    window.location.reload();
  }, [fetcher.state, fetcher.data]);

  const handleSelectVariants = useCallback((variants, action) => {
    if (action === "add") {
      setSelectedVariants((prev) => {
        const existingIds = new Set(prev.map((v) => v.id));
        return [...prev, ...variants.filter((v) => !existingIds.has(v.id))];
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

  const handleGenerate = () => {
    if (!selectedVariants.length) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("action", "generate_barcode");
    formData.append(
      "data",
      JSON.stringify({
        assignmentType: data.assignmentType,
        generationType: data.generationType,
        overwriteExisting: data.overwriteExisting,
        customConfig: data.customConfig,
        variants: selectedVariants,
      }),
    );
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <s-page heading="Assign barcodes &amp; SKUs">
      <s-link slot="breadcrumb-actions" href="/app">
        pos-app-new
      </s-link>
      <s-stack gap="base" padding="base">
        <s-section>
          <s-heading>Assign</s-heading>
          <s-choice-list
            label="Assign"
            labelAccessibilityVisibility="exclusive"
            name="assignmentType"
            values={[data.assignmentType]}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                assignmentType: e.target.values[0],
              }))
            }
          >
            <s-choice value="barcode">
              Barcode
              <s-text slot="details">
                Assigns the generated code to the barcode property in Shopify
              </s-text>
            </s-choice>
            <s-choice value="sku">
              SKU (Stock keeping unit)
              <s-text slot="details">
                Assigns the generated code to the SKU property in Shopify
              </s-text>
            </s-choice>
            <s-choice value="both">
              Barcodes &amp; SKUs
              <s-text slot="details">
                Assigns both a barcode &amp; SKU at the same time
              </s-text>
            </s-choice>
          </s-choice-list>
          <s-banner tone="warning">
            <s-text>
              {data.assignmentType === "sku"
                ? "Please select the Barcode property if you are using Shopify POS"
                : "Barcodes and SKUs generated by this app are for internal use only."}
            </s-text>
          </s-banner>
        </s-section>

        {/* ── Generation type ── */}
        <s-section>
          <s-heading>Generate</s-heading>
          <s-choice-list
            label="Generation Type"
            labelAccessibilityVisibility="exclusive"
            name="generationType"
            values={[data.generationType]}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                generationType: e.target.values[0],
              }))
            }
          >
            <s-choice value="unique">
              Unique encoded barcode
              <s-text slot="details">
                18-digit encoded barcode derived from the variant ID.
              </s-text>
            </s-choice>
            <s-choice value="variantId">
              Shopify variant ID
              <s-text slot="details">
                Uses the Shopify variant ID as the barcode value.
              </s-text>
            </s-choice>
            <s-choice value="custom">
              Custom template
              <s-text slot="details">
                Build your own barcode using tokens like prefix, date, random
                number, SKU, etc.
              </s-text>
            </s-choice>
          </s-choice-list>

          {/* Custom config — only shown when "custom" is selected */}
          {data.generationType === "custom" && (
            <s-box padding="base">
              <s-box border="base" padding="small" borderRadius="base">
                <s-stack gap="small">
                  <s-heading>Custom Barcode Template</s-heading>
                  <s-banner tone="info">
                    Use tokens in curly braces. Available:{" "}
                    {
                      "{prefix} {suffix} {productId} {variantId} {sku} {date} {timestamp} {random4} {random6} {random8} {year} {month} {day} {sequence}"
                    }
                  </s-banner>
                  <s-grid
                    gridTemplateColumns="repeat(2, 1fr)"
                    gap="base"
                    alignItems="center"
                  >
                    <s-text-field
                      label="Template"
                      value={data.customConfig.template}
                      helpText='Example: "{prefix}-{variantId}-{date}-{random6}{suffix}"'
                      onInput={(e) =>
                        setData((prev) => ({
                          ...prev,
                          customConfig: {
                            ...prev.customConfig,
                            template: e.target.value,
                          },
                        }))
                      }
                    />
                    <s-stack direction="inline" gap="small" alignItems="center">
                      <s-clickable-chip
                        accessibilityLabel="Remove status filter"
                        removable
                      >
                        <s-icon slot="graphic" type="check-circle"></s-icon>
                        prefix
                      </s-clickable-chip>
                      <s-clickable-chip
                        accessibilityLabel="Remove status filter"
                        removable
                      >
                        <s-icon slot="graphic" type="check-circle"></s-icon>
                        variantId
                      </s-clickable-chip>
                      <s-clickable-chip
                        accessibilityLabel="Remove status filter"
                        removable
                      >
                        <s-icon slot="graphic" type="check-circle"></s-icon>
                        random6
                      </s-clickable-chip>
                      <s-clickable-chip
                        accessibilityLabel="Remove status filter"
                        removable
                      >
                        <s-icon slot="graphic" type="check-circle"></s-icon>
                        suffix
                      </s-clickable-chip>
                    </s-stack>
                  </s-grid>
                  <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="base">
                    <s-text-field
                      label="Prefix"
                      value={data.customConfig.prefix}
                      helpText="Static text prepended via {prefix} token"
                      onInput={(e) =>
                        setData((prev) => ({
                          ...prev,
                          customConfig: {
                            ...prev.customConfig,
                            prefix: e.target.value,
                          },
                        }))
                      }
                    />
                    <s-text-field
                      label="Suffix"
                      value={data.customConfig.suffix}
                      helpText="Static text appended via {suffix} token"
                      onInput={(e) =>
                        setData((prev) => ({
                          ...prev,
                          customConfig: {
                            ...prev.customConfig,
                            suffix: e.target.value,
                          },
                        }))
                      }
                    />
                  </s-grid>
                  {/* Live preview using placeholder values */}
                  {data.customConfig.template && (
                    <s-box
                      background="subdued"
                      padding="small"
                      borderRadius="base"
                    >
                      <s-text tone="subdued" size="small">
                        Preview (example values):
                      </s-text>
                      <s-text>
                        {data.customConfig.template
                          .replace("{prefix}", data.customConfig.prefix || "")
                          .replace("{suffix}", data.customConfig.suffix || "")
                          .replace("{productId}", "7890123456")
                          .replace("{variantId}", "42312345678")
                          .replace("{sku}", "RED-LG")
                          .replace("{date}", "20260501")
                          .replace("{timestamp}", "20260501143022")
                          .replace("{random4}", "3847")
                          .replace("{random6}", "829471")
                          .replace("{random8}", "40192837")
                          .replace("{year}", "2026")
                          .replace("{month}", "05")
                          .replace("{day}", "01")
                          .replace("{sequence}", "0001")}
                      </s-text>
                    </s-box>
                  )}
                </s-stack>
              </s-box>
            </s-box>
          )}
        </s-section>

        {/* ── Overwrite ── */}
        <s-section>
          <s-checkbox
            name="overwriteExisting"
            checked={data.overwriteExisting}
            onChange={() =>
              setData((prev) => ({
                ...prev,
                overwriteExisting: !prev.overwriteExisting,
              }))
            }
            label="Overwrite existing Barcodes & SKUs with new ones"
          />
        </s-section>

        {/* ── Product List ── */}
        <ProductList
          onSelectVariants={handleSelectVariants}
          selectedVariantIds={selectedVariantIds}
          clearSelectedVariants={clearSelectedVariants}
          assignmentType={data.assignmentType}
          generationType={data.generationType}
          overwriteExisting={data.overwriteExisting}
          collections={collections}
          productTypes={productTypes}
          selectedVariants={selectedVariants}
          setLoading={setLoading}
          setIsLoading={setIsLoading}
          loading={loading}
          isLoading={isLoading}
          filters={filters}
          setFilters={setFilters}
          customConfig={data.customConfig}
        />

        {/* ── Bulk Generate Modal ── */}
        <s-modal
          id="generate-barcode-modal"
          heading={`Generate for ${selectedVariants.length} variant${selectedVariants.length !== 1 ? "s" : ""}`}
          accessibilityLabel="Generate barcodes modal"
        >
          <s-stack gap="base">
            <s-text>
              You are about to generate{" "}
              {data.assignmentType === "both"
                ? "barcodes and SKUs"
                : data.assignmentType === "barcode"
                  ? "barcodes"
                  : "SKUs"}{" "}
              for{" "}
              <s-text fontWeight="bold">
                {selectedVariants.length} variant
                {selectedVariants.length !== 1 ? "s" : ""}
              </s-text>
              .
            </s-text>
            <s-box background="subdued" padding="base" borderRadius="base">
              <s-stack gap="small">
                <s-text tone="subdued" size="small">
                  Strategy:{" "}
                  {data.generationType === "unique"
                    ? "Unique 18-digit encoded barcode"
                    : data.generationType === "variantId"
                      ? "Raw Shopify variant ID"
                      : `Custom template — ${data.customConfig.template || "(none)"}`}
                </s-text>
                {!data.overwriteExisting && (
                  <s-text tone="warning">
                    Variants that already have values will be skipped.
                  </s-text>
                )}
              </s-stack>
            </s-box>
          </s-stack>

          <s-button
            slot="primary-action"
            variant="primary"
            loading={loading}
            commandFor="generate-barcode-modal"
            command="--hide"
            onClick={handleGenerate}
          >
            Confirm
          </s-button>
          <s-button
            slot="secondary-actions"
            variant="secondary"
            commandFor="generate-barcode-modal"
            command="--hide"
            onClick={clearSelectedVariants}
          >
            Cancel
          </s-button>
        </s-modal>
      </s-stack>
    </s-page>
  );
}

// //app.route.generatebarcode.jsx
// import { useState, useEffect, useCallback } from "react";
// import { useLoaderData, useFetcher } from "react-router";
// import { generateBarcode, generateSku } from "../utils/barcodeGenerator";
// import ProductList from "../components/ProductList";
// import { authenticate } from "../shopify.server";
// import {
//   GET_COLLECTIONS_QUERY,
//   GET_PRODUCTTYPES_QUERY,
// } from "../Admin_Grapgql_Api/QUERIES";
// import { PRODUCT_VARIANTS_BULK_UPDATE } from "../Admin_Grapgql_Api/MUTATIONS";
// import { GET_PRODUCTS_QUERY } from "../Admin_Grapgql_Api/QUERIES";

// // ─── Loader ──────────────────────────────────────────────────────────────────
// export async function loader({ request }) {
//   const { admin } = await authenticate.admin(request);

//   const [collectionsRes, typesRes] = await Promise.all([
//     admin.graphql(GET_COLLECTIONS_QUERY),
//     admin.graphql(GET_PRODUCTTYPES_QUERY),
//   ]);

//   const collectionsJson = await collectionsRes.json();
//   const typesJson = await typesRes.json();

//   const collectionMap = Object.fromEntries(
//     collectionsJson.data.collections.nodes.map((col) => [col.id, col.title]),
//   );

//   const productTypes = typesJson.data.productTypes.edges.map(
//     ({ node }) => node,
//   );

//   return { collections: collectionMap, productTypes };
// }

// // ─── Action ───────────────────────────────────────────────────────────────────
// export async function action({ request }) {
//   const { admin } = await authenticate.admin(request);
//   const formData = await request.formData();
//   const actionType = formData.get("action");
//   const data = JSON.parse(formData.get("data"));
//   console.log(actionType);
//   // ── Fetch products ──────────────────────────────────────────────────────────
//   if (actionType === "fetch_products") {
//     const { first, after, before, query, direction } = data;
//     try {
//       const response = await admin.graphql(GET_PRODUCTS_QUERY, {
//         variables: {
//           ...(direction === "next" ? { first } : { last: first }),
//           query: query || "",
//           ...(direction === "next" ? { after } : { before }),
//         },
//       });

//       const json = await response.json();

//       const products =
//         json.data?.products?.edges?.map((product) => ({
//           id: product.node.id,
//           title: product.node.title,
//           handle: product.node.handle,
//           status: product.node.status,
//           productType: product.node.productType,
//           vendor: product.node.vendor,
//           price: product.node.priceRangeV2.minVariantPrice.amount,
//           featuredImage: product.node.media?.nodes?.[0]?.preview.image.url,
//           variants:
//             product.node.variants?.edges?.map((variant) => ({
//               id: variant.node.id,
//               productId: product.node.id,
//               title: variant.node.title,
//               sku: variant.node.sku,
//               barcode: variant.node.barcode,
//               price: variant.node.price,
//               inventoryQuantity: variant.node.inventoryQuantity,
//               featuredImage: variant.node.media?.nodes?.[0]?.preview.image.url,
//             })) || [],
//         })) || [];

//       return {
//         action: "fetch_products",
//         products,
//         pageInfo: json.data?.products?.pageInfo,
//         totalCount: json.data?.products?.edges?.length,
//       };
//     } catch (error) {
//       console.error("Error fetching products:", error);
//       return { action: "fetch_products", error: error.message };
//     }
//   }

//   // ── Generate barcodes/SKUs ──────────────────────────────────────────────────
//   if (actionType === "generate_barcode") {
//     const { assignmentType, generationType, overwriteExisting, variants } =
//       data;

//     const errors = [];
//     const results = [];

//     try {
//       // Group variant updates by productId
//       const variantsByProduct = variants.reduce((acc, variant) => {
//         const productId = variant.productId;
//         const variantIdValue = variant.id.split("/").pop();

//         // Skip if already has value and overwrite is disabled
//         if (!overwriteExisting) {
//           const hasBarcode = !!variant.barcode;
//           const hasSku = !!variant.sku;
//           if (assignmentType === "barcode" && hasBarcode) return acc;
//           if (assignmentType === "sku" && hasSku) return acc;
//           if (assignmentType === "both" && hasBarcode && hasSku) return acc;
//         }

//         const variantUpdate = { id: variant.id };

//         if (assignmentType === "barcode" || assignmentType === "both") {
//           if (!variant.barcode || overwriteExisting) {
//             switch (generationType) {
//               case "unique":
//                 variantUpdate.barcode = generateBarcode(variantIdValue);
//                 break;
//               case "variantId":
//                 variantUpdate.barcode = variantIdValue;
//                 break;
//               case "custom":
//                 variantUpdate.barcode = generateBarcode(variantIdValue);
//                 break;
//               default:
//                 variantUpdate.barcode = generateBarcode(variantIdValue);
//             }
//           }
//         }

//         if (assignmentType === "sku" || assignmentType === "both") {
//           if (!variant.sku || overwriteExisting) {
//             switch (generationType) {
//               case "unique":
//                 variantUpdate.sku = generateSku(variant);
//                 break;
//               case "variantId":
//                 variantUpdate.sku = variantIdValue;
//                 break;
//               case "custom":
//                 variantUpdate.sku = generateSku(variant);
//                 break;
//               default:
//                 variantUpdate.sku = generateSku(variant);
//             }
//           }
//         }

//         if (!acc[productId]) acc[productId] = [];
//         acc[productId].push(variantUpdate);
//         return acc;
//       }, {});
//       console.log("variantsByProduct", variantsByProduct);
//       // Bulk update each product's variants
//       for (const [productId, variantUpdates] of Object.entries(
//         variantsByProduct,
//       )) {
//         if (!variantUpdates.length) continue;

//         try {
//           const response = await admin.graphql(PRODUCT_VARIANTS_BULK_UPDATE, {
//             variables: { productId, variants: variantUpdates },
//           });
//           const result = await response.json();

//           const userErrors =
//             result.data?.productVariantsBulkUpdate?.userErrors || [];
//           userErrors.forEach((err) =>
//             errors.push({ productId, error: err.message, field: err.field }),
//           );

//           const updatedVariants =
//             result.data?.productVariantsBulkUpdate?.productVariants || [];
//           updatedVariants.forEach((v) =>
//             results.push({ ...v, generationType, assignmentType }),
//           );
//         } catch (error) {
//           console.error("Bulk update error for product:", productId, error);
//           errors.push({ productId, error: error.message });
//         }
//       }
//       console.log("results", results);
//       return {
//         action: "generate_barcode",
//         status: true,
//         results,
//         errors,
//         totalProcessed: variants.length,
//         successful: results.length,
//         failed: errors.length,
//         generationType,
//         assignmentType,
//       };
//     } catch (error) {
//       console.error("Generation error:", error);
//       return {
//         action: "generate_barcode",
//         status: false,
//         error: error.message,
//         results: [],
//         errors: [{ error: error.message }],
//         totalProcessed: variants?.length || 0,
//         successful: 0,
//         failed: variants?.length || 0,
//       };
//     }
//   }

//   return { error: "Invalid action" };
// }

// // ─── Page Component ───────────────────────────────────────────────────────────
// export default function GenerateBarcodePage() {
//   const fetcher = useFetcher();
//   const { collections, productTypes } = useLoaderData();
//   const [loading, setLoading] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [data, setData] = useState({
//     assignmentType: "",
//     generationType: "",
//     overwriteExisting: false,
//   });

//   const [selectedVariants, setSelectedVariants] = useState([]);
//   const [selectedVariantIds, setSelectedVariantIds] = useState(new Set());
//   const [filters, setFilters] = useState({
//     search: "",
//     status: [],
//     vendor: [],
//     collection: [],
//     type: "",
//     cursor: null,
//     direction: "next",
//   });
//   console.log("data", data);
//   // Lifted generation modal state (triggered from ProductList or here)
//   const [generationModal, setGenerationModal] = useState({
//     open: false,
//     variants: [],
//     count: 0,
//   });

//   useEffect(() => {
//     console.log("fetcherfetcher", fetcher);
//     if (
//       fetcher.state === "idle" &&
//       fetcher.data?.action === "generate_barcode"
//     ) {
//       if (fetcher.data.status) {
//         setGenerationModal({ open: false, variants: [], count: 0 });
//         clearSelectedVariants();
//         setFilters({
//           search: "",
//           status: [],
//           vendor: [],
//           collection: [],
//           type: "",
//           cursor: null,
//           direction: "next",
//         });
//         setData({
//           assignmentType: "",
//           generationType: "",
//           overwriteExisting: false,
//         });
//         window.location.reload();
//       }
//     }
//   }, [fetcher.state, fetcher.data]);
//   // Callback to open the modal with specific variants (from ProductList)

//   const handleSelectVariants = useCallback((variants, action) => {
//     if (action === "add") {
//       setSelectedVariants((prev) => {
//         const existingIds = new Set(prev.map((v) => v.id));
//         const newOnes = variants.filter((v) => !existingIds.has(v.id));
//         return [...prev, ...newOnes];
//       });
//       setSelectedVariantIds((prev) => {
//         const next = new Set(prev);
//         variants.forEach((v) => next.add(v.id));
//         return next;
//       });
//     } else {
//       const removeIds = new Set(variants.map((v) => v.id));
//       setSelectedVariants((prev) => prev.filter((v) => !removeIds.has(v.id)));
//       setSelectedVariantIds((prev) => {
//         const next = new Set(prev);
//         removeIds.forEach((id) => next.delete(id));
//         return next;
//       });
//     }
//   }, []);

//   const clearSelectedVariants = useCallback(() => {
//     setSelectedVariants([]);
//     setSelectedVariantIds(new Set());
//     setLoading(false);
//   }, []);

//   return (
//     <s-page heading="Assign barcodes &amp; SKUs">
//       <s-link slot="breadcrumb-actions" href="/app">
//         pos-app-new
//       </s-link>
//       <s-stack gap="base" padding="base">
//         <s-stack>
//           <s-text tone="subdued">
//             Generate and assign unique identifiers to your product variants
//           </s-text>
//         </s-stack>

//         {/* ── Assign type ── */}
//         <s-section>
//           <s-heading>Assign</s-heading>
//           <s-choice-list
//             label="Assign"
//             labelAccessibilityVisibility="exclusive"
//             name="assignmentType"
//             values={[data.assignmentType]}
//             onChange={(e) => {
//               const value = e.currentTarget.values[0];

//               setData((prev) => ({
//                 ...prev,
//                 assignmentType: value,
//               }));
//             }}
//           >
//             <s-choice value="barcode">
//               Barcode
//               <s-text slot="details">
//                 Assigns the generated code to the barcode property in Shopify
//               </s-text>
//             </s-choice>
//             <s-choice value="sku">
//               SKU (Stock keeping unit)
//               <s-text slot="details">
//                 Assigns the generated code to the SKU property in Shopify
//               </s-text>
//             </s-choice>
//             <s-choice value="both">
//               Barcodes &amp; SKUs
//               <s-text slot="details">
//                 Assigns both a barcode &amp; SKU at the same time
//               </s-text>
//             </s-choice>
//           </s-choice-list>

//           <s-banner tone="warning">
//             <s-text>
//               {data?.assignmentType === "sku"
//                 ? "Please select the Barcode property if you are using Shopify POS"
//                 : "Barcodes and SKUs generated by App are for internal use only and are not equivalent to EAN's, ISBN, GTINs, or UPCs."}
//             </s-text>
//           </s-banner>
//         </s-section>

//         {/* ── Generation type ── */}
//         <s-section>
//           <s-heading>Generate</s-heading>
//           <s-choice-list
//             label="generation Type"
//             labelAccessibilityVisibility="exclusive"
//             name="generationType"
//             values={[data?.generationType]}
//             onChange={(e) => {
//               const value = e.currentTarget.values[0];

//               setData((prev) => ({
//                 ...prev,
//                 generationType: value,
//               }));
//             }}

//           >
//             <s-choice value="unique">
//               A uniquely generated number
//               <s-text slot="details">
//                 App generates a unique 14 digit number for each Product variant
//               </s-text>
//             </s-choice>
//             <s-choice value="variantId">
//               The Shopify variant ID
//               <s-text slot="details">
//                 The Product variant ID created by Shopify
//               </s-text>
//             </s-choice>
//             <s-choice value="custom">
//               Custom Barcode
//               <s-text slot="details">
//                 Assign custom Barcodes to identify the product
//               </s-text>
//             </s-choice>
//           </s-choice-list>
//         </s-section>

//         {/* ── Overwrite ── */}
//         <s-section>
//           <s-checkbox
//             name="overwriteExisting"
//             checked={data?.overwriteExisting}
//             onChange={(e) =>
//               setData((prev) => {
//                 return { ...prev, overwriteExisting: !prev?.overwriteExisting };
//               })
//             }
//             label="Overwrite existing Barcodes & SKUs with new ones"
//           />
//         </s-section>

//         {/* ── Product List ── */}
//         <ProductList
//           onSelectVariants={handleSelectVariants}
//           selectedVariantIds={selectedVariantIds}
//           clearSelectedVariants={clearSelectedVariants}
//           assignmentType={data?.assignmentType}
//           generationType={data?.generationType}
//           overwriteExisting={data?.overwriteExisting}
//           collections={collections}
//           productTypes={productTypes}
//           selectedVariants={selectedVariants}
//           setLoading={setLoading}
//           setIsLoading={setIsLoading}
//           loading={loading}
//           isLoading={isLoading}
//           filters={filters}
//           setFilters={setFilters}
//         />

//         {/* ── Bulk Generate Modal ── */}
//         <s-modal
//           id="generate-barcode-modal"
//           heading={`Generate for ${selectedVariants.length} variant${selectedVariants.length !== 1 ? "s" : ""}`}
//           onHide={() =>
//             setGenerationModal({ open: false, variants: [], count: 0 })
//           }
//           accessibilityLabel="Modal"
//         >
//           <s-stack gap="medium-200">
//             <s-text>
//               You are about to generate{" "}
//               {data?.assignmentType === "both"
//                 ? "barcodes and SKUs"
//                 : data?.assignmentType === "barcode"
//                   ? "barcodes"
//                   : "SKUs"}{" "}
//               for{" "}
//               <s-text fontWeight="bold">
//                 {selectedVariants.length} variant
//                 {selectedVariantIds.length !== 1 ? "s" : ""}
//               </s-text>
//               .
//             </s-text>
//             <s-box background="surface" padding="300" borderRadius="200">
//               <s-stack>
//                 <s-text tone="subdued" size="small">
//                   Generation type:{" "}
//                   {data?.generationType === "unique"
//                     ? "Unique 14-digit number"
//                     : data?.generationType === "variantId"
//                       ? "Shopify variant ID"
//                       : "Custom value"}
//                 </s-text>
//                 {!data?.overwriteExisting && (
//                   <s-text tone="warning">
//                     Variants that already have values will be skipped
//                   </s-text>
//                 )}
//               </s-stack>
//             </s-box>
//           </s-stack>

//           <s-button
//             slot="primary-action"
//             variant="primary"
//             loading={loading}
//             commandFor="generate-barcode-modal"
//             command="--hide"
//             onClick={() => {
//               setLoading(true);
//               if (!selectedVariants.length) return;
//               const formData = new FormData();
//               formData.append("action", "generate_barcode");
//               formData.append(
//                 "data",
//                 JSON.stringify({
//                   ...data,
//                   variants: selectedVariants,
//                 }),
//               );
//               fetcher.submit(formData, { method: "post" });
//             }}
//           >
//             Confirm
//           </s-button>
//           <s-button
//             slot="secondary-actions"
//             variant="secondary"
//             commandFor="generate-barcode-modal"
//             command="--hide"
//             onClick={() => clearSelectedVariants()}
//           >
//             Cancel
//           </s-button>
//         </s-modal>
//       </s-stack>
//     </s-page>
//   );
// }

// function ModalConfirmButton({
//   selectedVariants,
//   assignmentType,
//   generationType,
//   overwriteExisting,
//   onSuccess,
// }) {
//   const fetcher = useFetcher();
//   const isSubmitting =
//     fetcher.state === "submitting" || fetcher.state === "loading";

//   useEffect(() => {
//     if (
//       fetcher.state === "idle" &&
//       fetcher.data?.action === "generate_barcode"
//     ) {
//       if (fetcher.data.status) {
//         onSuccess?.();
//       }
//     }
//   }, [fetcher.state, fetcher.data]);

//   return (
//     <s-button
//       slot="primary-action"
//       variant="primary"
//       loading={isSubmitting}
//       commandFor="generate-barcode-modal"
//       command="--hide"
//       onClick={() => {
//         if (!selectedVariants.length) return;
//         const formData = new FormData();
//         formData.append("action", "generate_barcode");
//         formData.append(
//           "data",
//           JSON.stringify({
//             ...data,
//             variants: selectedVariants,
//           }),
//         );
//         fetcher.submit(formData, { method: "post" });
//       }}
//     >
//       Confirm
//     </s-button>
//   );
// }
