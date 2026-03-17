//app.route.generatebarcode.jsx
// app.route.generatebarcode.jsx
import { useState, useEffect, useCallback } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { generateBarcode, generateSku } from "../utils/barcodeGenerator";
import ProductList from "../components/ProductList";
import { authenticate } from "../shopify.server";
import {
  GET_COLLECTIONS_QUERY,
  GET_PRODUCTTYPES_QUERY,
} from "../Admin_Grapgql_Api/QUERIES";
import { PRODUCT_VARIANTS_BULK_UPDATE } from "../Admin_Grapgql_Api/MUTATIONS";
import { GET_PRODUCTS_QUERY } from "../Admin_Grapgql_Api/QUERIES";

// ─── Loader ──────────────────────────────────────────────────────────────────
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
  console.log(actionType);
  // ── Fetch products ──────────────────────────────────────────────────────────
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

  // ── Generate barcodes/SKUs ──────────────────────────────────────────────────
  if (actionType === "generate_barcode") {
    const { assignmentType, generationType, overwriteExisting, variants } =
      data;

    const errors = [];
    const results = [];

    try {
      // Group variant updates by productId
      const variantsByProduct = variants.reduce((acc, variant) => {
        const productId = variant.productId;
        const variantIdValue = variant.id.split("/").pop();

        // Skip if already has value and overwrite is disabled
        if (!overwriteExisting) {
          const hasBarcode = !!variant.barcode;
          const hasSku = !!variant.sku;
          if (assignmentType === "barcode" && hasBarcode) return acc;
          if (assignmentType === "sku" && hasSku) return acc;
          if (assignmentType === "both" && hasBarcode && hasSku) return acc;
        }

        const variantUpdate = { id: variant.id };

        if (assignmentType === "barcode" || assignmentType === "both") {
          if (!variant.barcode || overwriteExisting) {
            switch (generationType) {
              case "unique":
                variantUpdate.barcode = generateBarcode(variantIdValue);
                break;
              case "variantId":
                variantUpdate.barcode = variantIdValue;
                break;
              case "custom":
                variantUpdate.barcode = generateBarcode(variantIdValue);
                break;
              default:
                variantUpdate.barcode = generateBarcode(variantIdValue);
            }
          }
        }

        if (assignmentType === "sku" || assignmentType === "both") {
          if (!variant.sku || overwriteExisting) {
            switch (generationType) {
              case "unique":
                variantUpdate.sku = generateSku(variant);
                break;
              case "variantId":
                variantUpdate.sku = variantIdValue;
                break;
              case "custom":
                variantUpdate.sku = generateSku(variant);
                break;
              default:
                variantUpdate.sku = generateSku(variant);
            }
          }
        }

        if (!acc[productId]) acc[productId] = [];
        acc[productId].push(variantUpdate);
        return acc;
      }, {});
      console.log("variantsByProduct", variantsByProduct);
      // Bulk update each product's variants
      for (const [productId, variantUpdates] of Object.entries(
        variantsByProduct,
      )) {
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

          const updatedVariants =
            result.data?.productVariantsBulkUpdate?.productVariants || [];
          updatedVariants.forEach((v) =>
            results.push({ ...v, generationType, assignmentType }),
          );
        } catch (error) {
          console.error("Bulk update error for product:", productId, error);
          errors.push({ productId, error: error.message });
        }
      }
      console.log("results", results);
      return {
        action: "generate_barcode",
        status: true,
        results,
        errors,
        totalProcessed: variants.length,
        successful: results.length,
        failed: errors.length,
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
    assignmentType: "barcode",
    generationType: "unique",
    overwriteExisting: false,
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
  console.log("data", data);
  // Lifted generation modal state (triggered from ProductList or here)
  const [generationModal, setGenerationModal] = useState({
    open: false,
    variants: [],
    count: 0,
  });

  useEffect(() => {
    console.log("fetcherfetcher", fetcher);
    if (
      fetcher.state === "idle" &&
      fetcher.data?.action === "generate_barcode"
    ) {
      if (fetcher.data.status) {
        setGenerationModal({ open: false, variants: [], count: 0 });
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
          assignmentType: "barcode",
          generationType: "unique",
          overwriteExisting: false,
        });
        window.location.reload();
      }
    }
  }, [fetcher.state, fetcher.data]);
  // Callback to open the modal with specific variants (from ProductList)

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
    <s-page heading="Assign barcodes &amp; SKUs">
      <s-link slot="breadcrumb-actions" href="/app">
        pos-app-new
      </s-link>
      <s-stack gap="base" padding="base">
        <s-stack>
          <s-text tone="subdued">
            Generate and assign unique identifiers to your product variants
          </s-text>
        </s-stack>

        {/* ── Assign type ── */}
        <s-section>
          <s-heading>Assign</s-heading>
          <s-choice-list
            label="Assign"
            labelAccessibilityVisibility="exclusive"
            name="assignmentType"
            values={[data.assignmentType]}
            onChange={(e) => {
              const value = e.currentTarget.values[0];

              setData((prev) => ({
                ...prev,
                assignmentType: value,
              }));
            }}
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
              {data?.assignmentType === "sku"
                ? "Please select the Barcode property if you are using Shopify POS"
                : "Barcodes and SKUs generated by App are for internal use only and are not equivalent to EAN's, ISBN, GTINs, or UPCs."}
            </s-text>
          </s-banner>
        </s-section>

        {/* ── Generation type ── */}
        <s-section>
          <s-heading>Generate</s-heading>
          <s-choice-list
            label="generation Type"
            labelAccessibilityVisibility="exclusive"
            name="generationType"
            values={[data?.generationType]}
            onChange={(e) => {
              const value = e.currentTarget.values[0];

              setData((prev) => ({
                ...prev,
                generationType: value,
              }));
            }}
           
          >
            <s-choice value="unique">
              A uniquely generated number
              <s-text slot="details">
                App generates a unique 14 digit number for each Product variant
              </s-text>
            </s-choice>
            <s-choice value="variantId">
              The Shopify variant ID
              <s-text slot="details">
                The Product variant ID created by Shopify
              </s-text>
            </s-choice>
            <s-choice value="custom">
              Custom Barcode
              <s-text slot="details">
                Assign custom Barcodes to identify the product
              </s-text>
            </s-choice>
          </s-choice-list>
        </s-section>

        {/* ── Overwrite ── */}
        <s-section>
          <s-checkbox
            name="overwriteExisting"
            checked={data?.overwriteExisting}
            onChange={(e) =>
              setData((prev) => {
                return { ...prev, overwriteExisting: !prev?.overwriteExisting };
              })
            }
            label="Overwrite existing Barcodes & SKUs with new ones"
          />
        </s-section>

        {/* ── Product List ── */}
        <ProductList
          onSelectVariants={handleSelectVariants}
          selectedVariantIds={selectedVariantIds}
          clearSelectedVariants={clearSelectedVariants}
          assignmentType={data?.assignmentType}
          generationType={data?.generationType}
          overwriteExisting={data?.overwriteExisting}
          collections={collections}
          productTypes={productTypes}
          selectedVariants={selectedVariants}
          setLoading={setLoading}
          setIsLoading={setIsLoading}
          loading={loading}
          isLoading={isLoading}
          filters={filters}
          setFilters={setFilters}
        />

        {/* ── Bulk Generate Modal ── */}
        <s-modal
          id="generate-barcode-modal"
          heading={`Generate for ${selectedVariants.length} variant${selectedVariants.length !== 1 ? "s" : ""}`}
          onHide={() =>
            setGenerationModal({ open: false, variants: [], count: 0 })
          }
          accessibilityLabel="Modal"
        >
          <s-stack gap="medium-200">
            <s-text>
              You are about to generate{" "}
              {data?.assignmentType === "both"
                ? "barcodes and SKUs"
                : data?.assignmentType === "barcode"
                  ? "barcodes"
                  : "SKUs"}{" "}
              for{" "}
              <s-text fontWeight="bold">
                {selectedVariants.length} variant
                {selectedVariantIds.length !== 1 ? "s" : ""}
              </s-text>
              .
            </s-text>
            <s-box background="surface" padding="300" borderRadius="200">
              <s-stack>
                <s-text tone="subdued" size="small">
                  Generation type:{" "}
                  {data?.generationType === "unique"
                    ? "Unique 14-digit number"
                    : data?.generationType === "variantId"
                      ? "Shopify variant ID"
                      : "Custom value"}
                </s-text>
                {!data?.overwriteExisting && (
                  <s-text tone="warning">
                    Variants that already have values will be skipped
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
            onClick={() => {
              setLoading(true);
              if (!selectedVariants.length) return;
              const formData = new FormData();
              formData.append("action", "generate_barcode");
              formData.append(
                "data",
                JSON.stringify({
                  ...data,
                  variants: selectedVariants,
                }),
              );
              fetcher.submit(formData, { method: "post" });
            }}
          >
            Confirm
          </s-button>
          <s-button
            slot="secondary-actions"
            variant="secondary"
            commandFor="generate-barcode-modal"
            command="--hide"
            onClick={() => clearSelectedVariants()}
          >
            Cancel
          </s-button>
        </s-modal>
      </s-stack>
    </s-page>
  );
}

/**
 * Separate component so the modal's fetcher is isolated and doesn't
 * interfere with ProductList's fetcher.
 */
function ModalConfirmButton({
  selectedVariants,
  assignmentType,
  generationType,
  overwriteExisting,
  onSuccess,
}) {
  const fetcher = useFetcher();
  const isSubmitting =
    fetcher.state === "submitting" || fetcher.state === "loading";

  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data?.action === "generate_barcode"
    ) {
      if (fetcher.data.status) {
        onSuccess?.();
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <s-button
      slot="primary-action"
      variant="primary"
      loading={isSubmitting}
      commandFor="generate-barcode-modal"
      command="--hide"
      onClick={() => {
        if (!selectedVariants.length) return;
        const formData = new FormData();
        formData.append("action", "generate_barcode");
        formData.append(
          "data",
          JSON.stringify({
            ...data,
            variants: selectedVariants,
          }),
        );
        fetcher.submit(formData, { method: "post" });
      }}
    >
      Confirm
    </s-button>
  );
}

// backend/routes/barcodeRoutes.js

// import express from 'express';
// import Shopify from 'shopify-api-node';
// import { generateBarcode, generateBulkBarcodes } from '../utils/barcodeGenerator.js';

// const router = express.Router();

// // Generate barcode for a single variant
// router.post('/api/barcode/generate', async (req, res) => {
//   try {
//     const { variantId } = req.body;

//     if (!variantId) {
//       return res.status(400).json({ error: 'Variant ID is required' });
//     }

//     // Initialize Shopify
//     const shopify = new Shopify({
//       shopName: process.env.SHOPIFY_STORE,
//       accessToken: process.env.SHOPIFY_ACCESS_TOKEN
//     });

//     // Get variant details
//     const variant = await shopify.productVariant.get(variantId);

//     // Generate barcode
//     const barcode = generateBarcode(variantId);

//     // Update variant with barcode
//     await shopify.productVariant.update(variantId, {
//       barcode: barcode
//     });

//     res.json({
//       success: true,
//       variant: {
//         id: variant.id,
//         title: variant.title,
//         sku: variant.sku
//       },
//       barcode: barcode
//     });

//   } catch (error) {
//     console.error('Error generating barcode:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Generate barcodes for multiple variants
// router.post('/api/barcode/generate-bulk', async (req, res) => {
//   try {
//     const { variantIds } = req.body;

//     if (!variantIds || !variantIds.length) {
//       return res.status(400).json({ error: 'Variant IDs are required' });
//     }

//     const shopify = new Shopify({
//       shopName: process.env.SHOPIFY_STORE,
//       accessToken: process.env.SHOPIFY_ACCESS_TOKEN
//     });

//     const results = [];

//     for (const variantId of variantIds) {
//       const barcode = generateBarcode(variantId);

//       await shopify.productVariant.update(variantId, {
//         barcode: barcode
//       });

//       results.push({
//         variantId,
//         barcode
//       });
//     }

//     res.json({
//       success: true,
//       count: results.length,
//       barcodes: results
//     });

//   } catch (error) {
//     console.error('Error generating bulk barcodes:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Generate barcode for all variants of a product
// router.post('/api/barcode/generate-for-product/:productId', async (req, res) => {
//   try {
//     const { productId } = req.params;

//     const shopify = new Shopify({
//       shopName: process.env.SHOPIFY_STORE,
//       accessToken: process.env.SHOPIFY_ACCESS_TOKEN
//     });

//     // Get product with variants
//     const product = await shopify.product.get(productId);

//     const results = [];

//     for (const variant of product.variants) {
//       // Only generate if variant doesn't have a barcode
//       if (!variant.barcode) {
//         const barcode = generateBarcode(variant.id);

//         await shopify.productVariant.update(variant.id, {
//           barcode: barcode
//         });

//         results.push({
//           variantId: variant.id,
//           title: variant.title,
//           barcode
//         });
//       }
//     }

//     res.json({
//       success: true,
//       product: {
//         id: product.id,
//         title: product.title
//       },
//       generated: results.length,
//       barcodes: results
//     });

//   } catch (error) {
//     console.error('Error generating product barcodes:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// export default router;

// // In your component
// const [previewModal, setPreviewModal] = useState({ open: false, variants: [] });

// // Handle generate with preview
// const handleGenerate = async () => {
//   if (!selectedRows?.size) {

//     shopify.toast.show("No variants selected");
//   }
//   // const selectedVariantsList = selectedVariants.filter(v => selectedRows.has(v.variantId));

//   // Check what will be updated
//   const stats = {
//     total: selectedVariants.length,
//     willUpdate: 0,
//     skipped: 0
//   };

//   selectedVariants.forEach(v => {
//     const hasValue = assignmentType === "both"
//       ? (v.barcode && v.sku)
//       : v[assignmentType];

//     if (hasValue && !overwriteExisting) {
//       stats.skipped++;
//     } else {
//       stats.willUpdate++;
//     }
//   });

//   if (stats.willUpdate === 0) {

//     shopify.toast.show("Nothing to update");
//   }

//   if (stats.skipped > 0) {
//     setPreviewModal({
//       open: true,
//       variants: selectedVariants,
//       stats
//     });
//   } else {
//     // Direct submit
//     submitGeneration(selectedVariants);
//   }
// };

// // Submit function
// const submitGeneration = (variantsToUpdate) => {
//   const formData = new FormData();
//   formData.append("action", "generate_barcode");
//   formData.append(
//     "data",
//     JSON.stringify({
//       assignmentType,
//       generationType,
//       overwriteExisting,
//       variants: variantsToUpdate,
//     }),
//   );

//   fetcher.submit(formData, { method: "post" });
//   shopify.toast.show(`⏳ Generating ${variantsToUpdate.length} ${assignmentType}...`);
// };

// // Preview Modal
// const PreviewModal = () => (
//   <s-modal
//     open={previewModal.open}
//     onClose={() => setPreviewModal({ open: false, variants: [] })}
//     title="Confirm Generation"
//   >
//     <s-modal-section>
//       <s-stack gap="medium-200">
//         <s-banner tone="warning">
//           <s-stack gap="small-200">
//             <s-text fontWeight="bold">Generation Summary:</s-text>
//             <s-text>✅ Will update: {previewModal.stats?.willUpdate}</s-text>
//             <s-text>⏭️ Will skip: {previewModal.stats?.skipped}</s-text>
//           </s-stack>
//         </s-banner>

//         <s-text>Skipped variants (already have values):</s-text>
//         <s-box maxHeight="200px" overflow="auto">
//           {previewModal.variants
//             ?.filter(v => assignmentType === "both"
//               ? (v.barcode && v.sku)
//               : v[assignmentType])
//             .slice(0, 5)
//             .map(v => (
//               <s-flex key={v.variantId} gap="small-200" padding="100">
//                 <s-icon name="info" />
//                 <s-text size="small">
//                   {v.productTitle} - {v.title}
//                   {assignmentType === "both"
//                     ? ` (Barcode: ${v.barcode || 'none'}, SKU: ${v.sku || 'none'})`
//                     : ` (${assignmentType}: ${v[assignmentType] || 'none'})`
//                   }
//                 </s-text>
//               </s-flex>
//             ))}
//         </s-box>

//         <s-flex gap="small-200" justifyContent="end">
//           <s-button
//             variant="secondary"
//             onClick={() => setPreviewModal({ open: false, variants: [] })}
//           >
//             Cancel
//           </s-button>
//           <s-button
//             variant="primary"
//             onClick={() => {
//               setPreviewModal({ open: false, variants: [] });
//               submitGeneration(previewModal.variants);
//             }}
//           >
//             Continue with {previewModal.stats?.willUpdate} updates
//           </s-button>
//         </s-flex>
//       </s-stack>
//     </s-modal-section>
//   </s-modal>
// );
