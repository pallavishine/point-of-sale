export const action = async ({ request }) => {
    const { admin, shop, topic, session, payload } =
      await authenticate.webhook(request);
  
    if (!admin) {
      return new Response("Unauthorized.", {
        status: 401,
      });
    }
    return json(`${topic} succcess returned`, { status: 200 });

}