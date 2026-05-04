// const PREFIX = "9"; // 1 digit
// const CHECKSUM_DIGITS = 1;

// // Simple checksum (Luhn)
// const checksum = (num) => {
//   let sum = 0,
//     alt = false;
//   for (let i = num.length - 1; i >= 0; i--) {
//     let d = +num[i];
//     if (alt) {
//       d *= 2;
//       if (d > 9) d -= 9;
//     }
//     sum += d;
//     alt = !alt;
//   }
//   return ((10 - (sum % 10)) % 10).toString();
// };

// export const decodeBarcode = (barcode) => {
//   try {
//     const clean = barcode.replace(/\D/g, "");

//     if (!clean.startsWith(PREFIX) || clean.length !== 18) return null;
//     const data = clean.slice(1, 17); // 16 digits (excludes PREFIX and CHECKSUM)

//     const last5   = data.slice(0, 5);   // positions 0–4
//     // r1        = data.slice(5, 6)     // ignored
//     const middle4 = data.slice(6, 10);  // positions 6–9
//     // r2        = data.slice(10, 11)   // ignored
//     const first5  = data.slice(11, 16); // positions 11–15

//     // Reconstruct original cleanId order: first5 + middle4 + last5
//     const reconstructed = first5 + middle4 + last5;

//     // Strip leading zeros and return
//     return parseInt(reconstructed, 10).toString();
//   } catch (error) {
//     console.error("Decode failed:", error);
//     return null;
//   }
// };

// extensions/barcode-scanner/src/utils/barcodeDecoder.js
//
// Three generation strategies produce three barcode formats:
//
//   Strategy 1 — "unique"
//     Format : 18-digit string starting with "9", ending with Luhn check digit
//     Decode : shuffle → reconstruct variantId → GraphQL lookup by GID
//
//   Strategy 2 — "variantId"
//     Format : raw numeric Shopify variant ID (typically 13–15 digits, no prefix)
//     Decode : use directly as variantId → GraphQL lookup by GID
//
//   Strategy 3 — "custom"
//     Format : arbitrary string (may contain letters, dashes, dates, etc.)
//     Decode : cannot reconstruct variantId → must search Shopify by barcode field
//
// This file exports one function: resolveBarcode(rawScan)
// It returns { strategy, variantId?, searchTerm? } so the caller knows
// which GraphQL query to fire.

const UNIQUE_PREFIX = "9";
const UNIQUE_LENGTH = 18;

// ── Luhn verification ─────────────────────────────────────────────────────────
function luhnChecksum(num) {
  let sum = 0,
    alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = +num[i];
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return ((10 - (sum % 10)) % 10).toString();
}

function isValidLuhn(str) {
  if (str.length < 2) return false;
  const body = str.slice(0, -1);
  const check = str.slice(-1);
  return luhnChecksum(body) === check;
}

// ── Strategy detector ─────────────────────────────────────────────────────────

function detectStrategy(raw) {
  const digitsOnly = /^\d+$/.test(raw);

  // "unique" barcodes are exactly 18 digits, start with "9", pass Luhn
  if (
    digitsOnly &&
    raw.length === UNIQUE_LENGTH &&
    raw.startsWith(UNIQUE_PREFIX) &&
    isValidLuhn(raw)
  ) {
    return "unique";
  }

  // "variantId" barcodes are pure digits (Shopify IDs are 8–15 digits typically)
  // We accept 6–18 digits that didn't match the unique pattern above
  if (digitsOnly && raw.length >= 6 && raw.length <= 18) {
    return "variantId";
  }

  // Anything else (contains letters, dashes, dates, custom prefixes)
  return "custom";
}

// ── Unique barcode decoder ────────────────────────────────────────────────────

/**
 * Decode an 18-digit "unique" encoded barcode back to the original numeric variant ID.
 * Returns null if the barcode is malformed or the Luhn check fails.
 *
 * Encoding layout (positions in the 18-char string):
 *   [0]     PREFIX "9"
 *   [1–5]   last-5  of cleanId
 *   [6]     random digit r1  (discarded)
 *   [7–10]  middle-4 of cleanId
 *   [11]    random digit r2  (discarded)
 *   [12–16] first-5  of cleanId
 *   [17]    Luhn check digit
 
 */
export function decodeBarcode(barcode) {
  try {
    const clean = String(barcode).replace(/\D/g, "");
    if (clean.length !== UNIQUE_LENGTH) return null;
    if (!clean.startsWith(UNIQUE_PREFIX)) return null;
    if (!isValidLuhn(clean)) return null;

    const data = clean.slice(1, 17); // 16 digits (strip prefix + check)
    const last5 = data.slice(0, 5); // positions 0–4
    // r1        = data[5]                  // ignored
    const mid4 = data.slice(6, 10); // positions 6–9
    // r2        = data[10]                 // ignored
    const first5 = data.slice(11, 16); // positions 11–15

    const reconstructed = first5 + mid4 + last5;
    return parseInt(reconstructed, 10).toString();
  } catch {
    return null;
  }
}

// ── Main resolver ─────────────────────────────────────────────────────────────


/**
 * Resolve a raw scanned barcode string into the data needed to look up the
 * Shopify product variant.
 *
 * Usage in the scanner:
 *   const resolved = resolveBarcode(result.data);
 *   if (resolved.strategy === "custom") {
 *     // use resolved.searchTerm with productVariants(query: "barcode:...")
 *   } else {
 *     // use resolved.variantId with productVariant(id: "gid://shopify/ProductVariant/...")
 *   }
 *
 */
export function resolveBarcode(rawScan) {
  const raw = String(rawScan ?? "").trim();

  if (!raw) {
    return {
      strategy: "custom",
      variantId: null,
      searchTerm: null,
      error: "Empty barcode",
    };
  }

  const strategy = detectStrategy(raw);

  switch (strategy) {
    case "unique": {
      const variantId = decodeBarcode(raw);
      if (!variantId) {
        // Luhn passed but decode failed — treat as custom fallback
        return {
          strategy: "custom",
          variantId: null,
          searchTerm: raw,
          error: null,
        };
      }
      return { strategy: "unique", variantId, searchTerm: raw, error: null };
    }

    case "variantId": {
      // Strip leading zeros — Shopify IDs never have them
      const variantId = parseInt(raw, 10).toString();
      return { strategy: "variantId", variantId, searchTerm: raw, error: null };
    }

    case "custom":
    default:
      return {
        strategy: "custom",
        variantId: null,
        searchTerm: raw,
        error: null,
      };
  }
}
