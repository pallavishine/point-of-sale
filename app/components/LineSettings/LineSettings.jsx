import { TextLineSettings } from "./TextLineSettings";
import { BarcodeSettings } from "./BarcodeSettings";

export const LineSettings = ({ line, updateLineSettings }) => {
  if (!line) return null;

  const handleChange = (key, value) => {
    console.log(key, value);
    updateLineSettings({
      ...line,
      settings: { ...line.settings, [key]: value },
    });
  };
  const BarcodeSettings = () => (
    <s-stack vertical gap="base">
      <s-heading level={4}>Barcode Settings</s-heading>

      <s-select
        label="Format"
        value={line.settings.format}
        onChange={(e) => handleChange("format", e.target.value)}
      >
        <s-option value="code128">Code 128</s-option>
        <s-option value="ean13">EAN-13</s-option>
        <s-option value="upc">UPC</s-option>
      </s-select>

      <s-checkbox
        label="Hide barcode value"
        checked={!line.settings.showValue}
        onChange={(e) => handleChange("showValue", !e.target.checked)}
        onInput={(e) => handleChange("showValue", !e.target.checked)}
      />

      <s-color-field
        label="Symbol Color"
        value={line.settings.color}
        onChange={(color) => handleChange("color", color)}
        onInput={(color) => handleChange("color", color)}
      />

      <s-number-field
        label="Font Size"
        value={line.settings.fontSize}
        onChange={(e) => handleChange("fontSize", parseInt(e.target.value))}
        onInput={(e) => handleChange("fontSize", parseInt(e.target.value))}
      />
    </s-stack>
  );
  const TextLineSettings = () => (
    <s-stack gap="base">
      <s-stack direction="inline" gap="base">
        <s-select
          label="Alignment"
          value={line.settings.align}
          onChange={(e) => handleChange("align", e.target.value)}
        >
          <s-option value="left">Left</s-option>
          <s-option value="center">Center</s-option>
          <s-option value="right">Right</s-option>
        </s-select>

        <s-number-field
          label="Font Size"
          value={line.settings.fontSize}
          onChange={(e) => handleChange("fontSize", parseInt(e.target.value))}
          onInput={(e) => handleChange("fontSize", parseInt(e.target.value))}
        />

        <s-color-field
          label="Text Color"
          value={line.settings.color}
          onChange={(e) => handleChange("color", e.target.value)}
          onInput={(e) => handleChange("color", e.target.value)}
        />
      </s-stack>
      <s-divider />
      <s-heading level={5}>Margins</s-heading>
      <s-grid gridTemplateColumns="repeat(4, 4fr)" gap="small">
        {["Top", "Bottom", "Left", "Right"].map((side) => (
          <s-number-field
            key={side}
            label={side.charAt(0).toUpperCase() + side.slice(1)}
            value={line.settings?.[`margin${side}`] || 0}
            suffix="in"
            min="0"
            step="1"
            onChange={(e) =>
              handleChange(`margin${side}`, parseFloat(e.target.value))
            }
            onInput={(e) =>
              handleChange(`margin${side}`, parseFloat(e.target.value))
            }
          />
        ))}
      </s-grid>
    </s-stack>
  );
  return line.type === "barcode" ? <BarcodeSettings /> : <TextLineSettings />;
};
