// app/routes/settings.jsx
import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const DISCOUNT_TYPES = [
  { label: "Percentage Off", value: "percentage" },
  { label: "Fixed Amount Off", value: "fixed_amount" },
  { label: "Buy X Get Y", value: "bxgy" },
  { label: "Free Shipping", value: "free_shipping" },
];

const CONDITION_OPERATORS = [
  { label: "is equal to", value: "eq" },
  { label: "is greater than", value: "gt" },
  { label: "is greater than or equal to", value: "gte" },
  { label: "is less than", value: "lt" },
  { label: "is less than or equal to", value: "lte" },
  { label: "contains", value: "contains" },
];

const CONDITION_FIELDS = [
  { label: "Cart Total (₹)", value: "cart_total" },
  { label: "Item Quantity", value: "item_quantity" },
  { label: "Product Tag", value: "product_tag" },
  { label: "Customer Tag", value: "customer_tag" },
  { label: "Collection", value: "collection" },
  { label: "SKU", value: "sku" },
];

const POS_FIELD_TYPES = [
  { label: "Text field", value: "text" },
  { label: "Text area", value: "textarea" },
  { label: "Email field", value: "email" },
  { label: "Number field", value: "number" },
  // { label: "Select", value: "select" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Radio", value: "radio" },
  { label: "Switch", value: "switch" },
  { label: "Date Field", value: "dateField" },
  { label: "Date Picker", value: "datePicker" },
  { label: "Color Picker", value: "color" },
  { label: "Time Field", value: "timeField" },
  { label: "Time Picker", value: "timePicker" },
];

// ─── LOADER & ACTION ─────────────────────────────────────────────────────────

export async function loader({ request }) {
  // FIX: was returning empty arrays, ignoring the mock data below.
  // In production replace with real DB calls.
  const discountRules = [
    {
      id: "demo-1",
      name: "Weekend 10% Off",
      discountType: "percentage",
      discountValue: "10",
      conditions: [
        { id: "c1", field: "cart_total", operator: "gte", value: "500" },
      ],
      combinesWith: {
        orderDiscounts: false,
        productDiscounts: true,
        shippingDiscounts: false,
      },
      usageLimit: "",
      oncePerCustomer: false,
      minimumPurchaseAmount: "500",
      startsAt: "",
      endsAt: "",
      applyTo: "entire_order",
      active: true,
    },
  ];

  const posFields = [
    {
      id: "pf-2",
      label: "Engraving Text",
      fieldType: "text",
      placeholder: "Enter text to engrave...",
      required: false,
      options: [],
      helpText: "Max 30 characters",
      order: 2,
    },
  ];

  return { discountRules: [], posFields: [] };
}

export async function action({ request }) {
  const formData = await request.formData();
  const actionType = formData.get("_action");
  const data = JSON.parse(formData.get("data") || "{}");

  switch (actionType) {
    case "saveDiscount":
      if (!data.name) return { error: "Rule name is required", status: 400 };
      if (data.discountType !== "free_shipping" && !data.discountValue)
        return { error: "Discount value is required", status: 400 };
      break;

    case "saveField":
      if (!data.label) return { error: "Field label is required", status: 400 };
      if (data.fieldType === "select" && data.options.length === 0)
        return {
          error: "Select fields require at least one option",
          status: 400,
        };
      break;

    default:
      break;
  }

  // In production, persist to DB here.
  console.log(`Saving ${actionType}:`, data);
  return { success: true, message: "Settings saved successfully", data };
}

// ─── EMPTY TEMPLATES ──────────────────────────────────────────────────────────

const createEmptyRule = () => ({
  id: crypto.randomUUID(),
  name: "",
  discountType: "percentage",
  discountValue: "",
  conditions: [],
  combinesWith: {
    orderDiscounts: false,
    productDiscounts: false,
    shippingDiscounts: false,
  },
  usageLimit: "",
  oncePerCustomer: false,
  minimumPurchaseAmount: "",
  startsAt: "",
  endsAt: "",
  applyTo: "entire_order",
  active: true,
});

const createEmptyCondition = () => ({
  id: crypto.randomUUID(),
  field: "cart_total",
  operator: "gte",
  value: "",
});

const createEmptyField = (index) => ({
  id: crypto.randomUUID(),
  label: "",
  fieldType: "text",
  placeholder: "",
  required: false,
  options: [],
  helpText: "",
  order: 0,
});

// ─── DISCOUNT RULE MODAL ──────────────────────────────────────────────────────

function DiscountRuleModal({
  modalId,
  onSave,
  onClose,
  initial,
  isSubmitting,
}) {
  const [rule, setRule] = useState(() => initial ?? createEmptyRule());
  const [errors, setErrors] = useState({});

  // Sync local state whenever the caller changes `initial`
  useEffect(() => {
    setRule(initial ?? createEmptyRule());
    setErrors({});
  }, [initial]);

  const validate = () => {
    const newErrors = {};
    if (!rule.name.trim()) newErrors.name = "Rule name is required";
    if (rule.discountType !== "free_shipping" && !rule.discountValue)
      newErrors.discountValue = "Discount value is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) onSave(rule);
  };

  // Generic field setter using computed property key
  const handleSetField = (key, val) => setRule((r) => ({ ...r, [key]: val }));

  const setCombine = (key, val) =>
    setRule((r) => ({
      ...r,
      combinesWith: { ...r.combinesWith, [key]: val },
    }));

  const addCondition = () =>
    setRule((r) => ({
      ...r,
      conditions: [...r.conditions, createEmptyCondition()],
    }));

  const removeCondition = (id) =>
    setRule((r) => ({
      ...r,
      conditions: r.conditions.filter((c) => c.id !== id),
    }));

  const updateCondition = (id, key, val) =>
    setRule((r) => ({
      ...r,
      conditions: r.conditions.map((c) =>
        c.id === id ? { ...c, [key]: val } : c,
      ),
    }));

  return (
    <s-modal
      id={modalId}
      heading={initial ? "Edit Discount Rule" : "Create Discount Rule"}
    >
      <s-button
        slot="primary-action"
        variant="primary"
        commandFor={modalId}
        command="--hide"
        onClick={handleSave}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save Rule"}
      </s-button>

      <s-button
        slot="secondary-actions"
        commandFor={modalId}
        command="--hide"
        onClick={onClose}
      >
        Cancel
      </s-button>

      <s-stack gap="base">
        <s-section heading="Rule Details">
          <s-text-field
            label="Rule Name"
            value={rule.name}
            placeholder="e.g. Weekend 10% Off"
            onInput={(e) => handleSetField("name", e.currentTarget.value)}
            error={errors.name}
          />

          <s-box span="6">
            <s-select
              label="Discount Type"
              value={rule.discountType}
              onChange={(e) =>
                handleSetField("discountType", e.currentTarget.value)
              }
            >
              {DISCOUNT_TYPES.map((t) => (
                <s-option key={t.value} value={t.value}>
                  {t.label}
                </s-option>
              ))}
            </s-select>
          </s-box>

          {rule.discountType !== "free_shipping" && (
            <s-box span="6">
              <s-text-field
                label={
                  rule.discountType === "percentage"
                    ? "Discount %"
                    : "Discount Amount (₹)"
                }
                type="number"
                value={rule.discountValue}
                onInput={(e) =>
                  handleSetField("discountValue", e.currentTarget.value)
                }
                error={errors.discountValue}
              />
            </s-box>
          )}

          <s-select
            label="Apply Discount To"
            value={rule.applyTo}
            onChange={(e) => handleSetField("applyTo", e.currentTarget.value)}
          >
            <s-option value="entire_order">Entire Order</s-option>
            <s-option value="specific_products">Specific Products</s-option>
            <s-option value="specific_collections">
              Specific Collections
            </s-option>
          </s-select>

          {rule.discountType === "bxgy" && (
            <s-banner tone="info">
              Configure Buy X Get Y quantities using conditions below.
            </s-banner>
          )}
        </s-section>

        <s-section heading="Conditions">
          {rule.conditions.length === 0 ? (
            <s-text color="subdued">
              No conditions — discount applies to all transactions.
            </s-text>
          ) : (
            rule.conditions.map((cond) => (
              <s-box key={cond.id}>
                <s-box span="4">
                  <s-select
                    label="Field"
                    value={cond.field}
                    onChange={(e) =>
                      updateCondition(cond.id, "field", e.currentTarget.value)
                    }
                  >
                    {CONDITION_FIELDS.map((f) => (
                      <s-option key={f.value} value={f.value}>
                        {f.label}
                      </s-option>
                    ))}
                  </s-select>
                </s-box>

                <s-box span="3">
                  <s-select
                    label="Operator"
                    value={cond.operator}
                    onChange={(e) =>
                      updateCondition(
                        cond.id,
                        "operator",
                        e.currentTarget.value,
                      )
                    }
                  >
                    {CONDITION_OPERATORS.map((o) => (
                      <s-option key={o.value} value={o.value}>
                        {o.label}
                      </s-option>
                    ))}
                  </s-select>
                </s-box>

                <s-box span="4">
                  <s-text-field
                    label="Value"
                    value={cond.value}
                    onInput={(e) =>
                      updateCondition(cond.id, "value", e.currentTarget.value)
                    }
                  />
                </s-box>

                <s-box span="1">
                  <div style={{ marginTop: "var(--p-space-800)" }}>
                    <s-button
                      tone="critical"
                      variant="plain"
                      onClick={() => removeCondition(cond.id)}
                    >
                      Remove
                    </s-button>
                  </div>
                </s-box>
              </s-box>
            ))
          )}

          <s-button variant="secondary" onClick={addCondition}>
            Add Condition
          </s-button>
        </s-section>

        <s-section heading="Usage Limits & Schedule">
          <s-stack>
            <s-box span="6">
              <s-text-field
                label="Total Usage Limit"
                type="number"
                value={rule.usageLimit}
                placeholder="Unlimited"
                helpText="Leave blank for unlimited"
                onInput={(e) =>
                  handleSetField("usageLimit", e.currentTarget.value)
                }
              />
            </s-box>
            <s-box span="6">
              <s-text-field
                label="Minimum Purchase (₹)"
                type="number"
                value={rule.minimumPurchaseAmount}
                placeholder="No minimum"
                onInput={(e) =>
                  handleSetField("minimumPurchaseAmount", e.currentTarget.value)
                }
              />
            </s-box>
          </s-stack>

          <s-checkbox
            label="Limit to one use per customer"
            checked={rule.oncePerCustomer}
            onChange={(e) =>
              handleSetField("oncePerCustomer", e.currentTarget.checked)
            }
          />

          <s-stack>
            <s-box span="6">
              <s-text-field
                label="Start Date"
                type="date"
                value={rule.startsAt}
                onInput={(e) =>
                  handleSetField("startsAt", e.currentTarget.value)
                }
              />
            </s-box>
            <s-box span="6">
              <s-text-field
                label="End Date (optional)"
                type="date"
                value={rule.endsAt}
                onInput={(e) => handleSetField("endsAt", e.currentTarget.value)}
              />
            </s-box>
          </s-stack>
        </s-section>

        <s-section heading="Combinations">
          <s-text color="subdued">
            Choose whether this discount can combine with other active
            discounts.
          </s-text>
          <s-checkbox
            label="Order discounts"
            checked={rule.combinesWith.orderDiscounts}
            onChange={(e) =>
              setCombine("orderDiscounts", e.currentTarget.checked)
            }
          />
          <s-checkbox
            label="Product discounts"
            checked={rule.combinesWith.productDiscounts}
            onChange={(e) =>
              setCombine("productDiscounts", e.currentTarget.checked)
            }
          />
          <s-checkbox
            label="Shipping discounts"
            checked={rule.combinesWith.shippingDiscounts}
            onChange={(e) =>
              setCombine("shippingDiscounts", e.currentTarget.checked)
            }
          />
        </s-section>
      </s-stack>
    </s-modal>
  );
}

// ─── POS FIELD MODAL ──────────────────────────────────────────────────────────

function PosFieldModal({
  modalId,
  onSave,
  onClose,
  initial,
  isSubmitting,
  posFields,
}) {
  const [fieldType, setfieldType] = useState("");
  const [field, setField] = useState(
    () => initial ?? createEmptyField(fieldType, posFields?.length),
  );
  const [newOption, setNewOption] = useState("");
  const [errors, setErrors] = useState({});

  // Sync whenever the caller passes a different `initial`
  useEffect(() => {
    setField(initial ?? createEmptyField(fieldType, posFields?.length));
    setNewOption("");
    setErrors({});
  }, [initial]);

  const validate = () => {
    const newErrors = {};
    if (!field?.label?.trim()) newErrors.label = "Field label is required";
    if (field?.fieldType === "select" && field?.options.length === 0)
      newErrors.options = "At least one option is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // FIX: was `{ ...prev, key: value }` — literal string "key" used as property name.
  // Must be computed: `{ ...prev, [key]: value }`.
  const handleSetField = (key, value) =>
    setField((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    // FIX: removed the erroneous `setPosFields` call that was here.
    // State is managed exclusively in the parent via `onSave`.
    if (validate()) onSave(field);
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    setField((f) => ({ ...f, options: [...f.options, newOption.trim()] }));
    setNewOption("");
  };

  const removeOption = (opt) =>
    setField((f) => ({
      ...f,
      options: f.options.filter((o) => o !== opt),
    }));

  return (
    <s-modal
      id={modalId}
      heading={initial ? "Edit POS Field" : "Add POS Input Field"}
    >
      <s-button
        slot="primary-action"
        variant="primary"
        commandFor={modalId}
        command="--hide"
        onClick={handleSave}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save Field"}
      </s-button>

      <s-button
        slot="secondary-actions"
        commandFor={modalId}
        command="--hide"
        onClick={onClose}
      >
        Cancel
      </s-button>
      <s-select
        label="Field Type"
        value={fieldType}
        onChange={(e) => {
          setfieldType(e.currentTarget.value);
          handleSetField("fieldType", e.currentTarget.value);
        }}
      >
        {POS_FIELD_TYPES.map((t) => (
          <s-option key={t.value} value={t.value}>
            {t.label}
          </s-option>
        ))}
      </s-select>
      <s-stack gap="base">
        <s-section heading="Field Configuration">
          <s-text-field
            label="Field Label"
            value={field?.label}
            placeholder="e.g. Engraving Text"
            onInput={(e) => handleSetField("label", e.currentTarget.value)}
            error={errors.label}
          />

          {!["checkbox", "select"].includes(field?.fieldType) && (
            <s-text-field
              label="Placeholder Text"
              value={field?.placeholder}
              onInput={(e) =>
                handleSetField("placeholder", e.currentTarget.value)
              }
            />
          )}

          {field?.fieldType === "select" && (
            <s-box>
              <s-stack gap="base">
                <s-stack>
                  <s-box span="8">
                    <s-text-field
                      label="New Option"
                      value={newOption}
                      placeholder="Type option and click Add..."
                      onInput={(e) => setNewOption(e.currentTarget.value)}
                    />
                  </s-box>
                  <s-box span="4">
                    <div style={{ marginTop: "var(--p-space-800)" }}>
                      <s-button variant="secondary" onClick={addOption}>
                        Add
                      </s-button>
                    </div>
                  </s-box>
                </s-stack>

                {field?.options.length > 0 && (
                  <s-stack gap="small" wrap>
                    {field?.options.map((opt) => (
                      <s-badge key={opt}>{opt}</s-badge>
                    ))}
                  </s-stack>
                )}

                {errors.options && (
                  <s-text tone="critical">{errors.options}</s-text>
                )}
              </s-stack>
            </s-box>
          )}

          <s-text-field
            label="Help Text"
            value={field?.helpText}
            placeholder="Optional guidance for staff"
            onInput={(e) => handleSetField("helpText", e.currentTarget.value)}
          />

          <s-checkbox
            label="Required — staff must fill before adding to cart"
            checked={field?.required}
            onChange={(e) =>
              handleSetField("required", e.currentTarget.checked)
            }
          />
        </s-section>
      </s-stack>
    </s-modal>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const discountBadge = (type) =>
  ({
    percentage: { label: "% Off", tone: "success" },
    fixed_amount: { label: "₹ Off", tone: "info" },
    bxgy: { label: "Buy X Get Y", tone: "attention" },
    free_shipping: { label: "Free Shipping", tone: "magic" },
  })[type] ?? { label: type, tone: undefined };

// ─── MAIN SETTINGS PAGE ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const { discountRules: initialRules, posFields: initialFields } =
    useLoaderData();
  const fetcher = useFetcher();

  const [discountRules, setDiscountRules] = useState(initialRules);
  const [posFields, setPosFields] = useState(initialFields);
  const [editingRule, setEditingRule] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [notification, setNotification] = useState(null);

  const isSubmitting = fetcher.state === "submitting";
  const DISCOUNT_MODAL = "discount-rule-modal";
  const POS_MODAL = "pos-field-modal";

  // Auto-hide notification after 3 s
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 3000);
    return () => clearTimeout(timer);
  }, [notification]);

  const showNotification = (message, tone = "success") =>
    setNotification({ message, tone });

  const saveData = (actionType, data) => {
    const formData = new FormData();
    formData.append("_action", actionType);
    formData.append("data", JSON.stringify(data));
    fetcher.submit(formData, { method: "post" });
  };

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.error) showNotification(fetcher.data.error, "critical");
    else if (fetcher.data.success) showNotification(fetcher.data.message);
  }, [fetcher.data]);

  // ── Discount handlers ─────────────────────────────────────────────────────

  const saveDiscount = (rule) => {
    setDiscountRules((prev) =>
      editingRule
        ? prev.map((r) => (r.id === rule.id ? rule : r))
        : [...prev, rule],
    );
    saveData("saveDiscount", rule);
    setEditingRule(null);
  };

  const deleteDiscount = (id) => {
    setDiscountRules((prev) => prev.filter((r) => r.id !== id));
    saveData("deleteDiscount", { id });
  };

  const toggleDiscount = (id) => {
    setDiscountRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)),
    );
    const rule = discountRules.find((r) => r.id === id);
    saveData("toggleDiscount", { id, active: !rule.active });
  };

  // ── POS Field handlers ────────────────────────────────────────────────────

  const saveField = (field) => {
    // FIX: removed the duplicate `setPosFields` call that was previously also
    // inside `PosFieldModal.handleSave`, which caused double-append on create.
    const fieldWithOrder = {
      ...field,
      order: editingField ? field?.order : posFields.length + 1,
    };

    setPosFields((prev) =>
      editingField
        ? prev.map((f) => (f.id === fieldWithOrder.id ? fieldWithOrder : f))
        : [...prev, fieldWithOrder],
    );
    saveData("saveField", fieldWithOrder);
    setEditingField(null);
  };

  const deleteField = (id) => {
    setPosFields((prev) => prev.filter((f) => f.id !== id));
    saveData("deleteField", { id });
  };

  const moveField = (id, dir) => {
    const sorted = [...posFields].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((f) => f.id === id);
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    // Swap orders in-place on a copy
    const next = sorted.map((f) => ({ ...f }));
    [next[idx].order, next[targetIdx].order] = [
      next[targetIdx].order,
      next[idx].order,
    ];

    setPosFields(next.sort((a, b) => a.order - b.order));
    saveData("reorderFields", { id, direction: dir });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <s-page heading="Settings">
      <s-link slot="breadcrumb-actions" href="/app">
        pos-app-new
      </s-link>
      {/* ── Discount Rules ─────────────────────────────────────────────── */}

      {false && (
        <s-section heading="Discount Rules">
          {/* <s-text>Define automated POS discount logic.</s-text> */}
          <s-stack
            direction="inline"
            justifyContent="space-between"
            paddingBlock="small"
          ></s-stack>

          {discountRules.length === 0 ? (
            <s-stack gap="small-400" alignItems="center">
              {" "}
              <s-text>No discount rules</s-text>
              <s-text>Create your first discount rule to get started.</s-text>
              <s-button
                variant="primary"
                commandFor={DISCOUNT_MODAL}
                command="--show"
                onClick={() => setEditingRule(null)}
              >
                + Add Rule
              </s-button>
            </s-stack>
          ) : (
            <s-stack gap="base">
              {discountRules.map((rule, idx) => {
                const badge = discountBadge(rule.discountType);
                return (
                  <s-box key={rule.id}>
                    <s-stack direction="inline" justifyContent="space-between">
                      <s-stack direction="inline" gap="base">
                        <s-text>
                          {idx + 1}. {rule.name || "Untitled Rule"}
                        </s-text>
                        <s-stack
                          direction="inline"
                          gap="base"
                          alignItems="center"
                        >
                          <s-badge tone={badge.tone}>{badge.label}</s-badge>
                          {!rule.active && (
                            <s-badge tone="critical">Inactive</s-badge>
                          )}
                        </s-stack>
                      </s-stack>

                      <s-stack direction="inline" gap="small">
                        <s-clickable-chip
                          size="small"
                          variant="secondary"
                          color={rule.active ? "critical" : "success"}
                          onClick={() => toggleDiscount(rule.id)}
                        >
                          {rule.active ? "Deactivate" : "Activate"}
                        </s-clickable-chip>

                        <s-clickable-chip
                          size="small"
                          variant="secondary"
                          commandFor={DISCOUNT_MODAL}
                          command="--show"
                          onClick={() => setEditingRule(rule)}
                        >
                          Edit
                        </s-clickable-chip>

                        <s-clickable-chip
                          size="small"
                          variant="secondary"
                          color="strong"
                          onClick={() => deleteDiscount(rule.id)}
                        >
                          Delete
                        </s-clickable-chip>
                      </s-stack>
                    </s-stack>

                    <s-stack gap="base" paddingBlock="small">
                      <s-text color="subdued">
                        {rule.discountType === "percentage" &&
                          `${rule.discountValue}% off`}
                        {rule.discountType === "fixed_amount" &&
                          `₹${rule.discountValue} off`}
                        {rule.discountType === "free_shipping" &&
                          "Free shipping"}
                        {rule.minimumPurchaseAmount &&
                          ` • Minimum ₹${rule.minimumPurchaseAmount}`}
                        {rule.conditions.length > 0 &&
                          ` • ${rule.conditions.length} condition(s)`}
                      </s-text>

                      {rule.conditions.length > 0 && (
                        <s-stack direction="inline" gap="small" wrap>
                          {rule.conditions.map((c) => (
                            <s-badge key={c.id} tone="info">
                              {
                                CONDITION_FIELDS.find(
                                  (f) => f.value === c.field,
                                )?.label
                              }{" "}
                              {c.operator} {c.value}
                            </s-badge>
                          ))}
                        </s-stack>
                      )}
                    </s-stack>
                  </s-box>
                );
              })}
            </s-stack>
          )}
        </s-section>
      )}

      {/* ── POS Input Fields ───────────────────────────────────────────── */}
      <s-section heading="POS Input Fields">
        {/* <s-text color="subdued">
          Define dynamic input fields shown to staff on the POS product page.
        </s-text> */}

        {posFields.length === 0 ? (
          <s-stack gap="small-400" alignItems="center">
            {" "}
            <s-text>No Field added</s-text>
            <s-text>
              Add custom fields like warranty or engraving options.
            </s-text>
            <s-button
              variant="primary"
              commandFor={POS_MODAL}
              command="--show"
              onClick={() => setEditingField(null)}
            >
              Add Field
            </s-button>
          </s-stack>
        ) : (
          <s-stack>
            <s-stack gap="base">
              {[...posFields]
                .sort((a, b) => a.order - b.order)
                .map((field, idx) => (
                  <s-box key={field?.id} paddingInline="base">
                    <s-stack direction="inline" justifyContent="space-between">
                      <s-stack
                        direction="inline"
                        gap="small"
                        alignItems="center"
                      >
                        <s-stack gap="none" direction="inline">
                          <s-button
                            variant="tertiary"
                            icon="arrow-up"
                            disabled={idx === 0}
                            onClick={() => moveField(field?.id, "up")}
                          />

                          <s-button
                            variant="tertiary"
                            icon="arrow-down"
                            disabled={idx === posFields.length - 1}
                            onClick={() => moveField(field?.id, "down")}
                          />
                        </s-stack>

                        <s-text weight="bold">{field?.label}</s-text>
                        <s-badge tone="info">
                          {
                            POS_FIELD_TYPES.find(
                              (t) => t.value === field?.fieldType,
                            )?.label
                          }
                        </s-badge>
                        {field?.required && (
                          <s-badge tone="attention">Required</s-badge>
                        )}
                      </s-stack>
                      <s-stack direction="inline" gap="none">
                        <s-button
                          variant="tertiary"
                          commandFor={POS_MODAL}
                          tone="neutral"
                          command="--show"
                          onClick={() => setEditingField(field)}
                          icon="edit"
                        />

                        <s-button
                          variant="tertiary"
                          tone="critical"
                          onClick={() => deleteField(field?.id)}
                          icon="delete"
                        />
                      </s-stack>
                    </s-stack>

                    {["select", "checkbox"]?.includes(field?.fieldType) &&
                      field?.options.length > 0 && (
                        <s-stack direction="inline" gap="small" wrap>
                          {field?.options.map((opt) => (
                            <s-badge key={opt}>{opt}</s-badge>
                          ))}
                        </s-stack>
                      )}
                  </s-box>
                ))}
            </s-stack>

            <s-button
              variant="primary"
              commandFor={POS_MODAL}
              command="--show"
              onClick={() => setEditingField(null)}
            >
              Add Field
            </s-button>
          </s-stack>
        )}
      </s-section>
      {/* ── POS Preview ────────────────────────────────────────────────── */}
      <s-box slot="aside">
        {false && (
          <s-section heading="POS Discount Preview">
            <s-box
              border="base"
              borderRadius="base"
              padding="base"
              style={{ maxWidth: "400px" }}
            ></s-box>
          </s-section>
        )}
        <s-section heading="POS Field Preview">
          <s-box
            border="base"
            borderRadius="base"
            padding="base"
            style={{ maxWidth: "400px" }}
          >
            {posFields?.map((field) => {
              const renderField = () => {
                switch (field?.fieldType) {
                  case "text":
                    return (
                      <s-text-field
                        label={field?.label}
                        required={field?.required}
                        details={field?.helpText}
                        placeholder={field?.placeholder || "Enter value..."}
                        onChange={() => {}}
                      />
                    );

                  case "textarea":
                    return (
                      <s-text-area
                        label={field?.label}
                        required={field?.required}
                        details={field?.helpText}
                        placeholder={field?.placeholder || "Enter text..."}
                      />
                    );

                  case "number":
                    return (
                      <s-number-field
                        label={field?.label}
                        required={field?.required}
                        details={field?.helpText}
                        placeholder={field?.placeholder || "0"}
                      />
                    );

                  case "email":
                    return (
                      <s-email-field
                        label={field?.label}
                        required={field?.required}
                        details={field?.helpText}
                        placeholder={field?.placeholder || "Enter email"}
                      />
                    );

                  case "switch":
                    return (
                      <s-switch
                        label={field?.label}
                        helpText={field?.helpText}
                      />
                    );

                  case "checkbox":
                    return (
                      <s-choice-list
                        label={field?.label}
                        details={field?.helpText}
                        multiple
                      >
                        <s-choice value="s" selected>
                          Small
                        </s-choice>
                        <s-choice value="m">Medium</s-choice>
                        <s-choice value="l">Large</s-choice>
                        <s-choice value="xl">Extra large</s-choice>
                      </s-choice-list>
                    );

                  case "radio":
                    return (
                      <s-choice-list
                        label={field?.label}
                        details={field?.helpText}
                      >
                        <s-choice value="s" selected>
                          Small
                        </s-choice>
                        <s-choice value="m">Medium</s-choice>
                        <s-choice value="l">Large</s-choice>
                        <s-choice value="xl">Extra large</s-choice>
                      </s-choice-list>
                    );

                  case "dateField":
                    return (
                      <s-date-field
                        label={field?.label}
                        details={field?.helpText}
                        required={field?.required}
                        placeholder="Select date"
                      />
                    );

                  case "timeField":
                    return (
                      <s-time-field
                        label={field?.label}
                        details={field?.helpText}
                        required={field?.required}
                        placeholder="Select time"
                      />
                    );

                  case "datePicker":
                    return (
                      <>
                        <s-text>{field?.label}</s-text>
                        {field?.helpText && (
                          <s-text color="subdued">{field?.helpText}</s-text>
                        )}
                        <s-button
                          command="--show"
                          commandFor={`date-${field?.id}`}
                        >
                          Show
                        </s-button>
                        <s-date-picker
                          id={`date-${field?.id}`}
                          value="2025-10-08"
                        />
                      </>
                    );

                  case "timePicker":
                    return (
                      <>
                        <s-text>{field?.label}</s-text>
                        {field?.helpText && (
                          <s-text color="subdued">{field?.helpText}</s-text>
                        )}
                        <s-button
                          command="--show"
                          commandFor={`time-${field?.id}`}
                        >
                          Show
                        </s-button>
                        <s-time-picker id={`time-${field?.id}`} value="9:41" />
                      </>
                    );

                  default:
                    return (
                      <s-box
                        border="base"
                        borderRadius="base"
                        padding="small"
                        background="subdued"
                      >
                        <s-text color="subdued">
                          {field?.placeholder || "Unsupported field"}
                        </s-text>
                      </s-box>
                    );
                }
              };

              return (
                <s-box key={field?.id} paddingBlock="small-400">
                  {" "}
                  {renderField()}
                </s-box>
              );
            })}
          </s-box>
        </s-section>
      </s-box>
      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <DiscountRuleModal
        modalId={DISCOUNT_MODAL}
        onSave={saveDiscount}
        onClose={() => setEditingRule(null)}
        initial={editingRule}
        isSubmitting={isSubmitting}
      />
      <PosFieldModal
        modalId={POS_MODAL}
        onSave={saveField}
        onClose={() => setEditingField(null)}
        initial={editingField}
        isSubmitting={isSubmitting}
        posFields={posFields}
      />
    </s-page>
  );
}
