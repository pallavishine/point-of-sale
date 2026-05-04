import { useState } from "react";

export default function ColorSwatchEditor({ field, setField }) {

  const updateOption = (id, key, value) =>
    setField((f) => ({
      ...f,
      options: f.options.map((o) => (o.id === id ? { ...o, [key]: value } : o)),
    }));

  const addOption = () => {
    setField((f) => ({
      ...f,
      options: [
        ...f.options,
        {
          id: crypto.randomUUID(),
          name: `color_${f.options.length + 1}`,
          color: "#000000",
          addonPrice: 0,
        },
      ],
    }));
  };

  return (
    <s-box border="base" padding="base" borderRadius="base">
      <s-stack gap="small-200">
        <s-heading>Color Swatch Options</s-heading>
        <s-text tone="subdued" size="small">
          Define color options with names and color values
        </s-text>

        {field.options.map((opt, idx) => (
          <s-box key={opt.id} border="base" padding="small-100">
            <s-grid
              gridTemplateColumns="repeat(12, 1fr)"
              gap="base"
              alignItems="center"
            >
              <s-grid-item gridColumn="span 4">
                <s-text-field
                  label="Option Name"
                  value={opt.name}
                  onInput={(e) => updateOption(opt.id, "name", e.target.value)}
                />
              </s-grid-item>
              <s-grid-item gridColumn="span 3">
                <s-stack gap="small">
                  <s-color-field
                    label="Color Value"
                    defaultValue="#000000"
                    name="color"
                    value={opt.color}
                    onChange={(e) =>
                      updateOption(opt.id, "color", e.target.value)
                    }
                  ></s-color-field>
                </s-stack>
              </s-grid-item>
              <s-grid-item gridColumn="span 4">
                <s-number-field
                  label="Add On Price"
                  value={opt.addonPrice ?? 0}
                  onChange={(e) =>
                    updateOption(opt.id, "addonPrice", Number(e.target.value))
                  }
                />
              </s-grid-item>
              <s-grid-item gridColumn="span 1">
                {field.options.length > 1 && (
                  <s-button
                    tone="critical"
                    variant="tertiary"
                    icon="delete"
                    accessibilityLabel="icon"
                    onClick={() =>
                      setField((f) => ({
                        ...f,
                        options: f.options.filter((o) => o.id !== opt.id),
                      }))
                    }
                  />
                )}
              </s-grid-item>
            </s-grid>
          </s-box>
        ))}

        <s-button variant="secondary" onClick={addOption}>
          + Add Color Option
        </s-button>
      </s-stack>
    </s-box>
  );
}
