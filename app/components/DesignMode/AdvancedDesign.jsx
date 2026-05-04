
export const AdvancedDesign = ({
  pageSize,
  settings,
  selectedFieldsAsLines,
  advancedElements,
  onAddElement,
}) => (
  <s-box padding="base">
    <s-grid columns={2} gap="large">
      <s-box>
        <s-heading level={3}>Elements</s-heading>
        <s-stack vertical gap="small" style={{ marginTop: '12px' }}>
          {['text', 'barcode', 'qrcode', 'price'].map((type) => (
            <s-button key={type} onClick={() => onAddElement(type)}>
              Add {type.charAt(0).toUpperCase() + type.slice(1)}
            </s-button>
          ))}
        </s-stack>
      </s-box>
    </s-grid>
  </s-box>
);