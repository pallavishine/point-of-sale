export async function gql(query, variables = {}) {
    const res = await fetch("shopify:admin/api/graphql.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    return res.json();
  }
  
  export function numericId(gid) {
    return parseInt(gid.split("/").pop() ?? "0", 10);
  }