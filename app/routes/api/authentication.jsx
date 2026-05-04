import { sessionModel } from "../db.schema";
import { unauthenticated } from "../shopify.server";
const corsJsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};



export const loader = async ({ request }) => {
  
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsJsonHeaders,
    });
  }
  const authHeader = request.headers.get("Authorization");

  
  const token = authHeader.replace("Bearer ", "");
    console.log("token", token);

  if (!token) {
    throw new Response(
      JSON.stringify({ error: "Missing session token" }),
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");
  
  if (!shop) {
    return new Response(JSON.stringify({ error: "Missing shop" }), {
      status: 400,
      headers: corsJsonHeaders,
    });
  }

  const credential = await sessionModel.findOne({ shop }, { _id: 1 });
  if (!credential) {
    return new Response(
      JSON.stringify({ error: "Storefront credentials not found" }),
      {
        status: 401,
        headers: corsJsonHeaders,
      },
    );
  }
  console.log("credential======>", credential);

  const { admin } = await unauthenticated.admin(shop);
  const response  = new Response(
    JSON.stringify({ message: "Photo successfully uploaded!" }),
    {
      status: 200,
      headers: corsJsonHeaders,
    },
  );
  console.log("responseresponse",response);
  console.log("responseresponse",await response.json());
  return  response
  };
  
  export const action = async ({ request }) => {
    // console.log("ACTION, request", request);
    console.log("ACTION, method", request.method);
    
    console.log("request.url", request.url);
  
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: corsJsonHeaders,
      });
      const { searchParams } = new URL(request.url);
      const shop = searchParams.get("shop");
      console.log("action===>searchParams", searchParams);

  
    
    if (!shop) {
      return new Response(JSON.stringify({ error: "Missing shop" }), {
        status: 400,
        headers: corsJsonHeaders,
      });
    }
  
    const credential = await sessionModel.findOne({ shop }, { _id: 1 });
    if (!credential) {
      return new Response(
        JSON.stringify({ error: "Storefront credentials not found" }),
        {
          status: 401,
          headers: corsJsonHeaders,
        },
      );
    }
    console.log("credential======>", credential);

    const { admin } = await unauthenticated.admin(shop);
    return  new Response(
      JSON.stringify({ message: "Photo successfully uploaded!" }),
      {
        status: 200,
        headers: corsJsonHeaders,
      },
    );
  };