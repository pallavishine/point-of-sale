import { useState } from "react";
import {
  NAV_ITEMS,
  FIELD_TYPES,
  createField,
  validateOptionSet,
  TARGET_TYPES,
  PRODUCT_SELECTION_TYPES,
} from "../../utils/optionSetHelpers";
import FieldsTab from "./FieldsTab";

function SidebarNav({
  activeSection,
  onSelect,
  fieldCount,
  productCount,
  productType,
  setOpenFieldedit,
  openFieldEdit,
}) {
  const badges = {
    fields: fieldCount > 0 ? fieldCount : null,
    products: productType !== "all" && productCount > 0 ? productCount : null,
  };

  return (
    <s-box border="base" borderRadius="base" background="subdued">
      <s-stack gap="none">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <>
              <s-clickable
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  setOpenFieldedit((prev) => !prev);
                }}
                padding="base"
                background={isActive ? "base" : "transparent"}
              >
                <s-stack direction="inline" gap="small-200" alignItems="center">
                  <s-icon
                    type={item.icon}
                    size="small"
                    tone={isActive ? "auto" : "subdued"}
                  />
                  <s-text
                    fontWeight={isActive ? "semibold" : "regular"}
                    tone={isActive ? "auto" : "subdued"}
                  >
                    {item.label}
                  </s-text>
                  {badges[item.id] != null && (
                    <s-badge tone="neutral">{badges[item.id]}</s-badge>
                  )}
                  {isActive && (
                    <s-stack
                      direction="inline"
                      justifyContent="end"
                      style={{ flex: 1 }}
                    >
                      <s-icon type="caret-right" size="small" />
                    </s-stack>
                  )}
                </s-stack>
              </s-clickable>
              <s-divider />
            </>
          );
        })}
      </s-stack>
    </s-box>
  );
}

function GeneralTab({ optionSet, setOptionSet, nameError }) {
  return (
    <s-stack gap="base">
      <s-stack gap="none">
        <s-heading>General Settings</s-heading>
        <s-text tone="subdued">
          Configure the basic details and behaviour of this option set.
        </s-text>
      </s-stack>
      <s-divider />
      <s-text-field
        label="Option Set Name"
        value={optionSet.name}
        error={nameError ? "This name is already taken" : ""}
        onInput={(e) =>
          setOptionSet((prev) => ({ ...prev, name: e.target.value }))
        }
      />
      <s-select
        label="Status"
        value={optionSet.status}
        onChange={(e) =>
          setOptionSet((prev) => ({ ...prev, status: e.target.value }))
        }
      >
        <s-option value="active">Active</s-option>
        <s-option value="inactive">Inactive</s-option>
      </s-select>
      <s-divider />
      <s-stack gap="small">
        <s-heading>Display Location</s-heading>
        <s-text tone="subdued">
          Where should this option set appear in the store?
        </s-text>
        <s-choice-list
          label="Target"
          name="target"
          values={[optionSet.target || "product"]}
          onChange={(e) =>
            setOptionSet((prev) => ({ ...prev, target: e.target.values[0] }))
          }
        >
          {TARGET_TYPES.map(({ label, value }) => (
            <s-choice key={value} value={value}>
              {label}
            </s-choice>
          ))}
        </s-choice-list>
      </s-stack>
    </s-stack>
  );
}

function ProductsTab({ optionSet, setOptionSet }) {
  const {
    type = "all",
    products = [],
    collections = [],
  } = optionSet.products || {};

  const handleTypeChange = (newType) => {
    setOptionSet((prev) => ({
      ...prev,
      products: { ...prev.products, type: newType },
    }));
  };

  const openPicker = async (pickerType) => {
    try {
      console.log("collections",collections)
      const currentItems = pickerType === "product" ? products : collections;
      const selectionIds = currentItems.map((item) => ({
        id: item.id,
      }));
      console.log("selectionIds",selectionIds);
      const selection = await shopify.resourcePicker({
        type: pickerType,
        multiple: true,
        selectionIds,
        ...(pickerType === "product" && {
          filter: {
            hidden: true,
            variants: false,
            draft: false,
            archived: false,
          },
        }),
      });
      if (!selection) return;
      const formatted = selection.map((item) => ({
        id: item.id,
        title: item.title,
        img:
          pickerType === "product"
            ? (item?.images?.[0]?.originalSrc ?? "")
            : (item?.image?.originalSrc ?? ""),
      }));
      setOptionSet((prev) => ({
        ...prev,
        products: {
          ...prev.products,
          [pickerType === "product" ? "products" : "collections"]: formatted,
        },
      }));
    } catch {
      shopify.toast.show("Failed to open picker", { isError: true });
    }
  };

  const removeItem = (id, key) => {
    setOptionSet((prev) => ({
      ...prev,
      products: {
        ...prev.products,
        [key]: prev.products[key].filter((item) => item.id !== id),
      },
    }));
  };

  const renderList = (items, key, label, icon, pickerType) => (
    <s-box border="base" padding="base" borderRadius="base">
      <s-stack gap="small">
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
        >
          <s-text fontWeight="semibold">
            {label} ({items.length})
          </s-text>
          <s-button onClick={() => openPicker(pickerType)}>
            Browse {label}
          </s-button>
        </s-stack>
        {!items.length ? (
          <s-box padding="base" background="subdued" borderRadius="base">
            <s-stack alignItems="center" gap="small">
              <s-icon type={icon} />
              <s-text tone="subdued">
                No {label.toLowerCase()} selected yet.
              </s-text>
            </s-stack>
          </s-box>
        ) : (
          <s-stack gap="small">
            {items.map((item) => (
              <s-box
                key={item.id}
                border="base"
                padding="small-400"
                borderRadius="base"
              >
                <s-stack
                  direction="inline"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-thumbnail
                      size="small-200"
                      src={item?.img ?? ""}
                      alt={item.title}
                    />
                    <s-text>{item.title}</s-text>
                  </s-stack>
                  <s-button
                    tone="critical"
                    variant="tertiary"
                    icon="x"
                    accessibilityLabel="icon"
                    onClick={() => removeItem(item.id, key)}
                  />
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-stack>
    </s-box>
  );

  return (
    <s-stack gap="small-200">
      <s-stack gap="none">
        <s-heading>Product Assignment</s-heading>
        <s-text tone="subdued">
          Choose which products or collections this option set applies to.
        </s-text>
      </s-stack>
      <s-divider />
      <s-choice-list
        label="Apply to"
        name="selectionType"
        values={[type]}
        onChange={(e) => handleTypeChange(e.currentTarget.values[0])}
      >
        {PRODUCT_SELECTION_TYPES.map(({ label, value }) => (
          <s-choice key={value} value={value}>
            {label}
          </s-choice>
        ))}
      </s-choice-list>
      {type === "all" && (
        <s-banner tone="info">
          <s-text>
            This option set will apply to all products in your store.
          </s-text>
        </s-banner>
      )}
      {type === "products" &&
        renderList(products, "products", "Products", "products", "product")}
      {type === "collections" &&
        renderList(
          collections,
          "collections",
          "Collections",
          "collection",
          "collection",
        )}
    </s-stack>
  );
}

export function OptionSetEditor({
  optionSet,
  setOptionSet,
  onBack,
  onSave,
  isSaving,
  setIsSaving,
  nameError,
}) {
  const [activeSection, setActiveSection] = useState("general");
  const [openFieldEdit, setOpenFieldedit] = useState(false);

  return (
    <s-stack gap="base">
      <s-stack
        direction="inline"
        justifyContent="space-between"
        alignItems="center"
      >
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-button variant="tertiary" icon="arrow-left" onClick={onBack}>
            Back
          </s-button>
        </s-stack>
        <s-stack direction="inline" gap="small">
          <s-button variant="secondary" onClick={onBack}>
            Cancel
          </s-button>
          <s-button variant="primary" loading={isSaving} onClick={onSave}>
            Save
          </s-button>
        </s-stack>
      </s-stack>

      <s-divider />

      <s-grid gridTemplateColumns="200px 1fr" gap="large">
        <SidebarNav
          activeSection={activeSection}
          onSelect={setActiveSection}
          fieldCount={optionSet.fields?.length || 0}
          productCount={
            optionSet.products?.type === "products"
              ? optionSet.products?.products?.length || 0
              : optionSet.products?.collections?.length || 0
          }
          productType={optionSet.products?.type}
          setOpenFieldedit={setOpenFieldedit}
          openFieldEdit={openFieldEdit}
        />
        <s-section>
          {activeSection === "general" && (
            <GeneralTab
              optionSet={optionSet}
              setOptionSet={setOptionSet}
              nameError={nameError}
              setOpenFieldedit={setOpenFieldedit}
              openFieldEdit={openFieldEdit}
            />
          )}
          {activeSection === "fields" && (
            <FieldsTab optionSet={optionSet} setOptionSet={setOptionSet} setOpenFieldedit={setOpenFieldedit}
            openFieldEdit={openFieldEdit} />
          )}
          {activeSection === "products" && (
            <ProductsTab optionSet={optionSet} setOptionSet={setOptionSet} />
          )}
        </s-section>
      </s-grid>
    </s-stack>
  );
}
