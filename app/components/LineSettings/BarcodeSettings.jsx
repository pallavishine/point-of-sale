export const BarcodeSettings = ({ line, onChange }) => (
    <s-stack vertical gap="base">
      <s-heading level={4}>Barcode Settings</s-heading>
  
      <s-select
        label="Format"
        value={line.settings.format}
        onChange={(e) => onChange('settings.format', e.target.value)}
      >
        <s-option value="code128">Code 128</s-option>
        <s-option value="ean13">EAN-13</s-option>
        <s-option value="upc">UPC</s-option>
      </s-select>
  
      <s-checkbox
        label="Hide barcode value"
        checked={!line.settings.showValue}
        onChange={(e) => onChange('settings.showValue', !e.target.checked)}
      />
  
      <s-color-field
        label="Symbol Color"
        value={line.settings.color}
        onChange={(color) => onChange('settings.color', color)}
      />
  
      <s-text-field
        label="Font Size"
        type="number"
        value={line.settings.fontSize}
        onChange={(e) => onChange('settings.fontSize', parseInt(e.target.value))}
      />
    </s-stack>
  );