import { sessionModel } from "../../db.schema";
import { unauthenticated } from "../../shopify.server";
const corsJsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const loader = async ({ request ,params }) => {
//   console.log("loader=========>", request);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");
  console.log("loader=========>searchParams", searchParams);
  console.log("loader=========>params", params);

  if (!shop) {
    return new Response(JSON.stringify({ error: "Missing shop" }), {
      status: 400,
      headers: corsJsonHeaders,
    });
  }

  const credential = await sessionModel.findOne({ shop }, { _id: 1 });
  if (!credential) {
    return new Response(JSON.stringify({ error: "Shop Not verified!!" }), {
      status: 401,
      headers: corsJsonHeaders,
    });
  }
  const { admin } = await unauthenticated.admin(shop);
   return null;
};

export const action = async ({ request,params }) => {
  // console.log("ACTION, request", request);
  console.log("ACTION, method", request.method);
  console.log("request.url", request.url);
  if (request.method === "OPTIONS")
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");
  console.log("ACTION===>searchParams", searchParams);
  console.log("ACTION===>params", params);

    if (!shop) {
      return new Response(JSON.stringify({ error: "Missing shop" }), {
        status: 400,
        headers: corsJsonHeaders,
      });
    }
  
    const credential = await sessionModel.findOne({ shop }, { _id: 1 });
    if (!credential) {
      return new Response(
        JSON.stringify({ error: "Storefront credentials not verified" }),
        {
          status: 401,
          headers: corsJsonHeaders,
        },
      );
    }
    console.log("credential==>", credential);

  const requestData = await request.json();
  const { shopId,locationId,barcode} = requestData;
  console.log("requestData==>", requestData);

  const { admin } = await unauthenticated.admin(shop);
  // GraphQL query
  const query = `
    query productVariantByCode {
      productVariant(id: "gid://shopify/ProductVariant/${barcode}") {
        id
        title
        price
        sku
        barcode
        media(first: 1) {
          nodes {
            preview {
              image {
                url
              }
            }
          }
        }
        compareAtPrice
        createdAt
        availableForSale
        displayName
        updatedAt
        
        showUnitPrice
        sellableOnlineQuantity
        
        sellingPlanGroupsCount {
          count
          precision
        }
        taxable
        
        requiresComponents
        inventoryQuantity
        inventoryPolicy
        legacyResourceId
        inventoryItem {
          sku
          tracked
          updatedAt
          id
          countryCodeOfOrigin
          createdAt
          requiresShipping
        }
        product {
          id
          title
          media(first: 1) {
            nodes {
              preview {
                image {
                  url
                }
              }
            }
          }
          descriptionHtml
        }
      }
    }
  `;
  try {
    const response = await admin.graphql(query);
    const data = await response.json();

    // GraphQL-level errors
    if (data.errors && data.errors.length) {
      console.error("GraphQL errors:", data.errors);
      return new Response(JSON.stringify({ error: "Shopify query failed" }), {
        status: 502,
        headers: corsJsonHeaders,
      });
    }

    const matchedVariant = data?.data?.productVariant;
    
    
    if (!matchedVariant) {
      return new Response(JSON.stringify({ verified: false ,barcode }), {
        status: 200,
        headers: corsJsonHeaders,
      });
    }
    console.error("matchedVariant:", matchedVariant.id);
    return new Response(
      JSON.stringify({
        verified: true,
        productVariant: {...matchedVariant
        },
      }),
      {
        status: 200,
        headers: corsJsonHeaders,
      },
    );
  } catch (error) {
    console.error("Variant verification failed:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: corsJsonHeaders,
      },
    );
  }
};
