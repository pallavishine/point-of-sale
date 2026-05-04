import { useState, useCallback } from "react";



export default function DateConfig({ field, setField }) {
  const [conditions, setConditions] = useState(
    field.conditions || { hasCondition: false, rules: [] }
  );

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const updateSetting = useCallback(
    (key, value) =>
      setField((f) => ({ ...f, setting: { ...f.setting, [key]: value } })),
    [setField]
  );

  const updateConditions = useCallback(
    (next) => {
      setConditions(next);
      setField((f) => ({ ...f, conditions: next }));
    },
    [setField]
  );

  // ─── Condition rules ─────────────────────────────────────────────────────────

  const addRule = () =>
    updateConditions({
      ...conditions,
      rules: [...conditions.rules, { operator: "eq", value: "", endValue: "" }],
    });

  const updateRule = (index, key, value) => {
    const rules = [...conditions.rules];
    rules[index] = { ...rules[index], [key]: value };
    updateConditions({ ...conditions, rules });
  };

  const removeRule = (index) =>
    updateConditions({
      ...conditions,
      rules: conditions.rules.filter((_, i) => i !== index),
    });

  // ─── Range date value: s-date-picker returns "YYYY-MM-DD--YYYY-MM-DD" ───────
  const handleRangeChange = useCallback(
    (e) => {
      const val = e.currentTarget.value; // "2024-01-01--2024-01-31"
      const [from = "", to = ""] = val.split("--");
      updateSetting("limitDateRangeDates", { rangeArr: [from, to], rangeObj: { from, to } });
    },
    [updateSetting]
  );

  // ─── Week days: s-choice-list returns array of selected values ───────────────
  const handleDOWChange = useCallback(
    (e) => updateSetting("limitDateDOWDates", e.currentTarget.values),
    [updateSetting]
  );

  // ─── Disallow past: maps to s-date-picker disallow="--YYYY-MM-DD" ────────────
  const todayStr = new Date().toISOString().split("T")[0];

  const operators = [
    { label: "Equals",  value: "eq"      },
    { label: "Before",  value: "lt"      },
    { label: "After",   value: "gt"      },
    { label: "Between", value: "between" },
  ];

  const weekDays = [
    { value: "monday",    label: "Monday"    },
    { value: "tuesday",   label: "Tuesday"   },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday",  label: "Thursday"  },
    { value: "friday",    label: "Friday"    },
    { value: "saturday",  label: "Saturday"  },
    { value: "sunday",    label: "Sunday"    },
  ];

  return (
    <s-box border="base" padding="base" borderRadius="base">
      <s-stack >
        <s-heading>Date Field Configuration</s-heading>

        {/* ── Basic Settings ── */}
        <s-stack gap="none" >
          <s-checkbox
            label="Disable dates in the past"
            checked={field.setting?.disablePastDates || false}
            onChange={(e) => updateSetting("disablePastDates", e.target.checked)}
          />

          {/* <s-checkbox
            label="Limit Date Picker"
            checked={field.setting?.isLimitDate || false}
            onChange={(e) => updateSetting("isLimitDate", e.target.checked)}
          /> */}
        </s-stack>

        {/* ── Limit Date Options ── */}
        {field.setting?.isLimitDate && (
          <s-box paddingInlineStart="400">
            <s-stack >

              <s-select
                label="Limit Date Type"
                value={field.setting?.limitDateType || "disablingDates"}
                onChange={(e) => updateSetting("limitDateType", e.target.value)}
              >
                <s-option value="disablingDates">Disable Dates</s-option>
                <s-option value="enablingDates">Enable Dates</s-option>
              </s-select>

              {/* Range Dates */}
              <s-stack vertical gap="none">
                <s-checkbox
                  label="Range Dates"
                  checked={field.setting?.limitDateRangeEnabled || false}
                  onChange={(e) => updateSetting("limitDateRangeEnabled", e.target.checked)}
                />
                {field.setting?.limitDateRangeEnabled && (
                  <s-box paddingInlineStart="400" padding="vertical-200">
                    {/* value format: "YYYY-MM-DD--YYYY-MM-DD" */}
                    <s-date-picker
                      type="range"
                      name="limit-date-range"
                      disallow={field.setting?.disablePastDates ? `--${todayStr}` : ""}
                      value={
                        field.setting?.limitDateRangeDates?.rangeObj
                          ? `${field.setting.limitDateRangeDates.rangeObj.from}--${field.setting.limitDateRangeDates.rangeObj.to}`
                          : ""
                      }
                      onChange={handleRangeChange}
                    />
                  </s-box>
                )}
              </s-stack>

              {/* Days of Week */}
              <s-stack vertical gap="none">
                <s-checkbox
                  label="Days Of Week"
                  checked={field.setting?.limitDateDOWEnabled || false}
                  onChange={(e) => updateSetting("limitDateDOWEnabled", e.target.checked)}
                />
                {field.setting?.limitDateDOWEnabled && (
                  <s-box paddingInlineStart="400" padding="vertical-200">
                    {/* allowDays prop accepts comma-separated day names */}
                    <s-choice-list
                      label="Select days"
                      multiple
                      values={field.setting?.limitDateDOWDates || []}
                      onChange={handleDOWChange}
                    >
                      {weekDays.map(({ value, label }) => (
                        <s-choice key={value} value={value}>{label}</s-choice>
                      ))}
                    </s-choice-list>
                  </s-box>
                )}
              </s-stack>

            </s-stack>
          </s-box>
        )}

        {/* <s-divider /> */}

        {/* ── Conditions ── */}
        <s-stack vertical gap="small">
          {/* <s-checkbox
            label="Specific conditions"
            checked={conditions.hasCondition || false}
            onChange={(e) =>
              updateConditions({
                ...conditions,
                hasCondition: e.target.checked,
                rules: e.target.checked ? conditions.rules : [],
              })
            }
          /> */}

          {conditions?.hasCondition && (
            <s-stack vertical gap="small">
              {conditions?.rules.length > 0 && (
                <s-box border="base" padding="small" borderRadius="base">
                  <s-stack vertical gap="small">
                    {conditions.rules.map((rule, index) => (
                      <s-grid
                        key={index}
                        gridTemplateColumns="repeat(12, 1fr)"
                        gap="base"
                        alignItems="center"
                      >
                        {/* Operator */}
                        <s-grid-item gridColumn="span 3">
                          <s-select
                            label="Operator"
                            labelAccessibilityVisibility="exclusive"
                            value={rule.operator}
                            onChange={(e) => updateRule(index, "operator", e.target.value)}
                          >
                            {operators.map((op) => (
                              <s-option key={op.value} value={op.value}>{op.label}</s-option>
                            ))}
                          </s-select>
                        </s-grid-item>

                        {/* Start / single date — uses s-date-field, value in YYYY-MM-DD */}
                        <s-grid-item gridColumn={rule.operator === "between" ? "span 4" : "span 7"}>
                          <s-date-field
                            label="Date"
                            labelAccessibilityVisibility="exclusive"
                            placeholder="Select date"
                            value={rule.value || ""}
                            disallow={field.setting?.disablePastDates ? `--${todayStr}` : ""}
                            onChange={(e) => updateRule(index, "value", e.currentTarget.value)}
                          />
                        </s-grid-item>

                        {/* End date — only for "between" */}
                        {rule.operator === "between" && (
                          <s-grid-item gridColumn="span 4">
                            <s-date-field
                              label="End date"
                              labelAccessibilityVisibility="exclusive"
                              placeholder="Select end date"
                              value={rule.endValue || ""}
                              disallow={rule.value ? `--${rule.value}` : ""}
                              onChange={(e) => updateRule(index, "endValue", e.currentTarget.value)}
                            />
                          </s-grid-item>
                        )}

                        {/* Remove */}
                        <s-grid-item gridColumn="span 1">
                          <s-button
                            tone="critical"
                            variant="tertiary"
                            icon="delete"
                            accessibility-label="Remove condition"
                            onClick={() => removeRule(index)}
                          />
                        </s-grid-item>
                      </s-grid>
                    ))}
                  </s-stack>
                </s-box>
              )}

              <s-button variant="secondary" onClick={addRule}>
                + Add Condition
              </s-button>

              <s-banner tone="info">
                <s-text size="small">Field will only be active on matching dates</s-text>
              </s-banner>
            </s-stack>
          )}
        </s-stack>
      </s-stack>
    </s-box>
  );
}

