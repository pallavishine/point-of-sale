
import shopify, { authenticate } from "../shopify.server";
 export   const authenticatePOS = async(request)=> {
  const authHeader = request.headers.get("Authorization");

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new Response(
      JSON.stringify({ error: "Missing session token" }),
      { status: 401 }
    );
  }


  const { session } = await authenticate.sessionToken(token);
  console.log("session=======>", session);

  if (!session?.shop) {
    throw new Response(
      JSON.stringify({ error: "Invalid session token" }),
      { status: 401 }
    );
  }

  return {token,session};
}