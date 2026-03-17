// backend/utils/barcodeGenerator.js

const PREFIX = "9"; // 1 digit
const CHECKSUM_DIGITS = 1;

// Simple checksum (Luhn)
const checksum = (num) => {
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
};

// Generate 1-digit random
const r1 = () => Math.floor(Math.random() * 10).toString();

export const generateBarcode = (id) => {
  const cleanId = id.replace(/\D/g, "").padStart(14, "0");

  const first5 = cleanId.slice(0, 5);
  const middle4 = cleanId.slice(5, 9);
  const last5 = cleanId.slice(9, 14);

  const r1_val = r1();
  const r2_val = r1();

  // Format: PREFIX(1) + last5(5) + r1(1) + middle4(4) + r2(1) + first5(5) + CHECKSUM(1)
  // Total: 1 + 5 + 1 + 4 + 1 + 5 + 1 = 18 digits
  const baseBarcode = PREFIX + last5 + r1_val + middle4 + r2_val + first5;

  return baseBarcode + checksum(baseBarcode);
};

export const decodeBarcode = (barcode) => {
  try {
    const clean = barcode.replace(/\D/g, "");

    if (!clean.startsWith(PREFIX) || clean.length !== 18) return null;
    const data = clean.slice(1, 17); // 16 digits (excludes PREFIX and CHECKSUM)

    const last5   = data.slice(0, 5);   // positions 0–4
    // r1        = data.slice(5, 6)     // ignored
    const middle4 = data.slice(6, 10);  // positions 6–9
    // r2        = data.slice(10, 11)   // ignored
    const first5  = data.slice(11, 16); // positions 11–15

    // Reconstruct original cleanId order: first5 + middle4 + last5
    const reconstructed = first5 + middle4 + last5;

    // Strip leading zeros and return
    return parseInt(reconstructed, 10).toString();
  } catch (error) {
    console.error("Decode failed:", error);
    return null;
  }
};

// Test function
export const testBarcode = (variantId) => {
  console.log("Testing with variant ID:", variantId);

  const barcode = generateBarcode(variantId);
  console.log("Generated barcode:", barcode, "length:", barcode.length);

  const decoded = decodeBarcode(barcode);
  console.log("Decoded variant ID:", decoded);

  const cleanOriginal = variantId.replace(/\D/g, "").replace(/^0+/, "");
  const match = cleanOriginal === decoded;
  console.log("Match:", match);

  return { barcode, decoded, success: match };
};

export async function generateBulkBarcodes(variants) {
  console.log("variants", variants);
  const results = [];

  for (const variant of variants) {
    const barcode = generateBarcode(variant.variantId);
    console.log("barcode", barcode);

    // await shopify.productVariant.update(variantId, {
    //   barcode: barcode
    // });

    results.push({
      variantId: variant.variantId,
      sku: variant.sku,
      title: variant.title,
      barcode,
    });
  }
  return results;
}

export function generateSku(variant) {
  const prefix = variant.productTitle?.substring(0, 3).toUpperCase() || "PRD";
  const variantCode = variant.title?.substring(0, 3).toUpperCase() || "VAR";
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}-${variantCode}-${random}`;
}

// utils/barcodeGenerator.js
// Generates TEC-IT barcode image URLs for all 11 supported symbologies.
// API base: https://barcode.tec-it.com/barcode.ashx
//
// ⚠️  DATA CONSTRAINTS per symbology:
//   Code-11           → digits + "-" only
//   Code-2of5 ITF     → even number of digits only
//   Code-39           → uppercase A-Z, 0-9, space, - . $ / + % only
//   Code-39 Full ASCII → full ASCII but encode via translate-esc
//   Code-93           → uppercase A-Z, 0-9, space, - . $ / + %
//   Flattermarken     → digits only
//   GS1-128           → digits/AI pairs, FNC1 injected automatically by API
//   MSI               → digits only
//   Pharmacode 1-Track → numeric 3–131070
//   Pharmacode 2-Track → numeric 4–64570080
//   Telepen Alpha      → full ASCII

const BARCODE_VALUE = "964458753190440359"; // fixed value for this project

const TEC_IT_BASE = "https://barcode.tec-it.com/barcode.ashx";

function buildTecItUrl(code, data, extras = {}) {
  const params = new URLSearchParams({
    data,
    code,
    ...extras,
  });
  return `${TEC_IT_BASE}?${params.toString()}`;
}

export function getBarcodeConfig(type, value = BARCODE_VALUE) {
  switch (type) {
    // ── Code-128 ─────────────────────────────────────────────────────────────
    // Encodes full ASCII (128 chars). Auto-selects subset A/B/C.
    // Best for: logistics, shipping labels, general purpose.
    // Our value (18 digits) → will use subset C (double-density numeric).
    case "code128":
      return {
        type,
        data: value,
        url: buildTecItUrl("Code128", value),
        notes:
          "Auto subset selection. Numeric-only data uses subset C (double density).",
        supported: true,
      };

    // ── Code-11 ──────────────────────────────────────────────────────────────
    // Encodes: digits 0–9 and dash "-" only.
    // Our value is all digits → fully supported.
    case "code11":
      return {
        type,
        data: value,
        url: buildTecItUrl("Code11", value),
        notes:
          "Digits and '-' only. Used in telecom/network equipment labelling.",
        supported: true,
      };

    // ── Code-2of5 Interleaved (ITF) ───────────────────────────────────────────
    // Encodes: digits only. MUST be even number of digits.
    // Our value has 18 digits → even → fully supported.
    case "itf": {
      const itfData = value.length % 2 !== 0 ? "0" + value : value; // pad if odd
      return {
        type,
        data: itfData,
        url: buildTecItUrl("I2of5", itfData),
        notes:
          "Digits only, must be even-length. Our 18-digit value is already even — no padding needed.",
        supported: true,
      };
    }

    // ── Code-39 ───────────────────────────────────────────────────────────────
    // Encodes: A-Z (uppercase), 0-9, space, - . $ / + %
    // Our value is all digits → fully supported.
    case "code39":
      return {
        type,
        data: value,
        url: buildTecItUrl("Code39", value),
        notes:
          "Uppercase alphanumeric + special chars (- . $ / + %). All digits → supported.",
        supported: true,
      };

    // ── Code-39 Full ASCII ────────────────────────────────────────────────────
    // Extended Code-39 using two-character pairs to encode full ASCII (0–127).
    // translate-esc=on tells TEC-IT to process escape sequences.
    case "code39ext":
      return {
        type,
        data: value,
        url: buildTecItUrl("Code39Ext", value, { "translate-esc": "on" }),
        notes:
          "Full ASCII via two-char pairs. translate-esc=on enables escape processing.",
        supported: true,
      };

    // ── Code-93 ───────────────────────────────────────────────────────────────
    // Encodes: A-Z, 0-9, space, - . $ / + % (same charset as Code-39).
    // More compact than Code-39. Our digits → supported.
    case "code93":
      return {
        type,
        data: value,
        url: buildTecItUrl("Code93", value),
        notes:
          "Compact alternative to Code-39. Same character set. Two checksum chars appended automatically.",
        supported: true,
      };

    // ── Flattermarken ─────────────────────────────────────────────────────────
    // German postal barcode. Digits only. Used for mail sorting.
    case "flattermarken":
      return {
        type,
        data: value,
        url: buildTecItUrl("Flattermarken", value),
        notes:
          "German postal sorting barcode. Digits only. Each digit maps to a bar pattern.",
        supported: true,
      };

    // ── GS1-128 (UCC/EAN-128) ─────────────────────────────────────────────────
    // GS1-128 requires Application Identifier (AI) prefix.
    // AI (21) = Serial Number. We wrap our value: (21)<value>
    // translate-esc=on required for FNC1 character injection.
    case "gs1128": {
      // AI 21 = Serial Shipping Number — appropriate for an 18-digit serial
      const gs1Data = `(21)${value}`;
      return {
        type,
        data: gs1Data,
        url: buildTecItUrl("GS1-128", gs1Data, { "translate-esc": "on" }),
        notes:
          "Uses Application Identifier (21) = Serial Number. FNC1 injected automatically by TEC-IT. translate-esc=on required.",
        supported: true,
      };
    }

    // ── MSI (MSI Plessey) ─────────────────────────────────────────────────────
    // Encodes: digits 0–9 only. Used in retail/warehouse shelving.
    case "msi":
      return {
        type,
        data: value,
        url: buildTecItUrl("MSI", value),
        notes:
          "Digits only. Mod-10 checksum appended automatically. Used in warehouse shelf labelling.",
        supported: true,
      };

    // ── Pharmacode One-Track ──────────────────────────────────────────────────
    // Numeric value in range 3–131070 only.
    // Our 18-digit value FAR exceeds max (131070) → NOT directly supported.
    // We use last 6 digits truncated to fit: still may exceed range.
    // You should map your variant ID to a pharmacode-range number separately.
    case "pharmacode1": {
      const pharma1Max = 131070;
      // Take last 6 digits, cap at max
      const pharma1Raw = parseInt(value.slice(-6), 10);
      const pharma1Data = String(Math.min(pharma1Raw, pharma1Max));
      return {
        type,
        data: pharma1Data,
        url: buildTecItUrl("Pharmacode", pharma1Data),
        notes:
          `⚠️ Range 3–131070 only. Full 18-digit value exceeds max. ` +
          `Using last-6-digits capped to ${pharma1Max}: "${pharma1Data}". ` +
          `In production, map your product to a dedicated pharmacode number.`,
        supported: false, // full value not encodable
      };
    }

    // ── Pharmacode Two-Track ──────────────────────────────────────────────────
    // Numeric value in range 4–64570080 only.
    // Our 18-digit value exceeds max → truncate similarly.
    case "pharmacode2": {
      const pharma2Max = 64570080;
      const pharma2Raw = parseInt(value.slice(-8), 10);
      const pharma2Data = String(Math.min(pharma2Raw, pharma2Max));
      return {
        type,
        data: pharma2Data,
        url: buildTecItUrl("Pharmacode2", pharma2Data),
        notes:
          `⚠️ Range 4–64570080 only. Full 18-digit value exceeds max. ` +
          `Using last-8-digits capped to ${pharma2Max}: "${pharma2Data}". ` +
          `In production, assign a dedicated pharmacode number per product.`,
        supported: false, // full value not encodable
      };
    }

    // ── Telepen Alpha ─────────────────────────────────────────────────────────
    // Full ASCII support. Originally used in UK libraries.
    // Our numeric value → fully supported.
    case "telepen":
      return {
        type,
        data: value,
        url: buildTecItUrl("TelepenAlpha", value),
        notes:
          "Full ASCII. Numeric mode auto-selected for digit-only data (double density).",
        supported: true,
      };

    // ── Unknown type ──────────────────────────────────────────────────────────
    default:
      throw new Error(
        `Unknown barcode type: "${type}". ` +
          `Valid types: code128 | code11 | itf | code39 | code39ext | code93 | ` +
          `flattermarken | gs1128 | msi | pharmacode1 | pharmacode2 | telepen`,
      );
  }
}

// ─── ALL TYPES LIST (for iterating / rendering all at once) ──────────────────

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
  "pharmacode1",
  "pharmacode2",
  "telepen",
];

// ─── USAGE EXAMPLES ───────────────────────────────────────────────────────────
//
// Single:
//   const config = getBarcodeConfig("code128");
//   console.log(config.url);
//   // → https://barcode.tec-it.com/barcode.ashx?data=964458753190440359&code=Code128
//
// In JSX (render barcode image):
//   <img src={getBarcodeConfig("code39").url} alt="Code-39 barcode" />
//
// All types:
//   ALL_BARCODE_TYPES.forEach(type => {
//     const { type, url, notes, supported } = getBarcodeConfig(type);
//     console.log(`${type}: ${supported ? "✅" : "⚠️"} ${url}`);
//   });
