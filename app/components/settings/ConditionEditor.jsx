import { useState } from "react";

const CONDITION_OPERATORS = {
  text: [
    { label: "Is equal to", value: "EQUALS" },
    { label: "Is not equal to", value: "NOTEQUALS" },
    { label: "Contains", value: "CONTAIN" },
    { label: "Does not contain", value: "DOESNOTCONTAIN" },
  ],
  textarea: [
    { label: "Is equal to", value: "EQUALS" },
    { label: "Is not equal to", value: "NOTEQUALS" },
    { label: "Contains", value: "CONTAIN" },
    { label: "Does not contain", value: "DOESNOTCONTAIN" },
  ],
  number: [
    { label: "Is equal to", value: "EQUALS" },
    { label: "Is not equal to", value: "NOTEQUALS" },
    { label: "Is less than", value: "LESS" },
    { label: "Is greater than", value: "GREATER" },
  ],
  checkbox: [
    { label: "Is equal to", value: "EQUALS" },
    { label: "Is not equal to", value: "NOTEQUALS" },
  ],
  radio: [
    { label: "Is equal to", value: "EQUALS" },
    { label: "Is not equal to", value: "NOTEQUALS" },
  ],
  button: [
    { label: "Is equal to", value: "EQUALS" },
    { label: "Is not equal to", value: "NOTEQUALS" },
  ],
  color_swatch: [
    { label: "Is equal to", value: "EQUALS" },
    { label: "Is not equal to", value: "NOTEQUALS" },
  ],
  image_swatch: [
    { label: "Is equal to", value: "EQUALS" },
    { label: "Is not equal to", value: "NOTEQUALS" },
  ],
  switch: [
    { label: "Is On", value: "ON" },
    { label: "Is Off", value: "OFF" },
  ],
  dateField: [
    { label: "Is equal to", value: "EQUALS" },
    { label: "Is not equal to", value: "NOTEQUALS" },
  ],
};

const DISPLAY_OPTIONS = [
  { label: "Show", value: "SHOW" },
  { label: "Hide", value: "HIDE" },
];

const MATCH_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Any", value: "ANY" },
];

function emptyRule() {
  return {
    id: crypto.randomUUID(),
    fieldId: "none",
    operator: "EQUALS",
    value: "",
  };
}

function getOperatorsForField(fieldType) {
  return CONDITION_OPERATORS[fieldType] ?? CONDITION_OPERATORS.text;
}

export default function ConditionEditor({ field, setField, allPriorFields }) {
  const conditions = field.conditions ?? {
    hasCondition: false,
    display: "SHOW",
    match: "ALL",
    rules: [],
  };

  const update = (patch) =>
    setField((f) => ({
      ...f,
      conditions: { ...conditions, ...patch },
    }));

  const addRule = () => update({ rules: [...conditions.rules, emptyRule()] });

  const updateRule = (updated) =>
    update({
      rules: conditions.rules.map((r) => (r.id === updated.id ? updated : r)),
    });

  const deleteRule = (id) =>
    update({ rules: conditions.rules.filter((r) => r.id !== id) });

  const handleToggle = (e) => {
    const on = e.target?.checked ?? false;
    update({ hasCondition: on });
  };

  if (!allPriorFields?.length) {
    return (
      <>
      </>
    );
  }
  function RuleRow({ rule, index, allPriorFields, onUpdate, onDelete }) {
    const sourceField = allPriorFields.find((f) => f.id === rule.fieldId);
    const operators = sourceField
      ? getOperatorsForField(sourceField.fieldType)
      : CONDITION_OPERATORS.text;

    const isSelectType =
      sourceField &&
      ["checkbox", "radio", "button", "color_swatch", "image_swatch"].includes(
        sourceField.fieldType,
      );
    const isSwitchType = sourceField?.fieldType === "switch";
    const isOptionless = !isSelectType && !isSwitchType;

    const handleFieldChange = (e) => {
      const newFieldId = e.currentTarget.values?.[0] ?? e.target?.value;
      const newSource = allPriorFields.find((f) => f.id === newFieldId);
      const defaultOp = newSource
        ? (getOperatorsForField(newSource.fieldType)[0]?.value ?? "EQUALS")
        : "EQUALS";
      onUpdate({
        ...rule,
        fieldId: newFieldId,
        operator: defaultOp,
        value: "",
      });
    };

    const handleOperatorChange = (e) => {
      const op = e.currentTarget.values?.[0] ?? e.target?.value;
      onUpdate({ ...rule, operator: op, value: "" });
    };

    const handleValueChange = (e) => {
      const v = e.currentTarget?.values?.[0] ?? e.target?.value ?? "";
      onUpdate({ ...rule, value: v });
    };

    const fieldOptions = allPriorFields.map((f) => (
      <s-option key={f.id} value={f.id}>
        {f.label}
      </s-option>
    ));

    const operatorOptions = operators.map((op) => (
      <s-option key={op.value} value={op.value}>
        {op.label}
      </s-option>
    ));

    const valueInput = () => {
      if (!sourceField || rule.fieldId === "none") return null;

      if (isSwitchType) return null;

      if (isSelectType) {
        const opts = sourceField.options ?? [];
        return (
          <s-select value={rule.value} onChange={handleValueChange}>
            <s-option value="">Select value…</s-option>
            {opts.map((o) => (
              <s-option key={o.id} value={o.name ?? o.value ?? ""}>
                {o.name ?? o.label ?? ""}
              </s-option>
            ))}
          </s-select>
        );
      }

      if (sourceField.fieldType === "number") {
        return (
          <s-number-field
            label=""
            labelAccessibilityVisibility="exclusive"
            value={rule.value}
            onChange={handleValueChange}
            onInput={handleValueChange}
            placeholder="Enter number…"
          />
        );
      }

      return (
        <s-text-field
          label=""
          labelAccessibilityVisibility="exclusive"
          value={rule.value}
          onInput={handleValueChange}
          placeholder="Enter value…"
        />
      );
    };

    return (
      <s-box border="base" padding="small-200" borderRadius="base">
        <s-grid
          gridTemplateColumns="repeat(12, 1fr)"
          gap="small-200"
          alignItems="center"
        >
          <s-grid-item gridColumn="span 4">
            <s-select
              label="Field"
              labelAccessibilityVisibility="exclusive"
              value={rule.fieldId}
              onChange={handleFieldChange}
            >
              <s-option value="none">Select field…</s-option>
              {fieldOptions}
            </s-select>
          </s-grid-item>

          <s-grid-item gridColumn="span 3">
            {!isSwitchType ? (
              <s-select
                label="Operator"
                labelAccessibilityVisibility="exclusive"
                value={rule.operator}
                onChange={handleOperatorChange}
              >
                {operatorOptions}
              </s-select>
            ) : (
              <s-select
                label="State"
                labelAccessibilityVisibility="exclusive"
                value={rule.operator}
                onChange={handleOperatorChange}
              >
                {CONDITION_OPERATORS.switch.map((op) => (
                  <s-option key={op.value} value={op.value}>
                    {op.label}
                  </s-option>
                ))}
              </s-select>
            )}
          </s-grid-item>

          <s-grid-item gridColumn="span 4">{valueInput()}</s-grid-item>

          <s-grid-item gridColumn="span 1">
            <s-button
              variant="tertiary"
              tone="critical"
              icon="delete"
              accessibilityLabel="Remove condition"
              onClick={() => onDelete(rule.id)}
            />
          </s-grid-item>
        </s-grid>
      </s-box>
    );
  }
  return (
    <s-stack gap="small-200">
      <s-stack
        direction="inline"
      >
        <s-stack gap="none">
        <s-switch
          label="Conditional Logic"
          labelAccessibilityVisibility="visible"
          checked={conditions.hasCondition}
          onChange={handleToggle}
        />
        </s-stack>
      </s-stack>

      {conditions.hasCondition && (
        <s-box border="base" padding="base" borderRadius="base">
          <s-stack gap="small-200">
          <s-grid
            gridTemplateColumns="repeat(12, 1fr)"
            gap="large"
            alignContent="center"
            alignItems="center"
          >
            <s-grid-item gridColumn="span 2">
              <s-select
                label="Action"
                labelAccessibilityVisibility="exclusive"
                value={conditions.display}
                onChange={(e) =>
                  update({
                    display: e.target.value,
                  })
                }
              >
                {DISPLAY_OPTIONS.map((o) => (
                  <s-option key={o.value} value={o.value}>
                    {o.label}
                  </s-option>
                ))}
              </s-select>
            </s-grid-item>

            <s-grid-item gridColumn="span 2">
              <s-text>this field if</s-text>
            </s-grid-item>

            <s-grid-item gridColumn="span 2">
              <s-select
                label="Match"
                labelAccessibilityVisibility="exclusive"
                value={conditions.match}
                onChange={(e) =>
                  update({
                    match: e.currentTarget.values?.[0] ?? e.target.value,
                  })
                }
              >
                {MATCH_OPTIONS.map((o) => (
                  <s-option key={o.value} value={o.value}>
                    {o.label}
                  </s-option>
                ))}
              </s-select>
            </s-grid-item>
            <s-grid-item gridColumn="span 5">
              <s-text>of the following conditions are met:</s-text>
            </s-grid-item>
          </s-grid>

          <s-divider />

          {conditions.rules.length === 0 && (
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-text tone="subdued">No conditions yet. Add one below.</s-text>
            </s-box>
          )}

          <s-stack gap="small-100">
            {conditions.rules.map((rule, idx) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                index={idx}
                allPriorFields={allPriorFields}
                onUpdate={updateRule}
                onDelete={deleteRule}
              />
            ))}
          </s-stack>

          <s-button variant="secondary" onClick={addRule}>
            + Add Condition
          </s-button>
          </s-stack>
        </s-box>
      )}
    </s-stack>
  );
}
