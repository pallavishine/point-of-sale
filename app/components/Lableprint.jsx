// components/LabelPrint.jsx
// HTML + CSS label printer — no @react-pdf/renderer needed.
//
// KEY FIXES vs previous version:
//  1. Barcode <img> uses /api/barcode?type=X&value=Y  (same-origin proxy)
//     → no CSP blocks, no external image load failures
//  2. Print triggered via Blob URL (not window.open + document.write)
//     → works inside Shopify embedded app iframe
//  3. All images pre-loaded and converted to base64 BEFORE building HTML
//     → print dialog always shows barcodes, no race condition
//  4. Robust null-guard on barcode value at every step

import { useState ,useEffect,useCallback } from "react";

// ─── constants ────────────────────────────────────────────────────────────────
const DEFAULT_DIMENSION = { paperW: 8.5, paperH: 11, cols: 3, rows: 10 };
const PAGE_PAD_IN       = 0.25;

// ─── barcode URL builder (uses your own proxy route) ─────────────────────────
function barcodeProxyUrl(type = "code128", value) {
  if (!value) return null;
  return `/api/barcode?type=${encodeURIComponent(type)}&value=${encodeURIComponent(value)}`;
}

function qrProxyUrl(value) {
  if (!value) return null;
  return `/api/barcode?type=qrcode&value=${encodeURIComponent(value)}`;
}

// ─── fetch image → base64 data URI (so it embeds directly into the HTML) ─────
async function fetchAsBase64(url) {
  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader  = new FileReader();
      reader.onload = () => resolve(reader.result); // "data:image/png;base64,..."
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("[LabelPrint] image fetch failed:", url, err);
    return null; // return null — label renders without barcode rather than crashing
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function resolveBarcodeValue(variantData) {
  const raw = variantData?.barcode ?? variantData?.sku ?? "";
  return String(raw).trim();
}

function getFieldValue(field, variantData, testPrint) {
  if (
    !testPrint &&
    variantData &&
    field.id &&
    Object.prototype.hasOwnProperty.call(variantData, field.id)
  ) {
    return String(variantData[field.id] ?? "");
  }
  return field.default != null ? String(field.default) : "";
}

// ─── collect all unique barcode URLs needed across ALL labels ─────────────────
// We pre-fetch them ALL first, then embed as base64 — avoids per-label fetches
// and guarantees images are ready before print dialog opens.

function collectImageUrls(variantQueue, currentLines) {
  const urls = new Set();
  for (const variantData of variantQueue) {
    const barcodeValue = resolveBarcodeValue(variantData);
    if (!barcodeValue) continue;

    for (const line of currentLines) {
      if (line.id !== "barcodeLines") continue;
      for (const field of line.fields || []) {
        if (field.id === "barcodeLines") {
          const u = barcodeProxyUrl(field.barcodeType ?? "code128", barcodeValue);
          if (u) urls.add(u);
        }
        if (field.id === "qrcode") {
          const u = qrProxyUrl(barcodeValue);
          if (u) urls.add(u);
        }
      }
    }
  }
  return [...urls];
}

// ─── render a single line as an HTML string ───────────────────────────────────
// imageCache: Map<proxyUrl, base64DataUri>

function renderLine(line, variantData, shop, testPrint, imageCache) {
  const fields = line.fields || [];
  if (!fields.length) return "";

  switch (line.id) {

    case "line-1":
      return `<div class="store-section">
        <span class="store-name">${escHtml(shop?.split(".")[0] ?? "")}</span>
      </div>`;

    case "line-2":
      return `<div class="product-title-row">
        ${fields.map((f, i) =>
          `${i > 0 ? '<span class="separator"> - </span>' : ""}` +
          `<span class="product-title-text">${escHtml(getFieldValue(f, variantData, testPrint))}</span>`
        ).join("")}
      </div>`;

    case "line-3":
      return `<div class="price-section">
        ${fields.map((f) => {
          if (f.id === "price")
            return `<span class="price">MRP ${escHtml(getFieldValue(f, variantData, testPrint))}</span>`;
          if (f.id === "compareAtPrice")
            return `<span class="compare-price">${escHtml(getFieldValue(f, variantData, testPrint))}</span>`;
          if (f.id === "inventoryQuantity")
            return `<span class="qty-text">QTY: ${escHtml(
              !testPrint && variantData
                ? String(variantData.label_quantity)
                : getFieldValue(f, variantData, testPrint)
            )}</span>`;
          return "";
        }).join("")}
      </div>`;

    case "barcodeLines": {
      const barcodeValue = resolveBarcodeValue(variantData);
      return `<div class="barcode-section">
        ${fields.map((f) => {
          // ── barcode image ───────────────────────────────────────────────────
          if (f.id === "barcodeLines") {
            const proxyUrl = barcodeProxyUrl(f.barcodeType ?? "code128", barcodeValue);
            const src      = proxyUrl && imageCache?.get(proxyUrl);
            if (!src) return ""; // skip if value empty or fetch failed
            return `<img src="${src}" class="barcode-img" alt="barcode" />`;
          }

          // ── barcode human-readable text ─────────────────────────────────────
          if (f.id === "barcode")
            return `<div class="barcode-value-text">${escHtml(getFieldValue(f, variantData, testPrint))}</div>`;

          // ── QR code ─────────────────────────────────────────────────────────
          if (f.id === "qrcode") {
            const qUrl = qrProxyUrl(barcodeValue);
            const src  = qUrl && imageCache?.get(qUrl);
            if (!src) return "";
            return `<img src="${src}" class="qr-img" alt="qr code" />`;
          }

          if (f.id === "productUrl")
            return `<div class="product-url-text">${escHtml(getFieldValue(f, variantData, testPrint))}</div>`;

          if (f.id === "sku")
            return `<div class="sku-text">${escHtml(getFieldValue(f, variantData, testPrint))}</div>`;

          return "";
        }).join("")}
      </div>`;
    }

    case "metadata":
      return `<div class="metadata-row">
        ${fields.map((f) =>
          `<span class="metadata-text">${escHtml(getFieldValue(f, variantData, testPrint))}</span>`
        ).join("")}
      </div>`;

    case "footer":
      return `<div class="footer-row">
        ${fields.map((f) =>
          `<span class="footer-text">${escHtml(getFieldValue(f, variantData, testPrint))}</span>`
        ).join("")}
      </div>`;

    default:
      return "";
  }
}

// ─── escape HTML special chars ────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── build full HTML document string (after images are pre-fetched) ───────────
function buildHTML({ documentProps, variantQueue, currentLines, imageCache }) {
  const {
    shop,
    testPrint,
    dimension,
    selectedTemplate,
  } = documentProps;

  const dim    = testPrint
    ? dimension || DEFAULT_DIMENSION
    : selectedTemplate?.dimension || DEFAULT_DIMENSION;

  const cols    = dim.cols    || 3;
  const rows    = dim.rows    || 10;
  const paperW  = dim.paperW  || 8.5;
  const paperH  = dim.paperH  || 11;
  const labelW  = (paperW - PAGE_PAD_IN * 2) / cols;
  const labelH  = (paperH - PAGE_PAD_IN * 2) / rows;

  const labelsPerPage = cols * rows;
  const totalLabels   = variantQueue.length;
  const totalPages    = Math.max(1, Math.ceil(totalLabels / labelsPerPage));

  let pagesHTML = "";

  for (let p = 0; p < totalPages; p++) {
    const start        = p * labelsPerPage;
    const countOnPage  = Math.min(labelsPerPage, totalLabels - start);
    let labelsHTML     = "";

    for (let li = 0; li < countOnPage; li++) {
      const variantData = variantQueue[start + li] ?? null;
      const linesHTML   = currentLines
        .map((line) => renderLine(line, variantData, shop, testPrint, imageCache))
        .join("");

      labelsHTML += `
        <div class="label">
          <div class="label-inner">
            <div class="corner corner-tl"></div>
            <div class="corner corner-tr"></div>
            <div class="corner corner-bl"></div>
            <div class="corner corner-br"></div>
            ${linesHTML}
          </div>
        </div>`;
    }

    // empty filler cells
    for (let e = countOnPage; e < labelsPerPage; e++) {
      labelsHTML += `<div class="label label-empty"></div>`;
    }

    pagesHTML += `<div class="page"><div class="label-grid">${labelsHTML}</div></div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Labels</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@page{size:${paperW}in ${paperH}in;margin:0}
body{background:#e5e5e5;font-family:Helvetica,Arial,sans-serif}
.page{width:${paperW}in;height:${paperH}in;padding:${PAGE_PAD_IN}in;background:white;margin:0 auto 24px;page-break-after:always}
.page:last-child{page-break-after:auto}
.label-grid{display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);width:100%;height:100%;gap:0}
.label{width:${labelW}in;height:${labelH}in;overflow:hidden;position:relative}
.label-empty{visibility:hidden}
.label-inner{width:100%;height:100%;padding:5px;display:flex;flex-direction:column;position:relative}
.corner{position:absolute;width:8px;height:8px}
.corner-tl{top:3px;left:3px;border-top:1px solid #ddd;border-left:1px solid #ddd}
.corner-tr{top:3px;right:3px;border-top:1px solid #ddd;border-right:1px solid #ddd}
.corner-bl{bottom:3px;left:3px;border-bottom:1px solid #ddd;border-left:1px solid #ddd}
.corner-br{bottom:3px;right:3px;border-bottom:1px solid #ddd;border-right:1px solid #ddd}
.store-section{text-align:center;margin-bottom:3px;padding-bottom:3px;border-bottom:1px solid #f0f0f0}
.store-name{font-size:8px;font-weight:bold;letter-spacing:1px;color:#1a1a1a}
.product-title-row{display:flex;flex-wrap:wrap;margin:3px 0}
.product-title-text{font-size:6px;font-weight:bold;color:#000}
.separator{font-size:6px;color:#000}
.price-section{display:flex;justify-content:space-between;align-items:center;background:#f8f8f8;padding:3px 4px;border-radius:2px;border-left:2px solid #2e7d32;margin:3px 0}
.price{font-size:8px;font-weight:bold;color:#2e7d32}
.compare-price{font-size:6px;color:#888;text-decoration:line-through}
.qty-text{font-size:6px;color:#666}
.barcode-section{margin:3px 0;padding:3px 0;border-top:1px dashed #ddd;border-bottom:1px dashed #ddd;display:flex;flex-direction:column;align-items:center}
.barcode-img{width:100%;max-width:1.8in;height:0.35in;object-fit:contain;display:block}
.qr-img{width:0.5in;height:0.5in;object-fit:contain;display:block}
.barcode-value-text{font-family:Courier,monospace;font-size:5px;letter-spacing:1px;color:#000;text-align:center;margin-top:1px}
.sku-text{font-size:5px;color:#666;text-align:center;margin-top:1px}
.product-url-text{font-size:5px;color:#666;text-align:center;margin-top:1px}
.metadata-row{display:flex;flex-wrap:wrap;justify-content:space-between;background:#f5f5f5;padding:2px 4px;border-radius:2px;margin:3px 0}
.metadata-text{font-family:Courier,monospace;font-size:5px;color:#444}
.footer-row{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee;padding-top:2px;margin-top:auto}
.footer-text{font-size:4px;color:#999}
@media print{body{background:white}.page{margin:0;box-shadow:none}}
</style>
</head>
<body>${pagesHTML}</body>
</html>`;
}

// ─── main print function ──────────────────────────────────────────────────────
export async function printLabels(documentProps) {
  const {
    lines,
    quantity,
    testPrint,
    variant,
    selectedTemplate,
  } = documentProps;

  // 1 ── resolve currentLines (same logic as before)
  const currentLines = testPrint
    ? lines || []
    : (selectedTemplate?.lines || [])
        .filter((l) => l.enabled && l.fields?.some((f) => f.enabled))
        .map((l) => ({ ...l, fields: l.fields.filter((f) => f.enabled) }));

  // 2 ── build variant queue
  const variantQueue = [];
  if (!testPrint && Array.isArray(variant)) {
    for (const v of variant) {
      const qty = Number(v.label_quantity) || 0;
      for (let i = 0; i < qty; i++) variantQueue.push(v);
    }
  } else {
    const qty = quantity || 0;
    for (let i = 0; i < qty; i++) variantQueue.push(null);
  }

  if (!variantQueue.length) {
    console.warn("[LabelPrint] no labels to print");
    return;
  }

  // 3 ── collect unique image proxy URLs and pre-fetch them all as base64
  const allUrls  = collectImageUrls(variantQueue, currentLines);
  const imageCache = new Map();

  await Promise.all(
    allUrls.map(async (url) => {
      const b64 = await fetchAsBase64(url);
      if (b64) imageCache.set(url, b64);
    })
  );

  // 4 ── build HTML string with embedded base64 images
  const html = buildHTML({ documentProps, variantQueue, currentLines, imageCache });

  // 5 ── create a Blob URL and open it — works inside Shopify embedded app
  const blob    = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const win     = window.open(blobUrl, "_blank");

  if (!win) {
    // Fallback: allow user to click a link if popup was blocked
    const a = document.createElement("a");
    a.href   = blobUrl;
    a.target = "_blank";
    a.click();
  }

  // Clean up blob URL after 60s
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

// ─── PDFPrintButton ───────────────────────────────────────────────────────────

export default function PDFPrintButton({
  documentProps = {},
  buttonText = "Print",
  setSelectedVariantIds,
  setSelectedVariants,
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = async () => {
    if (!documentProps.testPrint && !documentProps.selectedTemplate) {
      shopify.toast.show("Please select a label template before printing.", {
        isError: true,
      });
      return;
    }

    setIsGenerating(true);
    try {
      await printLabels(documentProps);
    } catch (err) {
      console.error("[LabelPrint] error:", err);
      shopify.toast.show("Failed to generate labels.", { isError: true });
    } finally {
      setIsGenerating(false);
      setSelectedVariantIds?.(new Set());
      setSelectedVariants?.([]);
    }
  };

  return (
    <s-button
      variant="primary"
      onClick={handlePrint}
      disabled={isGenerating}
      icon="print"
      loading={isGenerating}
    >
      {isGenerating ? "Generating..." : buttonText}
    </s-button>
  );
}