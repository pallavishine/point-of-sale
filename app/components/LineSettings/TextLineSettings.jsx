export const TextLineSettings = ({ line, onChange }) => (
    <s-stack  gap="base">
     
  
    
     <s-stack direction="inline" gap="base">
      <s-select
        label="Alignment"
        value={line.settings.align}
        onChange={(e) => onChange('settings.align', e.target.value)}
      >
        <s-option value="left">Left</s-option>
        <s-option value="center">Center</s-option>
        <s-option value="right">Right</s-option>
      </s-select>
  
      <s-text-field
        label="Font Size"
        type="number"
        value={line.settings.fontSize}
        onChange={(e) => onChange('settings.fontSize', parseInt(e.target.value))}
      />
  
      <s-color-field
        label="Text Color"
        value={line.settings.color}
        onChange={(color) => onChange('settings.color', color)}
      />
  </s-stack>
      <s-divider />
      <s-heading level={5}>Margins</s-heading>
      <s-grid gridTemplateColumns="repeat(4, 4fr)" gap="small">
        {['top', 'bottom', 'left', 'right'].map((side) => (
          <s-text-field
            key={side}
            label={side.charAt(0).toUpperCase() + side.slice(1)}
            type="number"
            value={line.settings.margin?.[side] || 0}
            suffix="in"
            min="0"
            step="0.01"
            onChange={(e) =>
              onChange(`settings.margin.${side}`, parseFloat(e.target.value))
            }
          />
        ))}
      </s-grid>
    </s-stack>
  );