// @ts-ignore
export default function FieldRenderer({ field, value, onChange }) {
  // @ts-ignore
  const handleChange = (event) => {
    const target = event.currentTarget;
    let val;
    if (field.fieldType === "switch") {
      val = target.checked;
    } else {
      val = target.value;
    }
    onChange(field.id, val);
  };

  switch (field.fieldType) {
    case "text":
      return (
        <s-text-field
          label={field.label}
          value={value || ""}
          onChange={handleChange}
          onInput={handleChange}
          required={field?.required}
        />
      );

    case "textarea":
      return (
        <s-text-area
          label={field.label}
          value={value || ""}
          onChange={handleChange}
          onInput={handleChange}
          required={field?.required}
        />
      );

    case "number":
      return (
        <s-number-field
          label={field.label}
          value={value || ""}
          onChange={handleChange}
          onInput={handleChange}
          required={field?.required}
        />
      );

    case "checkbox":
      return (
        <>
          <s-text>{field.label}</s-text>
          <s-choice-list
            multiple
            values={value ?? []}
            onChange={(event) => {
              const selected = event.currentTarget.values;
              onChange(field.id, selected);
            }}
          >
            {field.options?.map(
              (
                // @ts-ignore
                opt,
              ) => (
                <s-choice key={opt.name} value={opt.name}>
                  {opt.name}
                </s-choice>
              ),
            )}
          </s-choice-list>
        </>
      );

    case "switch":
      return (
        // @ts-ignore
        <s-switch
          label={field.label}
          checked={value || false}
          onChange={handleChange}
          onInput={handleChange}
        />
      );

    case "radio":
      return (
        <>
          <s-text>{field.label}</s-text>
          <s-choice-list
            values={value ? [value] : []}
            onChange={(event) => {
              // @ts-ignore
              const selected = event.currentTarget.values[0];
              onChange(field.id, selected);
            }}
          >
            {field.options?.map(
              (
                // @ts-ignore
                opt,
              ) => (
                <s-choice key={opt.name} value={opt.name}>
                  {opt.name}
                </s-choice>
              ),
            )}
          </s-choice-list>
        </>
      );

    case "button":
      return (
        <>
          <s-text>{field.label}</s-text>
          <s-stack direction="inline" gap="small">
            {field.options?.map(
              (
                // @ts-ignore
                opt,
              ) => (
                <s-button
                  key={opt.name}
                  variant={opt.name === value ? "primary" : "secondary"}
                  onClick={() => onChange(field.id, opt.name)}
                >
                  {opt.name}
                </s-button>
              ),
            )}
          </s-stack>
        </>
      );

    case "image_swatch":
      return (
        <s-box paddingBlock="small">
          <s-stack gap="small">
            <s-text>{field.label}</s-text>

            <s-stack direction="inline" gap="small">
              {field.options?.map(
                (
                  // @ts-ignore
                  opt,
                ) => {
                  const isSelected = value === opt.name;

                  return (
                    <s-clickable
                      key={opt.name}
                      onClick={() => onChange(field.id, opt.name)}
                    >
                      <s-stack alignContent="center" alignItems="center">
                        <s-box
                          blockSize="100px"
                          inlineSize="100px"
                          maxBlockSize="100px"
                          maxInlineSize="100px"
                          minBlockSize="100px"
                          minInlineSize="100px"
                        >
                          <s-image
                            src={opt.imageUrl}
                            inlineSize="fill"
                            objectFit="cover" // or "contain" if you don't want cropping
                          />

                          {isSelected && <s-badge tone="success">✓</s-badge>}
                        </s-box>
                      </s-stack>
                    </s-clickable>
                  );
                },
              )}
            </s-stack>
          </s-stack>
        </s-box>
      );

    case "dateField":
      return (
        <s-date-field
          label={field.label}
          value={value || ""}
          onChange={handleChange}
          onInput={handleChange}
        />
      );
    default:
      return <s-text>Unsupported field type</s-text>;
  }
}
