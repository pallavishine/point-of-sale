import { sessionModel } from "../db.schema";
import { unauthenticated } from "../shopify.server";
const corsJsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};



export const loader = async ({ request }) => {
  console.log("loader, request", request);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsJsonHeaders,
    });
  }
  
    return null;
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
    const {shopify,image} = await request.json();
    console.log("shopify======>", shopify);
    // console.log("image=====>", image);
  
    
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
    return  response
  };