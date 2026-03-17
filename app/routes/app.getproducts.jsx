import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useSubmit } from "react-router";

import ProductList from "../components/ProductList";
import { authenticate } from "../shopify.server";
// Loader - Fetch initial data
export async function loader({ request }) {
  return true;
}

// Action - Handle barcode generation
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const data = JSON.parse(formData.get("data"));

  // Handle product fetching
  if (action === "fetch_products") {
    console.log("action==> fetch_products");
    console.log(data);
    const { first, after, before, query } = data;
    console.log(first, query);
    try {
      const response = await admin.graphql(
        `#graphql
        query GetProducts($first: Int, $query: String,
        # $after: String, $before: String,  
        # $sortKey: ProductSortKeys!, $reverse: Boolean!
        ) {
          products(first: $first, query: $query,
          # after: $after, before: $before,  
          # sortKey: $sortKey, reverse: $reverse
          ) {
            edges {
              node {
                id
                title
                handle
                status
                productType
                vendor
                priceRangeV2 {
                    minVariantPrice {
                      currencyCode
                       amount
                          }
                }
                media(first: 1) {
          nodes {
            preview {
              image {
                url
              }
            }
          }
        }
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      sku
                      barcode
                      price
                      inventoryQuantity
                    }
                  }
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            
          }
        }`,
        {
          variables: {
            first: first || 50,
            // after: after,
            // before: before,
            query: query || "",
            // sortKey,
            // reverse,
          },
        },
      );

      const json = await response.json();
      console.log(
        "json.data?.products",
        json.data?.products?.edges?.length,
        json.data?.products?.edges[0]?.node?.media.nodes,
      );
      // Transform the data to a cleaner format
      const products =
        json.data?.products?.edges?.map((edge) => ({
          id: edge.node.id,
          title: edge.node.title,
          handle: edge.node.handle,
          status: edge.node.status,
          productType: edge.node.productType,
          vendor: edge.node.vendor,
          price: edge.node.priceRangeV2.minVariantPrice.amount,
          featuredImage: edge.node.media?.nodes?.[0]?.preview.image.url,
          variants:
            edge.node.variants?.edges?.map((v) => ({
              id: v.node.id,
              title: v.node.title,
              sku: v.node.sku,
              barcode: v.node.barcode,
              price: v.node.price,
              inventoryQuantity: v.node.inventoryQuantity,
            })) || [],
        })) || [];

      return {
        products,
        pageInfo: json.data?.products?.pageInfo,
        totalCount: json.data?.products?.edges?.length,
      };
    } catch (error) {
      console.error("Error fetching products:", error);
      return { error: error.message };
    }
  }


  return { error: "Invalid action" };
}

export default function GetProducts({
  selectedVariantIds = new Set(),
  initialFilters = {},
  assignmentType,
  generationType,
  overwriteExisting,
}) {
  const fetcher = useFetcher();
  const loaderData = useLoaderData();
  const [isLoading, setisLoading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [products, setProducts] = useState([]);
  console.log("products===>:", products);
  // console.log("selectedVariants:", selectedVariants);

  // Handle variant selection from ProductList
  const handleSelectVariants = (variants, action) => {
    if (action === "add") {
      // Add new variants
      setSelectedVariants((prev) => {
        const newVariants = [...prev];
        variants.forEach((variant) => {
          if (!newVariants.some((v) => v.variantId === variant.variantId)) {
            newVariants.push(variant);
          }
        });
        return newVariants;
      });

      setSelectedVariantIds((prev) => {
        const newSet = new Set(prev);
        variants.forEach((v) => newSet.add(v.variantId));
        return newSet;
      });
    } else {
      // Remove variants
      setSelectedVariants((prev) =>
        prev.filter((v) => !variants.some((r) => r.variantId === v.variantId)),
      );

      setSelectedVariantIds((prev) => {
        const newSet = new Set(prev);
        variants.forEach((v) => newSet.delete(v.variantId));
        return newSet;
      });
    }
  };

  useEffect(() => {
    
    if (fetcher.state === "submitting") {
      console.log("🚀 Form submitting...");
    } else if (fetcher.state === "loading") {
      console.log("⏳ Loading response...");
    } else if (fetcher.state === "idle" && fetcher?.data?.products) {
      console.log("✅ fetcher.data:", fetcher?.data);

      const { products } = fetcher?.data;
      if (!products?.length) return;
      setProducts(products);
    }
  }, [fetcher.state, fetcher.data]);

  // Filter variants based on barcode status
  const getFilteredProducts = () => {
    let filtered = [...selectedVariants];

    if (filterType === "withBarcode") {
      filtered = filtered.filter((v) => v.barcode);
    } else if (filterType === "withoutBarcode") {
      filtered = filtered.filter((v) => !v.barcode);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.title.toLowerCase().includes(query) ||
          v.productTitle.toLowerCase().includes(query) ||
          (v.sku && v.sku.toLowerCase().includes(query)) ||
          (v.barcode && v.barcode.toLowerCase().includes(query)),
      );
    }

    return filtered;
  };
  return (
    <s-section heading="Select Products">
      <ProductList
        onSelectVariants={handleSelectVariants}
        selectedVariantIds={selectedVariantIds}
        initialFilters={{
          search: "",
          status: "",
          productType: "",
          vendor: "",
          sortBy: "TITLE",
          sortOrder: "asc",
        }}
        assignmentType={assignmentType}
        generationType={generationType}
        overwriteExisting={overwriteExisting}
        filterType={filterType}
        setFilterType={setFilterType}
        products={products}
        setProducts={setProducts}
      />
    </s-section>
  );
}
