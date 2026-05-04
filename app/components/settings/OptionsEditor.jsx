export default function OptionsEditor({ field, setField }) {
  const updateOption = (id, key, value) =>
    setField((f) => ({
      ...f,
      options: f.options.map((o) => (o.id === id ? { ...o, [key]: value } : o)),
    }));

  return (
    <s-box border="base" padding="base">
      <s-stack gap="small-200">
        <s-heading>Options</s-heading>
        {field.options.map((opt, idx) => (
          <s-box key={opt.id} border="base" padding="small-100">
            <s-grid
              gridTemplateColumns="repeat(12, 1fr)"
              gap="base"
              alignItems="center"
            >
              <s-grid-item gridColumn="span 6">
                <s-text-field
                  label="Option Name"
                  value={opt.name}
                  onInput={(e) => updateOption(opt.id, "name", e.target.value)}
                />
              </s-grid-item>
              <s-grid-item gridColumn="span 5">
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
        <s-button
          variant="secondary"
          onClick={() =>
            setField((f) => ({
              ...f,
              options: [
                ...f.options,
                {
                  id: crypto.randomUUID(),
                  name: `${field?.fieldType}_${field?.options?.length + 1}`,
                  addonPrice: 0,
                },
              ],
            }))
          }
        >
          + Add Option
        </s-button>
      </s-stack>
    </s-box>
  );
}
