import { settingsModel } from "../db.schema";
const corsJsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const shop = url.searchParams.get("shop");
console.log(productId,shop,"productId,shop");
  if (!productId || !shop) {
    return { error: "Missing params" , status: 400 };
  }

  try {
    // 🔥 Get full shop document
    const data = await settingsModel.findOne({ shop });

    if (!data) {
      return { error: "Shop not found", status: 404 };
    }

    // 🔥 Convert numeric → gid
    const gid = `gid://shopify/Product/${productId}`;

    // 🔥 Find matching template
    let matchedTemplate = null;

    for (const template of data.templates || []) {
      const match = template.products?.some(
        (p) => p.id === gid
      );

      if (match) {
        matchedTemplate = template;
        break;
      }
    }

    // 🔥 If no product-specific template → fallback (optional)
    if (!matchedTemplate) {
      matchedTemplate = data.templates?.[0]; // or global logic
    }
    console.log(matchedTemplate, "matchedTemplate");
     return new Response(JSON.stringify({ data: matchedTemplate?.fields }), {
        status: 200,
        headers: corsJsonHeaders,
      });
  } catch (error) {
     return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsJsonHeaders,
      });
  }
};
