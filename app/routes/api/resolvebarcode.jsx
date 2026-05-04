// app/routes/api.resolveBarcode.jsx
//
// POST /api/resolveBarcode?shop=xxx
// Body: { barcode: string }
//
// Returns:
//   { found: true,  variantId: "123", productId: "456", ... }
//   { found: false, barcode: "..." }
//
// Strategy (tried in order):
//   1. Try to decode as a "unique" encoded barcode → look up by variant GID
//   2. Try to treat raw value as a numeric variant ID → look up by variant GID
//   3. Fall back to a Shopify storefront barcode field search
//      (covers "variantId" barcodes that are non-numeric and all "custom" barcodes)

import { sessionModel } from "../db.schema";
import { unauthenticated } from "../shopify.server";
import { decodeBarcode } from "../utils/barcodeGenerator";

const CORS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

// ── GraphQL fragments ─────────────────────────────────────────────────────────

// Look up a single variant by its GID
const VARIANT_BY_ID = `
  query VariantById($id: ID!) {
    productVariant(id: $id) {
      id
      legacyResourceId
      title
      displayName
      sku
      barcode
      price
      compareAtPrice
      inventoryQuantity
      product {
        id
        legacyResourceId
        title
        handle
        media(first: 1) {
          nodes { preview { image { url } } }
        }
      }
      media(first: 1) {
        nodes { preview { image { url } } }
      }
    }
  }
`;

// Search variants by the barcode field (covers custom + variantId barcodes)
const VARIANTS_BY_BARCODE = `
  query VariantsByBarcode($query: String!) {
    productVariants(first: 5, query: $query) {
      nodes {
        id
        legacyResourceId
        title
        displayName
        sku
        barcode
        price
        compareAtPrice
        inventoryQuantity
        product {
          id
          legacyResourceId
          title
          handle
          media(first: 1) {
            nodes { preview { image { url } } }
          }
        }
        media(first: 1) {
          nodes { preview { image { url } } }
        }
      }
    }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatVariant(node) {
  return {
    variantId: node.legacyResourceId,
    variantGid: node.id,
    title: node.title,
    displayName: node.displayName,
    sku: node.sku,
    barcode: node.barcode,
    price: node.price,
    compareAtPrice: node.compareAtPrice,
    inventoryQuantity: node.inventoryQuantity,
    image: node.media?.nodes?.[0]?.preview?.image?.url ?? null,
    productId: node.product?.legacyResourceId,
    productGid: node.product?.id,
    productTitle: node.product?.title,
    productHandle: node.product?.handle,
    productImage: node.product?.media?.nodes?.[0]?.preview?.image?.url ?? null,
  };
}

async function fetchVariantById(admin, numericId) {
  const gid = `gid://shopify/ProductVariant/${numericId}`;
  try {
    const res = await admin.graphql(VARIANT_BY_ID, { variables: { id: gid } });
    const data = await res.json();
    const node = data?.data?.productVariant;
    return node ? formatVariant(node) : null;
  } catch {
    return null;
  }
}

async function fetchVariantByBarcodeField(admin, barcodeValue) {
  try {
    const res = await admin.graphql(VARIANTS_BY_BARCODE, {
      variables: { query: `barcode:${barcodeValue}` },
    });
    const data = await res.json();
    const node = data?.data?.productVariants?.nodes?.[0];
    return node ? formatVariant(node) : null;
  } catch {
    return null;
  }
}

// ── Route handlers ────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS });
  return json({ error: "Use POST" }, 405);
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS });

  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");

  if (!shop) return json({ error: "Missing shop" }, 400);

  const credential = await sessionModel.findOne({ shop }, { _id: 1 });
  if (!credential) return json({ error: "Shop not verified" }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { barcode } = body;
  if (!barcode || !String(barcode).trim()) {
    return json({ error: "barcode is required" }, 400);
  }

  const scanned = String(barcode).trim();
  const { admin } = await unauthenticated.admin(shop);

  // ── Strategy 1: try to decode as a "unique" encoded barcode ──────────────
  // decodeBarcode returns the original variant ID if the Luhn check passes
  // and the structure matches the PREFIX + length constraints.
  const decodedId = decodeBarcode(scanned);
  if (decodedId) {
    const variant = await fetchVariantById(admin, decodedId);
    if (variant) {
      return json({ found: true, strategy: "unique", ...variant });
    }
    // Decoded successfully but variant not found in this shop — fall through
  }

  // ── Strategy 2: treat raw value as a plain numeric variant ID ─────────────
  // Covers "variantId" generation type where barcode === raw variant numeric ID
  const numericOnly = scanned.replace(/\D/g, "");
  if (numericOnly && numericOnly === scanned) {
    // Only attempt if the entire scanned value was numeric
    const variant = await fetchVariantById(admin, numericOnly);
    if (variant) {
      return json({ found: true, strategy: "variantId", ...variant });
    }
  }

  // ── Strategy 3: search by barcode field ───────────────────────────────────
  // Covers "custom" templates and any barcode manually set in Shopify admin.
  // Also serves as the fallback for "variantId" when value contained non-digits.
  const variant = await fetchVariantByBarcodeField(admin, scanned);
  if (variant) {
    return json({ found: true, strategy: "barcodeField", ...variant });
  }

  // Nothing found
  return json({ found: false, barcode: scanned });
};
