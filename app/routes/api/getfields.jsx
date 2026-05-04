import { settingsModel } from "../db.schema";

const corsJsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsJsonHeaders });
  }
};

export const action = async ({ request }) => {
  // ✅ Handle preflight (CORS)
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsJsonHeaders });
  }

  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const fullUrl = url.href;
    const origin = url.origin;
    const hostname = url.hostname;
    const host = url.host;
    const pathname = url.pathname;
    const hostParam = url.searchParams.get("host");

    console.log({
      fullUrl,
      // origin,
      // hostname,
      // host,
      // pathname,
      // shop,
      // hostParam,
    });
    if (!shop) {
      return new Response(JSON.stringify({ error: "Missing shop" }), {
        status: 400,
        headers: corsJsonHeaders,
      });
    }
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }
    const payload = await request.json();
    console.log("payload", payload);
    const { productId, colIds } = payload;

    if (!productId && !colIds) {
      return new Response(JSON.stringify({ error: "Missing payload" }), {
        status: 400,
        headers: corsJsonHeaders,
      });
    }

    // ✅ Only fetch needed data (optimized)
    const data = await settingsModel
      .findOne({ shop }, { optionSets: 1 })
      .lean();

    if (!data?.optionSets?.length) {
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: corsJsonHeaders,
      });
    }

    const activeSets = data.optionSets.filter(
      (s) => s?.status === "active" && s.target === "product",
    );
    console.log("activeSets", activeSets?.length);

    let matchedProduct = null;
    let matchedCollection = null;
    let matchedAll = null;

    for (const s of activeSets) {
      const { type, products = [], collections = [] } = s.products || {};

      if (
        !matchedProduct &&
        type === "products" &&
        products.some((p) => p.id === productId)
      ) {
        matchedProduct = s;
        continue;
      }

      if (
        !matchedCollection &&
        type === "collections" &&
        colIds?.length &&
        collections.some((c) => colIds.includes(c.id))
      ) {
        matchedCollection = s;
      }

      if (!matchedAll && type === "all") {
        matchedAll = s;
      }
    }

    // console.log("matchedAll", matchedAll);
    // console.log("matchedCollection", matchedCollection);
    // console.log("matchedProduct", matchedProduct);

    const matched = matchedProduct || matchedCollection || matchedAll;
    console.log("matched", matched?.fields);
    console.log("matched", matched);
    
  
    return new Response(JSON.stringify({ data: matched?.fields ?? [] }), {
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
