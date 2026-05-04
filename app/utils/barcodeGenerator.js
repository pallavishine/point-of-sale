// // backend/utils/barcodeGenerator.js

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

// // Generate 1-digit random
// const r1 = () => Math.floor(Math.random() * 10).toString();

// export const generateBarcode = (id) => {
//   const cleanId = id.replace(/\D/g, "").padStart(14, "0");

//   const first5 = cleanId.slice(0, 5);
//   const middle4 = cleanId.slice(5, 9);
//   const last5 = cleanId.slice(9, 14);

//   const r1_val = r1();
//   const r2_val = r1();

//   const baseBarcode = PREFIX + last5 + r1_val + middle4 + r2_val + first5;

//   return baseBarcode + checksum(baseBarcode);
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

// // Test function
// export const testBarcode = (variantId) => {
//   console.log("Testing with variant ID:", variantId);

//   const barcode = generateBarcode(variantId);
//   console.log("Generated barcode:", barcode, "length:", barcode.length);

//   const decoded = decodeBarcode(barcode);
//   console.log("Decoded variant ID:", decoded);

//   const cleanOriginal = variantId.replace(/\D/g, "").replace(/^0+/, "");
//   const match = cleanOriginal === decoded;
//   console.log("Match:", match);

//   return { barcode, decoded, success: match };
// };

// export async function generateBulkBarcodes(variants) {
//   console.log("variants", variants);
//   const results = [];

//   for (const variant of variants) {
//     const barcode = generateBarcode(variant.variantId);
//     console.log("barcode", barcode);

//     // await shopify.productVariant.update(variantId, {
//     //   barcode: barcode
//     // });

//     results.push({
//       variantId: variant.variantId,
//       sku: variant.sku,
//       title: variant.title,
//       barcode,
//     });
//   }
//   return results;
// }

// export function generateSku(variant) {
//   const prefix = variant.productTitle?.substring(0, 3).toUpperCase() || "PRD";
//   const variantCode = variant.title?.substring(0, 3).toUpperCase() || "VAR";
//   const random = Math.floor(Math.random() * 10000)
//     .toString()
//     .padStart(4, "0");
//   return `${prefix}-${variantCode}-${random}`;
// }

// // utils/barcodeGenerator.js
// // Generates TEC-IT barcode image URLs for all 11 supported symbologies.
// // API base: https://barcode.tec-it.com/barcode.ashx
// //
// // ⚠️  DATA CONSTRAINTS per symbology:
// //   Code-11           → digits + "-" only
// //   Code-2of5 ITF     → even number of digits only
// //   Code-39           → uppercase A-Z, 0-9, space, - . $ / + % only
// //   Code-39 Full ASCII → full ASCII but encode via translate-esc
// //   Code-93           → uppercase A-Z, 0-9, space, - . $ / + %
// //   Flattermarken     → digits only
// //   GS1-128           → digits/AI pairs, FNC1 injected automatically by API
// //   MSI               → digits only
// //   Pharmacode 1-Track → numeric 3–131070
// //   Pharmacode 2-Track → numeric 4–64570080
// //   Telepen Alpha      → full ASCII

// const BARCODE_VALUE = "964458753190440359"; // fixed value for this project

// const TEC_IT_BASE = "https://barcode.tec-it.com/barcode.ashx";

// function buildTecItUrl(code, data, extras = {}) {
//   const params = new URLSearchParams({
//     data,
//     code,
//     ...extras,
//   });
//   return `${TEC_IT_BASE}?${params.toString()}`;
// }

// export function getBarcodeConfig(type, value = BARCODE_VALUE) {
//   switch (type) {
//     // ── Code-128 ─────────────────────────────────────────────────────────────
//     // Encodes full ASCII (128 chars). Auto-selects subset A/B/C.
//     // Best for: logistics, shipping labels, general purpose.
//     // Our value (18 digits) → will use subset C (double-density numeric).
//     case "code128":
//       return {
//         type,
//         data: value,
//         url: buildTecItUrl("Code128", value),
//         notes:
//           "Auto subset selection. Numeric-only data uses subset C (double density).",
//         supported: true,
//       };

//     // ── Code-11 ──────────────────────────────────────────────────────────────
//     // Encodes: digits 0–9 and dash "-" only.
//     // Our value is all digits → fully supported.
//     case "code11":
//       return {
//         type,
//         data: value,
//         url: buildTecItUrl("Code11", value),
//         notes:
//           "Digits and '-' only. Used in telecom/network equipment labelling.",
//         supported: true,
//       };

//     // ── Code-2of5 Interleaved (ITF) ───────────────────────────────────────────
//     // Encodes: digits only. MUST be even number of digits.
//     // Our value has 18 digits → even → fully supported.
//     case "itf": {
//       const itfData = value.length % 2 !== 0 ? "0" + value : value; // pad if odd
//       return {
//         type,
//         data: itfData,
//         url: buildTecItUrl("I2of5", itfData),
//         notes:
//           "Digits only, must be even-length. Our 18-digit value is already even — no padding needed.",
//         supported: true,
//       };
//     }

//     // ── Code-39 ───────────────────────────────────────────────────────────────
//     // Encodes: A-Z (uppercase), 0-9, space, - . $ / + %
//     // Our value is all digits → fully supported.
//     case "code39":
//       return {
//         type,
//         data: value,
//         url: buildTecItUrl("Code39", value),
//         notes:
//           "Uppercase alphanumeric + special chars (- . $ / + %). All digits → supported.",
//         supported: true,
//       };

//     // ── Code-39 Full ASCII ────────────────────────────────────────────────────
//     // Extended Code-39 using two-character pairs to encode full ASCII (0–127).
//     // translate-esc=on tells TEC-IT to process escape sequences.
//     case "code39ext":
//       return {
//         type,
//         data: value,
//         url: buildTecItUrl("Code39Ext", value, { "translate-esc": "on" }),
//         notes:
//           "Full ASCII via two-char pairs. translate-esc=on enables escape processing.",
//         supported: true,
//       };

//     // ── Code-93 ───────────────────────────────────────────────────────────────
//     // Encodes: A-Z, 0-9, space, - . $ / + % (same charset as Code-39).
//     // More compact than Code-39. Our digits → supported.
//     case "code93":
//       return {
//         type,
//         data: value,
//         url: buildTecItUrl("Code93", value),
//         notes:
//           "Compact alternative to Code-39. Same character set. Two checksum chars appended automatically.",
//         supported: true,
//       };

//     // ── Flattermarken ─────────────────────────────────────────────────────────
//     // German postal barcode. Digits only. Used for mail sorting.
//     case "flattermarken":
//       return {
//         type,
//         data: value,
//         url: buildTecItUrl("Flattermarken", value),
//         notes:
//           "German postal sorting barcode. Digits only. Each digit maps to a bar pattern.",
//         supported: true,
//       };

//     // ── GS1-128 (UCC/EAN-128) ─────────────────────────────────────────────────
//     // GS1-128 requires Application Identifier (AI) prefix.
//     // AI (21) = Serial Number. We wrap our value: (21)<value>
//     // translate-esc=on required for FNC1 character injection.
//     case "gs1128": {
//       // AI 21 = Serial Shipping Number — appropriate for an 18-digit serial
//       const gs1Data = `(21)${value}`;
//       return {
//         type,
//         data: gs1Data,
//         url: buildTecItUrl("GS1-128", gs1Data, { "translate-esc": "on" }),
//         notes:
//           "Uses Application Identifier (21) = Serial Number. FNC1 injected automatically by TEC-IT. translate-esc=on required.",
//         supported: true,
//       };
//     }

//     // ── MSI (MSI Plessey) ─────────────────────────────────────────────────────
//     // Encodes: digits 0–9 only. Used in retail/warehouse shelving.
//     case "msi":
//       return {
//         type,
//         data: value,
//         url: buildTecItUrl("MSI", value),
//         notes:
//           "Digits only. Mod-10 checksum appended automatically. Used in warehouse shelf labelling.",
//         supported: true,
//       };

//     // ── Pharmacode One-Track ──────────────────────────────────────────────────
//     // Numeric value in range 3–131070 only.
//     // Our 18-digit value FAR exceeds max (131070) → NOT directly supported.
//     // We use last 6 digits truncated to fit: still may exceed range.
//     // You should map your variant ID to a pharmacode-range number separately.
//     case "pharmacode1": {
//       const pharma1Max = 131070;
//       // Take last 6 digits, cap at max
//       const pharma1Raw = parseInt(value.slice(-6), 10);
//       const pharma1Data = String(Math.min(pharma1Raw, pharma1Max));
//       return {
//         type,
//         data: pharma1Data,
//         url: buildTecItUrl("Pharmacode", pharma1Data),
//         notes:
//           `⚠️ Range 3–131070 only. Full 18-digit value exceeds max. ` +
//           `Using last-6-digits capped to ${pharma1Max}: "${pharma1Data}". ` +
//           `In production, map your product to a dedicated pharmacode number.`,
//         supported: false, // full value not encodable
//       };
//     }

//     // ── Pharmacode Two-Track ──────────────────────────────────────────────────
//     // Numeric value in range 4–64570080 only.
//     // Our 18-digit value exceeds max → truncate similarly.
//     case "pharmacode2": {
//       const pharma2Max = 64570080;
//       const pharma2Raw = parseInt(value.slice(-8), 10);
//       const pharma2Data = String(Math.min(pharma2Raw, pharma2Max));
//       return {
//         type,
//         data: pharma2Data,
//         url: buildTecItUrl("Pharmacode2", pharma2Data),
//         notes:
//           `⚠️ Range 4–64570080 only. Full 18-digit value exceeds max. ` +
//           `Using last-8-digits capped to ${pharma2Max}: "${pharma2Data}". ` +
//           `In production, assign a dedicated pharmacode number per product.`,
//         supported: false, // full value not encodable
//       };
//     }

//     // ── Telepen Alpha ─────────────────────────────────────────────────────────
//     // Full ASCII support. Originally used in UK libraries.
//     // Our numeric value → fully supported.
//     case "telepen":
//       return {
//         type,
//         data: value,
//         url: buildTecItUrl("TelepenAlpha", value),
//         notes:
//           "Full ASCII. Numeric mode auto-selected for digit-only data (double density).",
//         supported: true,
//       };

//     // ── Unknown type ──────────────────────────────────────────────────────────
//     default:
//       throw new Error(
//         `Unknown barcode type: "${type}". ` +
//           `Valid types: code128 | code11 | itf | code39 | code39ext | code93 | ` +
//           `flattermarken | gs1128 | msi | pharmacode1 | pharmacode2 | telepen`,
//       );
//   }
// }

// // ─── ALL TYPES LIST (for iterating / rendering all at once) ──────────────────

// export const ALL_BARCODE_TYPES = [
//   "code128",
//   "code11",
//   "itf",
//   "code39",
//   "code39ext",
//   "code93",
//   "flattermarken",
//   "gs1128",
//   "msi",
//   "pharmacode1",
//   "pharmacode2",
//   "telepen",
// ];

// // ─── USAGE EXAMPLES ───────────────────────────────────────────────────────────
// //
// // Single:
// //   const config = getBarcodeConfig("code128");
// //   console.log(config.url);
// //   // → https://barcode.tec-it.com/barcode.ashx?data=964458753190440359&code=Code128
// //
// // In JSX (render barcode image):
// //   <img src={getBarcodeConfig("code39").url} alt="Code-39 barcode" />
// //
// // All types:
// //   ALL_BARCODE_TYPES.forEach(type => {
// //     const { type, url, notes, supported } = getBarcodeConfig(type);
// //     console.log(`${type}: ${supported ? "✅" : "⚠️"} ${url}`);
// //   });

// ─────────────────────────────────────────────────────────────────────────────
// barcodeGenerator.js
// Three generation strategies:
//   1. unique    — proprietary 18-digit encoded barcode (reversible via decodeBarcode)
//   2. variantId — raw Shopify variant ID as the barcode value
//   3. custom    — user-defined template with dynamic tokens
// ─────────────────────────────────────────────────────────────────────────────

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Luhn checksum — returns the single check digit for `num` (string of digits). */
function luhnChecksum(num) {
  let sum = 0;
  let alt = false;
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

/** Zero-pad `str` on the left to `len` characters. */
function padLeft(str, len, char = "0") {
  return String(str).padStart(len, char);
}

/** Extract the numeric tail of a Shopify GID, e.g. "gid://shopify/ProductVariant/123" → "123". */
function gidToNumeric(gid) {
  if (!gid) return "";
  return String(gid).replace(/\D/g, "").replace(/^0+/, "") || "0";
}

/** YYYYMMDD string from a Date (defaults to today). */
function dateStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = padLeft(date.getMonth() + 1, 2);
  const d = padLeft(date.getDate(), 2);
  return `${y}${m}${d}`;
}

/** YYYYMMDDHHMMSS timestamp string. */
function timeStamp(date = new Date()) {
  const h = padLeft(date.getHours(), 2);
  const mi = padLeft(date.getMinutes(), 2);
  const s = padLeft(date.getSeconds(), 2);
  return `${dateStamp(date)}${h}${mi}${s}`;
}

/** Cryptographically random integer in [0, max). Falls back to Math.random. */
function secureRandInt(max) {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/** Random numeric string of exactly `len` digits. */
function randomDigits(len = 6) {
  const max = Math.pow(10, len);
  return padLeft(secureRandInt(max), len);
}

// ── Strategy 1 — Unique encoded barcode ──────────────────────────────────────
// Layout (18 chars total):
//   [1]  PREFIX "9"
//   [5]  last-5 of cleanId
//   [1]  random digit r1
//   [4]  middle-4 of cleanId
//   [1]  random digit r2
//   [5]  first-5 of cleanId
//   [1]  Luhn check digit
//
// The encoding shuffles the variant ID segments so a plain scan reveals no ID.
// It is fully reversible via decodeBarcode().

const UNIQUE_PREFIX = "9";

export function generateBarcode(variantId) {
  const cleanId = gidToNumeric(variantId).padStart(14, "0").slice(-14);
  const first5 = cleanId.slice(0, 5);
  const middle4 = cleanId.slice(5, 9);
  const last5 = cleanId.slice(9, 14);
  const r1 = randomDigits(1);
  const r2 = randomDigits(1);
  const base = `${UNIQUE_PREFIX}${last5}${r1}${middle4}${r2}${first5}`;
  return base + luhnChecksum(base);
}

export function decodeBarcode(barcode) {
  try {
    const clean = String(barcode).replace(/\D/g, "");
    if (!clean.startsWith(UNIQUE_PREFIX) || clean.length !== 18) return null;

    // Verify Luhn
    const body = clean.slice(0, 17);
    const checkDig = clean.slice(17);
    if (luhnChecksum(body) !== checkDig) return null;

    const data = clean.slice(1, 17); // 16 digits (prefix + check stripped)
    const last5 = data.slice(0, 5); // positions 0–4
    // r1        = data.slice(5, 6)      // ignored
    const mid4 = data.slice(6, 10); // positions 6–9
    // r2        = data.slice(10, 11)    // ignored
    const first5 = data.slice(11, 16); // positions 11–15

    const reconstructed = first5 + mid4 + last5;
    return parseInt(reconstructed, 10).toString();
  } catch {
    return null;
  }
}

// ── Strategy 2 — Variant-based barcode ───────────────────────────────────────


export function generateVariantIdBarcode(variantId) {
  return gidToNumeric(variantId);
}

// ── Strategy 3 — Custom template barcode ─────────────────────────────────────
//
// A template is a string with tokens wrapped in curly braces, e.g.:
//   "{prefix}-{variantId}-{date}-{random6}"
//
// Available tokens:
//   {prefix}          → config.prefix  (static string, default "")
//   {suffix}          → config.suffix  (static string, default "")
//   {productId}       → numeric product ID
//   {variantId}       → numeric variant ID
//   {sku}             → variant.sku (falls back to variantId if empty)
//   {date}            → YYYYMMDD (today)
//   {timestamp}       → YYYYMMDDHHmmss
//   {random4}         → 4-digit random number
//   {random6}         → 6-digit random number  (default random)
//   {random8}         → 8-digit random number
//   {year}            → 4-digit year
//   {month}           → 2-digit month (01–12)
//   {day}             → 2-digit day (01–31)
//   {sequence}        → zero-padded sequence index (requires passing index)

export const CUSTOM_BARCODE_TOKENS = [
  {
    token: "{prefix}",
    description: "Static prefix from config",
    example: "SHOP",
  },
  {
    token: "{suffix}",
    description: "Static suffix from config",
    example: "001",
  },
  {
    token: "{productId}",
    description: "Numeric Shopify product ID",
    example: "7890123456789",
  },
  {
    token: "{variantId}",
    description: "Numeric Shopify variant ID",
    example: "42312345678",
  },
  {
    token: "{sku}",
    description: "Variant SKU (falls back to ID)",
    example: "RED-LG",
  },
  {
    token: "{date}",
    description: "Today's date as YYYYMMDD",
    example: "20260501",
  },
  {
    token: "{timestamp}",
    description: "Date+time as YYYYMMDDHHmmss",
    example: "20260501143022",
  },
  { token: "{random4}", description: "4-digit random number", example: "3847" },
  {
    token: "{random6}",
    description: "6-digit random number",
    example: "829471",
  },
  {
    token: "{random8}",
    description: "8-digit random number",
    example: "40192837",
  },
  { token: "{year}", description: "Current 4-digit year", example: "2026" },
  {
    token: "{month}",
    description: "Current 2-digit month (01–12)",
    example: "05",
  },
  { token: "{day}", description: "Current 2-digit day (01–31)", example: "01" },
  {
    token: "{sequence}",
    description: "Zero-padded batch sequence index",
    example: "0042",
  },
];

export function generateCustomBarcode(config, variant, index = 0) {
  const {
    template = "{prefix}{variantId}{random6}{suffix}",
    prefix = "",
    suffix = "",
    sequencePadding = 4,
  } = config;

  if (!template) {
    throw new Error(
      "Custom barcode config must include a non-empty `template` string.",
    );
  }

  const now = new Date();
  const variantNum = gidToNumeric(variant.id || "");
  const productNum = gidToNumeric(variant.productId || "");

  const replacements = {
    prefix: String(prefix),
    suffix: String(suffix),
    productId: productNum,
    variantId: variantNum,
    sku: variant.sku || variantNum,
    date: dateStamp(now),
    timestamp: timeStamp(now),
    random4: randomDigits(4),
    random6: randomDigits(6),
    random8: randomDigits(8),
    year: String(now.getFullYear()),
    month: padLeft(now.getMonth() + 1, 2),
    day: padLeft(now.getDate(), 2),
    sequence: padLeft(index, sequencePadding),
  };

  // Replace each {token} — unknown tokens are left as-is so the caller can debug
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(replacements, key)
      ? replacements[key]
      : match,
  );
}

// ── Unified entry point ───────────────────────────────────────────────────────

export function generateIdentifiers(
  generationType,
  assignmentType,
  variant,
  customConfig = {},
  index = 0,
) {
  const variantNumericId = gidToNumeric(variant.id);
  const result = {};

  const needsBarcode =
    assignmentType === "barcode" || assignmentType === "both";
  const needsSku = assignmentType === "sku" || assignmentType === "both";

  // ── Resolve the raw generated value based on strategy ────────────────────
  let generatedValue;

  switch (generationType) {
    case "unique":
      generatedValue = generateBarcode(variantNumericId);
      break;

    case "variantId":
      generatedValue = generateVariantIdBarcode(variantNumericId);
      break;

    case "custom":
      generatedValue = generateCustomBarcode(customConfig, variant, index);
      break;

    default:
      throw new Error(
        `Unknown generationType "${generationType}". ` +
          `Valid values: "unique" | "variantId" | "custom".`,
      );
  }

  // ── Assign to the correct field(s) ───────────────────────────────────────
  // For "both" with "custom", barcodes and SKUs can have independent templates
  // if customConfig.skuTemplate is supplied; otherwise both share the same value.
  if (needsBarcode) {
    result.barcode = generatedValue;
  }

  if (needsSku) {
    // Allow a separate SKU template for "custom" + "both"
    if (generationType === "custom" && customConfig.skuTemplate) {
      result.sku = generateCustomBarcode(
        { ...customConfig, template: customConfig.skuTemplate },
        variant,
        index,
      );
    } else if (generationType === "unique") {
      // For unique + sku-only, generate a human-readable SKU instead
      result.sku = generateSku(variant);
    } else {
      result.sku = generatedValue;
    }
  }

  return result;
}

// ── SKU generator (unchanged, kept for backward compat) ──────────────────────

/**
 * Generate a readable SKU from variant metadata.
 * Format: {3-char product prefix}-{3-char variant prefix}-{4-digit random}
 */
export function generateSku(variant) {
  const prefix = (variant.productTitle || "PRD").substring(0, 3).toUpperCase();
  const variantCode = (variant.title || "VAR").substring(0, 3).toUpperCase();
  return `${prefix}-${variantCode}-${randomDigits(4)}`;
}

// ── Bulk generation helper ────────────────────────────────────────────────────

export function buildVariantUpdates({
  generationType,
  assignmentType,
  overwriteExisting,
  variants,
  customConfig = {},
}) {
  const updates = [];

  variants.forEach((variant, index) => {
    const variantNumericId = variant.id.split("/").pop();
    const needsBarcode =
      assignmentType === "barcode" || assignmentType === "both";
    const needsSku = assignmentType === "sku" || assignmentType === "both";

    // Determine which fields actually need a new value
    const shouldUpdateBarcode =
      needsBarcode && (overwriteExisting || !variant.barcode);
    const shouldUpdateSku = needsSku && (overwriteExisting || !variant.sku);

    if (!shouldUpdateBarcode && !shouldUpdateSku) return; // nothing to do

    // Temporarily narrow assignmentType to what actually needs updating
    const effectiveAssignment =
      shouldUpdateBarcode && shouldUpdateSku
        ? "both"
        : shouldUpdateBarcode
          ? "barcode"
          : "sku";

    const generated = generateIdentifiers(
      generationType,
      effectiveAssignment,
      { ...variant, id: variantNumericId },
      customConfig,
      index,
    );

    updates.push({ id: variant.id, ...generated });
  });

  return updates;
}

// ── TEC-IT barcode image URL builder (unchanged) ──────────────────────────────

const TEC_IT_BASE = "https://barcode.tec-it.com/barcode.ashx";

function buildTecItUrl(code, data, extras = {}) {
  const params = new URLSearchParams({ data, code, ...extras });
  return `${TEC_IT_BASE}?${params.toString()}`;
}

export function getBarcodeConfig(type, value) {
  if (!value) throw new Error("getBarcodeConfig: value is required");

  switch (type) {
    case "code128":
      return {
        type,
        data: value,
        url: buildTecItUrl("Code128", value),
        supported: true,
      };
    case "code11":
      return {
        type,
        data: value,
        url: buildTecItUrl("Code11", value),
        supported: true,
      };
    case "itf": {
      const itfData = value.length % 2 !== 0 ? "0" + value : value;
      return {
        type,
        data: itfData,
        url: buildTecItUrl("I2of5", itfData),
        supported: true,
      };
    }
    case "code39":
      return {
        type,
        data: value,
        url: buildTecItUrl("Code39", value),
        supported: true,
      };
    case "code39ext":
      return {
        type,
        data: value,
        url: buildTecItUrl("Code39Ext", value, { "translate-esc": "on" }),
        supported: true,
      };
    case "code93":
      return {
        type,
        data: value,
        url: buildTecItUrl("Code93", value),
        supported: true,
      };
    case "flattermarken":
      return {
        type,
        data: value,
        url: buildTecItUrl("Flattermarken", value),
        supported: true,
      };
    case "gs1128": {
      const gs1Data = `(21)${value}`;
      return {
        type,
        data: gs1Data,
        url: buildTecItUrl("GS1-128", gs1Data, { "translate-esc": "on" }),
        supported: true,
      };
    }
    case "msi":
      return {
        type,
        data: value,
        url: buildTecItUrl("MSI", value),
        supported: true,
      };
    case "telepen":
      return {
        type,
        data: value,
        url: buildTecItUrl("TelepenAlpha", value),
        supported: true,
      };
    default:
      throw new Error(`Unknown barcode type: "${type}"`);
  }
}

export const ALL_BARCODE_TYPES = [
  "code128",
  "code11",
  "itf",
  "code39",
  "code39ext",
  "code93",
  "flattermarken",
  "gs1128",
  "msi",
  "telepen",
];
