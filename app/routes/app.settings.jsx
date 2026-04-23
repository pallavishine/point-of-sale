import { settingsModel } from "../db.schema";
import { authenticate } from "../shopify.server";
import { useState, useEffect, useCallback } from "react";
import { useLoaderData, useFetcher, useNavigate } from "react-router";

// ---------- FIELD TYPES ----------
const FIELD_TYPES = [
  { label: "Text field", value: "text" },
  { label: "Textarea", value: "textarea" },
  { label: "Email", value: "email" },
  { label: "Number", value: "number" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Radio", value: "radio" },
  { label: "Switch", value: "switch" },
  { label: "Date Field", value: "dateField" },
  { label: "Time Field", value: "timeField" },
];

// ---------- PRODUCT SELECTION TYPES ----------
const PRODUCT_SELECTION_TYPES = [
  { label: "All Products", value: "all" },
  {
    label: "Specific Products",
    value: "products",
  },
  {
    label: "Collections",
    value: "collections",
  },
];

// ---------- LOADER ----------
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const data = await settingsModel.findOne({ shop: session.shop });

  return {
    optionSets: JSON.parse(JSON.stringify(data))?.optionSets ?? [],
  };
}

// ---------- ACTION ----------
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  let optionSets = [];
  try {
    optionSets = JSON.parse(formData.get("data") || "[]");
  } catch {}

  await settingsModel.findOneAndUpdate(
    { shop: session.shop },
    { shop: session.shop, optionSets },
    { upsert: true },
  );

  return { success: true };
}

// ---------- VALIDATION WITH SEQUENTIAL ERRORS ----------
const validateOptionSet = (optionSet, allOptionSets) => {
  // Check name existence first
  if (!optionSet.name?.trim()) {
    return { field: "name", message: "Name is required" };
  }

  // Check name duplication
  const isDuplicate = allOptionSets.some(
    (t) =>
      t.id !== optionSet.id &&
      t.name?.trim().toLowerCase() === optionSet.name?.trim().toLowerCase(),
  );

  if (isDuplicate) {
    return { field: "name", message: "Name must be unique" };
  }

  // Check fields existence
  if (!optionSet.fields?.length) {
    return { field: "fields", message: "Add at least one field" };
  }

  // Validate each field
  for (let i = 0; i < optionSet.fields.length; i++) {
    const field = optionSet.fields[i];
    if (!field.label?.trim()) {
      return {
        field: `field_${i}`,
        message: `Field ${i + 1}: Label is required`,
      };
    }

    if (["checkbox", "radio"].includes(field.fieldType)) {
      if (!field.options?.length) {
        return {
          field: `field_${i}_options`,
          message: `${field.label || `Field ${i + 1}`}: At least one option is required`,
        };
      }

      const invalidOptions = field.options.some(
        (opt) => !opt.label?.trim() || !opt.value?.trim(),
      );
      if (invalidOptions) {
        return {
          field: `field_${i}_options`,
          message: `${field.label || `Field ${i + 1}`}: All options must have label and value`,
        };
      }
    }
  }

  // Check product selection based on type
  if (
    optionSet.products?.type === "products" &&
    (!optionSet.products?.data || optionSet.products.data.length === 0)
  ) {
    return { field: "products", message: "Select at least one product" };
  }

  if (
    optionSet.products?.type === "collections" &&
    (!optionSet.products?.data || optionSet.products.data.length === 0)
  ) {
    return { field: "collections", message: "Select at least one collection" };
  }

  return null;
};

// ---------- HELPERS ----------
const createOptionSet = () => ({
  id: crypto.randomUUID(),
  name: "",
  products: {
    type: "all",
    data: [],
  },
  fields: [],
  status: "active",
  createdAt: new Date().toISOString(),
});

const createField = (type, index) => ({
  id: crypto.randomUUID(),
  label: `${type} ${index + 1}`,
  fieldType: type,
  placeholder: "",
  required: false,
  addonPrice: 0,
  options: ["checkbox", "radio"].includes(type)
    ? [
        {
          id: crypto.randomUUID(),
          label: "Option 1",
          value: "option_1",
          price: 0,
        },
      ]
    : [],
});

// ---------- OPTIONS EDITOR ----------
function OptionsEditor({ field, setField }) {
  const options = field.options || [];

  const updateOption = (id, key, value) => {
    setField((f) => ({
      ...f,
      options: f.options.map((opt) =>
        opt.id === id ? { ...opt, [key]: value } : opt,
      ),
    }));
  };

  return (
    <s-box border="base" padding="base">
      <s-stack gap="small">
        <s-heading>Options</s-heading>

        {options.map((opt, idx) => (
          <s-box key={opt.id} border="base" padding="small">
            <s-stack gap="small">
              <s-text-field
                label={`Option ${idx + 1} Label`}
                value={opt.label}
                onInput={(e) => updateOption(opt.id, "label", e.target.value)}
              />

              <s-text-field
                label={`Option ${idx + 1} Value`}
                value={opt.value}
                onInput={(e) => updateOption(opt.id, "value", e.target.value)}
              />

              <s-number-field
                label="Price (₹)"
                value={opt.price ?? ""}
                onChange={(e) =>
                  updateOption(opt.id, "price", Number(e.target.value))
                }
              />

              <s-button
                tone="critical"
                variant="tertiary"
                onClick={() => {
                  setField((f) => ({
                    ...f,
                    options: f.options.filter((o) => o.id !== opt.id),
                  }));
                }}
              >
                Remove Option
              </s-button>
            </s-stack>
          </s-box>
        ))}

        <s-button
          variant="primary"
          onClick={() =>
            setField((f) => ({
              ...f,
              options: [
                ...f.options,
                {
                  id: crypto.randomUUID(),
                  label: "",
                  value: "",
                  price: 0,
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

// ---------- ENHANCED PRODUCT SELECTOR ----------
function ProductSelector({ optionSet, setOptionSet }) {
  const openProductPicker = async () => {
    try {
      const selection = await shopify.resourcePicker({
        type: "product",
        multiple: true,
      });

      if (!selection) return;

      setOptionSet((t) => ({
        ...t,
        products: {
          ...t.products,
          data: selection.map((p) => ({
            id: p.id,
            title: p.title,
            img: p?.images?.[0]?.originalSrc ?? "",
          })),
        },
      }));
    } catch (error) {
      console.error("Error opening product picker:", error);
      shopify.toast.show("Failed to open product picker", { isError: true });
    }
  };

  const openCollectionPicker = async () => {
    try {
      const selection = await shopify.resourcePicker({
        type: "collection",
        multiple: true,
      });

      if (!selection) return;

      setOptionSet((t) => ({
        ...t,
        products: {
          ...t.products,
          type: "collections",
          data: selection.map((c) => ({
            id: c.id,
            title: c.title,
            img: c?.image?.originalSrc ?? "",
          })),
        },
      }));
    } catch (error) {
      console.error("Error opening collection picker:", error);
      shopify.toast.show("Failed to open collection picker", { isError: true });
    }
  };



  const removeItem = (id) => {
    setOptionSet((t) => ({
      ...t,
      products: {
        ...t.products,
        data: t.products.data.filter((item) => item.id !== id),
      },
    }));
  };

  return (
    <s-box border="base" padding="base">
      <s-stack gap="base">
        <s-heading>Products</s-heading>
        <s-choice-list
          label="Select how to assign this option set"
          labelAccessibilityVisibility="exclusive"
          name="selectionType"
          values={optionSet.products?.type || "all"}
          onChange={(e) => {
            setOptionSet((t) => ({
              ...t,
              products: {
                type: e.currentTarget.values[0],
                data:
                  e.currentTarget.values[0] === "all"
                    ? []
                    : t.products?.data || [],
              },
            }));
          }}
        >
          
          {PRODUCT_SELECTION_TYPES.map((type) => (
            <s-choice key={type.value} value={type.value}>
              {type.label}
            </s-choice>
          ))}
        </s-choice-list>

        {optionSet.products?.type === "products" && (
          <s-box>
            <s-stack gap="small">
              <s-stack direction="inline" justifyContent="space-between">
                <s-text fontWeight="medium">Selected Products</s-text>
                <s-button onClick={openProductPicker}>Select Products</s-button>
              </s-stack>

              {optionSet.products?.data?.length === 0 ? (
                <s-text tone="subdued">No products selected</s-text>
              ) : (
                <s-stack gap="small">
                  {optionSet.products.data.map((p) => (
                    <s-stack
                      key={p.id}
                      direction="inline"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <s-stack
                        direction="inline"
                        gap="base"
                        alignItems="center"
                      >
                        {p.img && <s-thumbnail size="small-200" src={p.img} />}
                        <s-text>{p.title}</s-text>
                      </s-stack>
                      <s-button
                        tone="critical"
                        variant="tertiary"
                        onClick={() => removeItem(p.id)}
                      >
                        Remove
                      </s-button>
                    </s-stack>
                  ))}
                </s-stack>
              )}
            </s-stack>
          </s-box>
        )}

        {optionSet.products?.type === "collections" && (
          <s-box>
            <s-stack gap="small">
              <s-stack direction="inline" justifyContent="space-between">
                <s-text fontWeight="medium">Selected Collections</s-text>
                <s-button onClick={openCollectionPicker}>
                  Select Collections
                </s-button>
              </s-stack>

              {optionSet.products?.data?.length === 0 ? (
                <s-text tone="subdued">No collections selected</s-text>
              ) : (
                <s-stack gap="small">
                  {optionSet.products.data.map((c) => (
                    <s-stack
                      key={c.id}
                      direction="inline"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <s-stack
                        direction="inline"
                        gap="base"
                        alignItems="center"
                      >
                        {c.img && <s-thumbnail size="small-200" src={c.img} />}
                        <s-text>{c.title}</s-text>
                      </s-stack>
                      <s-button
                        tone="critical"
                        variant="tertiary"
                        onClick={() => removeItem(c.id)}
                      >
                        Remove
                      </s-button>
                    </s-stack>
                  ))}
                </s-stack>
              )}
            </s-stack>
          </s-box>
        )}

      </s-stack>
    </s-box>
  );
}

// ---------- INDEX TABLE COMPONENT ----------
function OptionSetsTable({
  optionSets,
  onEdit,
  onDelete,
  onStatusToggle,
  onCreateNew,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptionSets = optionSets.filter((optionSet) =>
    optionSet.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const allSelected = selectedIds.length === filteredOptionSets.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < filteredOptionSets.length;

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOptionSets.map((opt) => opt.id));
    }
  };

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    shopify.modal.show("bulk-delete-modal");
  };

  const confirmBulkDelete = () => {
    selectedIds.forEach((id) => onDelete(id));
    setSelectedIds([]);
    shopify.toast.show(`${selectedIds.length} option set(s) deleted`);
    shopify.modal.hide("bulk-delete-modal");
  };

  const getSelectionTypeLabel = (type) => {
    const found = PRODUCT_SELECTION_TYPES.find((t) => t.value === type);
    return found ? found.label : "All Products";
  };

  if (!filteredOptionSets?.length && !searchTerm) {
    return (
      <s-section accessibilityLabel="Empty state section">
        <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
          <s-box maxInlineSize="200px" maxBlockSize="200px">
            <s-image
              aspectRatio="1/0.5"
              src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
              alt="A stylized graphic of four characters, each holding a template piece"
            />
          </s-box>
          <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
            <s-stack alignItems="center">
              <s-heading>Start creating Option Set</s-heading>
              <s-paragraph>Create your first Option Set.</s-paragraph>
            </s-stack>
            <s-button variant="tertiary" onClick={onCreateNew}>
              + Create Option Set
            </s-button>
          </s-grid>
        </s-grid>
      </s-section>
    );
  }

  return (
    <s-section padding="none" accessibilityLabel="Option sets table">
      <s-table>
        {/* Filters and Bulk Actions */}
        {selectedIds.length === 0 ? (
          <s-grid slot="filters" gap="small-200" gridTemplateColumns="1fr auto">
            <s-text-field
              label="Search option sets"
              labelAccessibilityVisibility="exclusive"
              icon="search"
              placeholder="Search by name..."
              value={searchTerm}
              onInput={(e) => setSearchTerm(e.target.value)}
            />
          </s-grid>
        ) : (
          <s-box slot="filters" padding="small" background="strong">
            <s-stack
              direction="inline"
              gap="base"
              alignItems="center"
              justifyContent="space-between"
            >
              <s-text fontWeight="semibold">
                {selectedIds.length} of {filteredOptionSets.length} selected
              </s-text>
              <s-stack direction="inline" gap="small">
                <s-button variant="secondary" onClick={handleBulkDelete}>
                  Delete Selected
                </s-button>
              </s-stack>
            </s-stack>
          </s-box>
        )}

        {/* Table Headers */}
        <s-table-header-row>
          <s-table-header listSlot="primary">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={handleSelectAll}
                accessibilityLabel="Select all option sets"
              />
              <s-text>Option Set Name</s-text>
            </s-stack>
          </s-table-header>
          <s-table-header format="numeric">Fields</s-table-header>
          <s-table-header>Product Selection</s-table-header>
          <s-table-header>Status</s-table-header>
          <s-table-header listSlot="secondary">Actions</s-table-header>
        </s-table-header-row>

        {/* Table Body */}
        <s-table-body>
          {filteredOptionSets.map((optionSet) => (
            <s-table-row
              key={optionSet.id}
              selected={selectedIds.includes(optionSet.id)}
            >
              <s-table-cell>
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-checkbox
                    checked={selectedIds.includes(optionSet.id)}
                    onChange={() => handleSelectRow(optionSet.id)}
                    accessibilityLabel={`Select ${optionSet.name}`}
                  />
                  <s-link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onEdit(optionSet);
                    }}
                  >
                    {optionSet.name}
                  </s-link>
                </s-stack>
              </s-table-cell>
              <s-table-cell format="numeric">
                <s-badge
                  tone={optionSet.fields?.length > 0 ? "success" : "neutral"}
                >
                  {optionSet.fields?.length || 0}
                </s-badge>
              </s-table-cell>
              <s-table-cell>
                <s-stack gap="small">
                  <s-text size="small">
                    {getSelectionTypeLabel(optionSet.products?.type)}
                  </s-text>
                  {optionSet.products?.type !== "all" &&
                    optionSet.products?.data?.length > 0 && (
                      <s-text tone="subdued" size="small">
                        {optionSet.products.data.length} item(s)
                      </s-text>
                    )}
                </s-stack>
              </s-table-cell>
              <s-table-cell>
                <s-badge
                  color="base"
                  tone={optionSet.status === "active" ? "success" : "neutral"}
                >
                  {optionSet.status === "active" ? "Active" : "Inactive"}
                </s-badge>
              </s-table-cell>
              <s-table-cell>
                <s-stack direction="inline" gap="small">
                  <s-button
                    variant="tertiary"
                    onClick={() => onStatusToggle(optionSet.id)}
                  >
                    {optionSet.status === "active" ? "Deactivate" : "Activate"}
                  </s-button>
                  <s-button
                    variant="tertiary"
                    onClick={() => onEdit(optionSet)}
                  >
                    Edit
                  </s-button>
                  <s-button
                    tone="critical"
                    variant="tertiary"
                    onClick={() => onDelete(optionSet.id)}
                  >
                    Delete
                  </s-button>
                </s-stack>
              </s-table-cell>
            </s-table-row>
          ))}
        </s-table-body>
      </s-table>

      {/* Bulk Delete Confirmation Modal */}
      <s-modal
        id="bulk-delete-modal"
        heading={`Delete ${selectedIds.length} option set(s)?`}
      >
        <s-text>
          Are you sure you want to delete the selected option sets? This action
          cannot be undone.
        </s-text>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          onClick={confirmBulkDelete}
        >
          Delete
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="bulk-delete-modal"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
    </s-section>
  );
}

// ---------- MAIN COMPONENT ----------
export default function SettingsPage() {
  const { optionSets: initialOptionSets } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [optionSets, setOptionSets] = useState(initialOptionSets);
  const [mode, setMode] = useState("list");
  const [activeOptionSet, setActiveOptionSet] = useState(null);
  const [activeField, setActiveField] = useState(null);
  const [nameError, setNameError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  console.log(nameError)
  useEffect(() => {
    if (activeOptionSet && mode === "editor") {
      const isDuplicate = optionSets.some(
        (t) =>
          t.id !== activeOptionSet.id &&
          t.name?.trim().toLowerCase() ===
            activeOptionSet.name?.trim().toLowerCase(),
      );
      setNameError(isDuplicate);
    }
  }, [activeOptionSet?.name, activeOptionSet?.id, optionSets, mode]);

  const saveOptionSet = useCallback(async () => {
    // Sequential validation with toast errors
    const error = validateOptionSet(activeOptionSet, optionSets);

    if (error) {
      shopify.toast.show(error.message, { isError: true });
      return;
    }

    setIsSaving(true);

    try {
      const updated = optionSets.some((t) => t.id === activeOptionSet.id)
        ? optionSets.map((t) =>
            t.id === activeOptionSet.id ? activeOptionSet : t,
          )
        : [
            ...optionSets,
            { ...activeOptionSet, createdAt: new Date().toISOString() },
          ];

      setOptionSets(updated);

      const fd = new FormData();
      fd.append("data", JSON.stringify(updated));
      await fetcher.submit(fd, { method: "post" });

      shopify.toast.show("Option set saved successfully", { isError: false });
      setMode("list");
      setActiveOptionSet(null);
      setNameError(false);
    } catch (error) {
      console.error("Error saving option set:", error);
      shopify.toast.show("Failed to save option set", { isError: true });
    } finally {
      setIsSaving(false);
    }
  }, [activeOptionSet, optionSets, fetcher]);

  const handleEdit = (optionSet) => {
    setActiveOptionSet(optionSet);
    setMode("editor");
  };

  const handleDelete = async (id) => {
    const updated = optionSets.filter((t) => t.id !== id);
    setOptionSets(updated);

    const fd = new FormData();
    fd.append("data", JSON.stringify(updated));
    await fetcher.submit(fd, { method: "post" });

    shopify.toast.show("Option set deleted successfully", { isError: false });
  };

  const handleStatusToggle = async (id) => {
    const updated = optionSets.map((t) =>
      t.id === id
        ? { ...t, status: t.status === "active" ? "inactive" : "active" }
        : t,
    );
    setOptionSets(updated);

    const fd = new FormData();
    fd.append("data", JSON.stringify(updated));
    await fetcher.submit(fd, { method: "post" });

    shopify.toast.show("Status updated successfully", { isError: false });
  };

  const handleCreateNew = () => {
    setActiveOptionSet(createOptionSet());
    setMode("editor");
  };

  const isSaveDisabled =
    isSaving || !activeOptionSet?.name?.trim() || nameError;

  return (
    <s-page heading="Custom Fields">
      <s-link slot="breadcrumb-actions" href="/app">
        pos-app-new
      </s-link>

      {/* LIST VIEW WITH INDEX TABLE */}
      {mode === "list" && (
        <s-stack gap="base">
          <s-stack direction="inline" justifyContent="space-between">
            <s-box></s-box>
            <s-button variant="primary" onClick={handleCreateNew}>
              + Create Option Set
            </s-button>
          </s-stack>

          <OptionSetsTable
            optionSets={optionSets}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusToggle={handleStatusToggle}
            onCreateNew={handleCreateNew}
          />
        </s-stack>
      )}

      {/* EDITOR VIEW */}
      {mode === "editor" && activeOptionSet && (
        <s-stack gap="base">
          <s-stack direction="inline" justifyContent="space-between">
            <s-button
              onClick={() => {
                setMode("list");
                setActiveOptionSet(null);
                setActiveField(null);
                setNameError(false);
              }}
            >
              Back
            </s-button>
            <s-button
              variant="primary"
              onClick={saveOptionSet}
              disabled={isSaveDisabled}
            >
              {isSaving ? "Saving..." : "Save Option Set"}
            </s-button>
          </s-stack>

          <s-box border="base" padding="base">
            <s-stack gap="base">
              <s-text-field
                label="Option Set Name"
                value={activeOptionSet.name}
                error={nameError ? "Requi" : ""}
                onInput={(e) =>
                  setActiveOptionSet((t) => ({
                    ...t,
                    name: e.target.value,
                  }))
                }
              />

              <s-heading>Fields</s-heading>

              {activeOptionSet.fields.length === 0 && (
                <s-text tone="subdued">No fields added yet</s-text>
              )}

              {activeOptionSet.fields.map((f) => (
                <s-box key={f.id} border="base" padding="small">
                  <s-stack
                    direction="inline"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <s-stack gap="small">
                      <s-text fontWeight="semibold">{f.label}</s-text>
                      <s-text tone="subdued" size="small">
                        {f.fieldType}
                      </s-text>
                      {f.required && <s-badge tone="info">Required</s-badge>}
                    </s-stack>
                    <s-stack direction="inline" gap="small">
                      <s-button onClick={() => setActiveField(f)}>
                        Edit
                      </s-button>
                      <s-button
                        tone="critical"
                        variant="tertiary"
                        onClick={() =>
                          setActiveOptionSet((t) => ({
                            ...t,
                            fields: t.fields.filter((x) => x.id !== f.id),
                          }))
                        }
                      >
                        Delete
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-box>
              ))}

              {/* FIELD ADD */}
              {!activeField && (
                <>
                  <s-heading tone="subdued">Add New Field</s-heading>
                  <s-stack direction="inline" wrap gap="small-400">
                    {FIELD_TYPES.map((t) => (
                      <s-button
                        key={t.value}
                        onClick={() =>
                          setActiveField(
                            createField(t.value, activeOptionSet.fields.length),
                          )
                        }
                      >
                        + {t.label}
                      </s-button>
                    ))}
                  </s-stack>
                </>
              )}

              {/* FIELD EDITOR */}
              {activeField && (
                <s-box border="base" padding="base">
                  <s-stack gap="base">
                    <s-heading>Edit Field: {activeField.fieldType}</s-heading>

                    <s-text-field
                      label="Label"
                      value={activeField.label}
                      onInput={(e) =>
                        setActiveField((f) => ({
                          ...f,
                          label: e.target.value,
                        }))
                      }
                    />

                    <s-checkbox
                      label="Required"
                      checked={activeField.required}
                      onChange={(e) =>
                        setActiveField((f) => ({
                          ...f,
                          required: e.target.checked,
                        }))
                      }
                    />

                    {["checkbox", "radio"].includes(activeField.fieldType) && (
                      <OptionsEditor
                        field={activeField}
                        setField={setActiveField}
                      />
                    )}

                    <s-stack
                      direction="inline"
                      justifyContent="end"
                      gap="small"
                    >
                      <s-button
                        variant="tertiary"
                        onClick={() => setActiveField(null)}
                      >
                        Cancel
                      </s-button>

                      <s-button
                        variant="primary"
                        disabled={!activeField.label?.trim()}
                        onClick={() => {
                          setActiveOptionSet((t) => ({
                            ...t,
                            fields: t.fields.some(
                              (f) => f.id === activeField.id,
                            )
                              ? t.fields.map((f) =>
                                  f.id === activeField.id ? activeField : f,
                                )
                              : [...t.fields, activeField],
                          }));
                          setActiveField(null);
                        }}
                      >
                        {activeOptionSet.fields.some(
                          (f) => f.id === activeField.id,
                        )
                          ? "Update Field"
                          : "Add Field"}
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-box>
              )}

              <ProductSelector
                optionSet={activeOptionSet}
                setOptionSet={setActiveOptionSet}
              />
            </s-stack>
          </s-box>
        </s-stack>
      )}
    </s-page>
  );
}
