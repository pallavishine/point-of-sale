import React from "react";
import {
  Page,
  Document,
  StyleSheet,
  View,
  Text,
  Image,
} from "@react-pdf/renderer";
import { getBarcodeConfig } from "../utils/barcodeGenerator";

const DEFAULT_DIMENSION = { paperW: 8.5, paperH: 11, cols: 3, rows: 10 };

const styles = StyleSheet.create({
  page: {
    backgroundColor: "white",
    padding: 0,
  },
  labelInner: {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    padding: 8,
    gap: 4,              // ← uniform gap between every section
  },

  // ── Store (line-1) ──────────────────────────────────────────────────────────
  storeSection: {
    textAlign: "center",
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    borderBottomStyle: "solid",
  },
  storeName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: "#1a1a1a",
    textAlign: "center",
  },

  // ── Product Title (line-2) ──────────────────────────────────────────────────
  productTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 3,
  },
  productTitleText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#000",
    textTransform: "uppercase",
    lineHeight: 1,
  },
  separator: {
    fontSize: 7,
    color: "#000",
    fontFamily: "Helvetica-Bold",
  },

  // ── Price (line-3) ──────────────────────────────────────────────────────────
  priceSection: {
    backgroundColor: "#f8f8f8",
    padding: 4,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: "#2e7d32",
    borderLeftStyle: "solid",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#2e7d32",
    lineHeight: 1,
  },
  comparePrice: {
    fontSize: 7,
    fontFamily: "Helvetica",
    color: "#888",
    textDecoration: "line-through",
  },
  qtyText: {
    fontSize: 7,
    fontFamily: "Helvetica",
    color: "#666",
  },

  // ── Barcode Section (barcodeLines) ─────────────────────────────────────────
  barcodeSection: {
    alignItems: "center",
    flexDirection: "column",
    gap: 3,
  },
  barcodeRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    height: 40,           // ← reduced from 60 so it doesn't crowd other sections
  },
  barcodeImage: {
    height: 40,
    width: 120,
    objectFit: "contain",
  },
  barcodeValueText: {
    fontFamily: "Courier",
    fontSize: 7,
    letterSpacing: 2,
    color: "#000",
    textAlign: "center",
  },
  skuText: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    textAlign: "center",
  },
  productUrlText: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    textAlign: "center",
  },

  // ── QR Code ────────────────────────────────────────────────────────────────
  qrWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 36,
    paddingVertical: 3,
  },
  qrImage: {
    width: 36,
    height: 36,
    objectFit: "contain",
  },

  // ── Metadata ───────────────────────────────────────────────────────────────
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  metadataText: {
    fontFamily: "Courier",
    fontSize: 6,
    color: "#444",
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  // ← No longer absolute — flows naturally at the bottom of labelInner
  footer: {
    marginTop: "auto",    // ← pushes footer to bottom of the flex column
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    borderTopStyle: "solid",
    paddingTop: 2,
  },
  footerText: {
    fontSize: 5,
    fontFamily: "Helvetica",
    color: "#999",
  },
});

// ── BarcodeView ───────────────────────────────────────────────────────────────
const BarcodeView = ({ field, variantData }) => {
  const barcode = variantData?.barcode || 97226253197440351;
  const config = getBarcodeConfig("code128", barcode);

  return (
    <View style={styles.barcodeRow}>
      <Image
        src={`https://barcode.tec-it.com/barcode.ashx?data=${barcode}&code=${config.type}&dpi=96&imagetype=png`}
        style={styles.barcodeImage}
      />
    </View>
  );
};

// ── QRCodeView ────────────────────────────────────────────────────────────────
const QRCodeView = ({ field, variantData }) => {
  const barcode = variantData?.barcode || 97226253197440351;
  const size = Number(field?.size) || 40;

  return (
    <View style={styles.qrWrapper}>
      <Image
        src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcode)}&code=QRCode&dpi=200&bcolor=%23ffffff&errorcorrection=M`}
        style={{ width: size, height: size, objectFit: "contain" }}
        cache={false}
      />
    </View>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const LabelPDF = ({
  shop,
  lines,
  quantity,
  dimension,
  testPrint,
  variant,
  selectedTemplate,
}) => {
  const currentDimension = testPrint
    ? dimension || DEFAULT_DIMENSION
    : selectedTemplate?.dimension || DEFAULT_DIMENSION;

  const currentLines = testPrint
    ? lines || []
    : (selectedTemplate?.lines || [])
        .filter((line) => line.enabled && line.fields?.some((f) => f.enabled))
        .map((line) => ({
          ...line,
          fields: line.fields.filter((f) => f.enabled),
        }));

  const cols = currentDimension.cols || 3;
  const rows = currentDimension.rows || 10;
  const pageW = (currentDimension.paperW || 8.5) * 72;
  const pageH = (currentDimension.paperH || 11) * 72;
  const PAGE_PAD = 18;
  const labelW = (pageW - PAGE_PAD * 2) / cols;
  const labelH = (pageH - PAGE_PAD * 2) / rows;

  const labelsPerPage = cols * rows;
  const totalQuantity = testPrint
    ? quantity || 0
    : Array.isArray(variant)
      ? variant.reduce((sum, v) => sum + (Number(v.label_quantity) || 0), 0)
      : 0;
  const numberOfSheets =
    labelsPerPage > 0 ? Math.ceil(totalQuantity / labelsPerPage) : 0;

  const getFieldValue = (field, variantData) => {
    if (
      !testPrint &&
      variantData &&
      field.id &&
      Object.prototype.hasOwnProperty.call(variantData, field.id)
    ) {
      return String(variantData[field.id] ?? "");
    }
    return field.default != null ? String(field.default) : "";
  };

  const getVariantForLabel = (globalIndex) => {
    if (testPrint || !Array.isArray(variant)) return null;
    let accumulated = 0;
    for (const v of variant) {
      const qty = Number(v.label_quantity) || 0;
      if (globalIndex < accumulated + qty) return v;
      accumulated += qty;
    }
    return null;
  };

  const renderLine = (line, idx, variantData) => {
    const fields = line.fields || [];
    if (!fields.length) return null;

    switch (line.id) {
      // ── Store name ──────────────────────────────────────────────────────────
      case "line-1":
        return (
          <View key={idx} style={styles.storeSection}>
            <Text style={styles.storeName}>{shop?.split(".")[0]}</Text>
          </View>
        );

      // ── Product title ───────────────────────────────────────────────────────
      case "line-2":
        return (
          <View key={idx} style={styles.productTitleRow}>
            {fields.map((field, i) => (
              <Text key={field.id} style={styles.productTitleText}>
                {i === 1 && <Text style={styles.separator}> - </Text>}
                {getFieldValue(field, variantData)}
              </Text>
            ))}
          </View>
        );

      // ── Price ───────────────────────────────────────────────────────────────
      case "line-3":
        return (
          <View key={idx} style={styles.priceSection}>
            {fields.map((field, i) => {
              if (field.id === "price")
                return (
                  <Text key={i} style={styles.price}>
                    {"MRP "}
                    {getFieldValue(field, variantData)}
                  </Text>
                );
              if (field.id === "compareAtPrice")
                return (
                  <Text key={i} style={styles.comparePrice}>
                    {getFieldValue(field, variantData)}
                  </Text>
                );
              if (field.id === "inventoryQuantity")
                return (
                  <Text key={i} style={styles.qtyText}>
                    {"QTY: "}
                    {!testPrint && variantData
                      ? String(variantData.label_quantity)
                      : getFieldValue(field, variantData)}
                  </Text>
                );
              return null;
            })}
          </View>
        );

      // ── Barcode block ───────────────────────────────────────────────────────
      case "barcodeLines":
        return (
          <View key={idx} style={styles.barcodeSection}>
            {fields.map((field, i) => {
              if (field.id === "barcodeLines")
                return (
                  <BarcodeView key={i} field={field} variantData={variantData} />
                );
              if (field.id === "barcode")
                return (
                  <Text key={i} style={styles.barcodeValueText}>
                    {getFieldValue(field, variantData)}
                  </Text>
                );
              if (field.id === "qrcode")
                return (
                  <QRCodeView key={i} field={field} variantData={variantData} />
                );
              if (field.id === "productUrl")
                return (
                  <Text key={i} style={styles.productUrlText}>
                    {getFieldValue(field, variantData)}
                  </Text>
                );
              if (field.id === "sku")
                return (
                  <Text key={i} style={styles.skuText}>
                    {getFieldValue(field, variantData)}
                  </Text>
                );
              return null;
            })}
          </View>
        );

      // ── Metadata ────────────────────────────────────────────────────────────
      case "metadata":
        return (
          <View key={idx} style={styles.metadataRow}>
            {fields.map((field, i) => (
              <Text key={i} style={styles.metadataText}>
                {getFieldValue(field, variantData)}
              </Text>
            ))}
          </View>
        );

      // ── Footer ──────────────────────────────────────────────────────────────
      case "footer":
        return (
          <View key={idx} style={styles.footer}>
            {fields.map((field, i) => (
              <Text key={i} style={styles.footerText}>
                {getFieldValue(field, variantData)}
              </Text>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  const renderLabelContent = (variantData) => (
    <View style={styles.labelInner}>
      {currentLines.map((line, idx) => renderLine(line, idx, variantData))}
    </View>
  );

  return (
    <Document>
      {Array.from({ length: numberOfSheets }).map((_, sheetIndex) => {
        const startIndex = sheetIndex * labelsPerPage;
        const labelsOnThisSheet = Math.min(
          labelsPerPage,
          totalQuantity - startIndex,
        );

        return (
          <Page
            key={sheetIndex}
            size={{ width: pageW, height: pageH }}
            style={styles.page}
          >
            {Array.from({ length: labelsOnThisSheet }).map((_, labelIndex) => {
              const globalIndex = startIndex + labelIndex;
              const variantData = !testPrint
                ? getVariantForLabel(globalIndex)
                : null;
              const col = labelIndex % cols;
              const row = Math.floor(labelIndex / cols);

              return (
                <View
                  key={labelIndex}
                  style={{
                    position: "absolute",
                    left: PAGE_PAD + col * labelW,
                    top: PAGE_PAD + row * labelH,
                    width: labelW,
                    height: labelH,
                  }}
                >
                  {renderLabelContent(variantData)}
                </View>
              );
            })}
          </Page>
        );
      })}
    </Document>
  );
};

export default LabelPDF;