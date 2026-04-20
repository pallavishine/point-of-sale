export default function FieldRenderer({ field, value, onChange }) {
  const handleChange = (event) => {
    const target = event.currentTarget;

    let val;

    // Handle different input types
    if ( field.fieldType === "switch") {
      val = target.checked;
    } else {
      val = target.value;
    }
    onChange(field.id, val);

  };

  switch (field.fieldType) {
    // ✅ TEXT
    case "text":
      return (
        <s-text-field
          label={field.label}
          value={value || ""}
          onChange={handleChange}
        />
      );

    // ✅ TEXTAREA
    case "textarea":
      return (
        <s-text-area
          label={field.label}
          value={value || ""}
          onChange={handleChange}
        />
      );

    // ✅ EMAIL
    case "email":
      return (
        <s-email-field
          label={field.label}
          value={value || ""}
          onChange={handleChange}
        />
      );

    // ✅ NUMBER
    case "number":
      return (
        <s-number-field
          label={field.label}
          value={value || ""}
          onChange={handleChange}
        />
      );

    // ✅ CHECKBOX
    case "checkbox":
      return (
         <>
        <s-text>{field.label}</s-text>
        <s-choice-list
          // label={field.label}
          multiple
          values={value ?? []}
          onChange={(event) => {
            const selected = event.currentTarget.values;
            onChange(field.id, selected);
          }}
        >
          {field.options?.map((opt) => (
            <s-choice key={opt.value} value={opt.value}>
              {opt.label}
            </s-choice>
          ))}
          </s-choice-list>
          </>
      );

    // ✅ SWITCH
    case "switch":
      return (
        // @ts-ignore
        <s-switch
          label={field.label}
          checked={value || false}
          onChange={handleChange}
        />
      );

    // ✅ RADIO
    case "radio":
      return (
        <s-choice-list
          // label={field.label}
          values={value ? [value] : []}
          onChange={(event) => {
            const selected = event.currentTarget.values[0];
            onChange(field.id, selected);
          }}
        >
          {field.options?.map((opt) => (
            <s-choice key={opt.value} value={opt.value}>
              {opt.label}
            </s-choice>
          ))}
        </s-choice-list>
      );

    // ✅ DATE FIELD
    case "dateField":
      return (
        <s-date-field
          label={field.label}
          value={value || ""}
          onChange={handleChange}
        />
      );

    // ✅ DATE PICKER (fallback)
    case "datePicker":
      return (
        <>
  <s-button command="--show" commandFor="date-picker">
    Select Time
  </s-button>
          <s-date-picker
            id="date-picker"
          // label={field.label}
          value={value || ""}
          onChange={handleChange}
          />
          </>
      );

    // ✅ TIME FIELD
    case "timeField":
      return (
        <s-time-field
          label={field.label}
          value={value || ""}
          onChange={handleChange}
        />
      );

    // ✅ TIME PICKER (fallback)
    case "timePicker":
      return (
        <>
  <s-button command="--show" commandFor="time-picker">
    Select Time
  </s-button>
        <s-time-picker
          id="time-picker"
          value={value || ""}
          onChange={handleChange}
        />
        </>
          );

    // ❌ DEFAULT
    default:
      return <s-text>Unsupported field type</s-text>;
  }
}

