import { LABEL_SIZE_PRESETS } from "../components/constants";

// ─────────────────────────────────────────────────────────────────────────────
// Core lookup
// ─────────────────────────────────────────────────────────────────────────────

export function getLabelSpec(brand, model) {
  if (!brand || !model) return null;
  const brandSpecs = LABEL_SIZE_PRESETS[brand];
  if (!brandSpecs) return null;
  return brandSpecs[model] ?? brandSpecs[String(model).toLowerCase()] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual field getters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "Label size: 2.63in × 1.00in"
 * For tape/continuous media labelH may be null → displayed as "∞"
 */
export function getLabelSize(brand, model) {
  const spec = getLabelSpec(brand, model);
  if (!spec) return "—";
  const w = spec.labelW != null ? `${spec.labelW.toFixed(2)}in` : "—";
  const h = spec.labelH != null ? `${spec.labelH.toFixed(2)}in` : "∞";
  return `${w} × ${h}`;
}

/**
 * "Paper size: 8.50in × 11.00in"
 * For roll/tape media the paper size equals the label size.
 */
export function getPaperSize(brand, model) {
  const spec = getLabelSpec(brand, model);
  if (!spec) return "—";
  if (spec.paperW == null || spec.paperH == null) return "—";
  return `${spec.paperW.toFixed(2)}in × ${spec.paperH.toFixed(2)}in`;
}

/**
 * "Paper type: sheet" | "roll" | "tape" | "continuous" | "custom"
 */
export function getPaperType(brand, model) {
  const spec = getLabelSpec(brand, model);
  if (!spec) return "—";
  return spec.type ?? "—";
}

/**
 * "Rows: 10  Columns: 3"
 * For roll/tape media always returns 1 × 1.
 * Returns null values for custom media.
 */

/**
 * Total labels per sheet / roll unit.
 * Returns null for custom / tape / continuous.
 */
export function getLabelsPerSheet(brand, model) {
  const spec = getLabelSpec(brand, model);
  if (!spec || spec.rows == null || spec.cols == null) return null;
  return spec.rows * spec.cols;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: get ALL display fields at once
// ─────────────────────────────────────────────────────────────────────────────

export function getPaperDisplayFields(brand, model) {
  const spec = getLabelSpec(brand, model);

  return {
    labelSize: getLabelSize(brand, model),
    paperSize: getPaperSize(brand, model),
    paperType: getPaperType(brand, model),
    rows: spec?.rows ?? "—",
    cols: spec?.cols ?? "—",
    raw: spec ?? null,
    labelsPerSheet: getLabelsPerSheet(brand, model),
    isCustom: spec?.type === "custom",
    isContinuous: spec?.type === "continuous" || spec?.type === "tape",
  };
}

  export const getselectedFieldsAsLines = (lines) => {
    return lines
      .filter((line) => line?.enabled && line?.fields?.some((f) => f.enabled))
      .map((line) => ({
        ...line,
        fields: line.fields
          .filter((f) => f.enabled)
          .sort((a, b) => (a.order || 0) - (b.order || 0)),
      }));
  };