// import { useState } from "react";

// export const FIELD_TYPES = [
//   { label: "Text field", value: "text" },
//   { label: "Textarea", value: "textarea" },
//   { label: "Number", value: "number" },
//   { label: "Switch", value: "switch" },
//   { label: "Checkbox", value: "checkbox" },
//   { label: "Radio", value: "radio" },
//   { label: "Button", value: "button" },
//   { label: "Image Swatches", value: "image_swatch" },
//   { label: "Date Field", value: "dateField" },
// ];

// export const PRODUCT_SELECTION_TYPES = [
//   { label: "All Products", value: "all" },
//   { label: "Specific Products", value: "products" },
//   { label: "Collections", value: "collections" },
// ];

// export const TARGET_TYPES = [
//   { label: "Product Page", value: "product" },
//   { label: "Cart", value: "cart" },
// ];

// export const NAV_ITEMS = [
//   { id: "general", label: "General", icon: "settings" },
//   { id: "fields", label: "Fields", icon: "form" },
//   { id: "products", label: "Products", icon: "products" },
// ];

// export const createOptionSet = () => ({
//   id: crypto.randomUUID(),
//   name: "",
//   status: "inactive",
//   target: "product",
//   products: { type: "all", products: [], collections: [] },
//   fields: [],
//   createdAt: new Date().toISOString(),
// });

// export const createField = (label, type, index) => {
//   const baseField = {
//     id: crypto.randomUUID(),
//     label: `${label} ${index + 1}`,
//     fieldType: type,
//     placeholder: "",
//     required: false,
//     addonPrice: 0,
//   };

//   if (["checkbox", "radio", "button"].includes(type)) {
//     baseField.options = [
//       { id: crypto.randomUUID(), name: `${type}_1`, addonPrice: 0 },
//     ];
//     baseField.conditions = { hasCondition: false, rules: [] };
//   } else if (type === "color_swatch") {
//     baseField.options = [
//       { id: crypto.randomUUID(), name: `color_1`, value: "#000000", addonPrice: 0 },
//     ];
//     baseField.conditions = { hasCondition: false, rules: [] };
//   } else if (type === "image_swatch") {
//     baseField.options = [
//       { id: crypto.randomUUID(), name: `image_1`, imageUrl: "", addonPrice: 0 },
//     ];
//     baseField.conditions = { hasCondition: false, rules: [] };
//   } else if (type === "dateField") {
//     baseField.isActive = true;
//     baseField.conditions = { hasCondition: false, rules: [] };
//   } else if (type === "timeField") {
//     baseField.isActive = true;
//     baseField.conditions = { hasCondition: false, rules: [] };
//   }

//   return baseField;
// };

// export const validateOptionSet = (optionSet, allOptionSets) => {
//   if (!optionSet.name?.trim()) return { message: "Name is required" };

//   if (
//     allOptionSets.some(
//       (t) =>
//         t._id !== optionSet._id &&
//         t.name?.trim().toLowerCase() === optionSet.name?.trim().toLowerCase(),
//     )
//   )
//     return { message: "Name must be unique" };

//   if (!optionSet.fields?.length) return { message: "Add at least one field" };

//   for (let i = 0; i < optionSet.fields.length; i++) {
//     const f = optionSet.fields[i];
//     if (!f.label?.trim())
//       return { message: `Field ${i + 1}: Label is required` };
//     if (["checkbox", "radio"].includes(f.fieldType)) {
//       if (!f.options?.length)
//         return { message: `${f.label}: At least one option is required` };
//       if (f.options.some((o) => !o.name?.trim()))
//         return { message: `${f.label}: All options need Option name` };
//     }
//   }

//   const { type, products = [], collections = [] } = optionSet.products || {};
//   if (type === "products" && !products.length)
//     return { message: "Select at least one product" };
//   if (type === "collections" && !collections.length)
//     return { message: "Select at least one collection" };

//   return null;
// };

import { useState } from "react";

export const FIELD_TYPES = [
  { label: "Text field", value: "text" },
  { label: "Textarea", value: "textarea" },
  { label: "Number", value: "number" },
  { label: "Switch", value: "switch" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Radio", value: "radio" },
  { label: "Button", value: "button" },
  { label: "Image Swatches", value: "image_swatch" },
  { label: "Date Field", value: "dateField" },
];

export const PRODUCT_SELECTION_TYPES = [
  { label: "All Products", value: "all" },
  { label: "Specific Products", value: "products" },
  { label: "Collections", value: "collections" },
];

export const TARGET_TYPES = [
  { label: "Product Page", value: "product" },
  { label: "Cart", value: "cart" },
];

export const NAV_ITEMS = [
  { id: "general", label: "General", icon: "settings" },
  { id: "fields", label: "Fields", icon: "form" },
  { id: "products", label: "Products", icon: "products" },
];

export const createOptionSet = () => ({
  id: crypto.randomUUID(),
  name: "",
  status: "inactive",
  target: "product",
  products: { type: "all", products: [], collections: [] },
  fields: [],
  createdAt: new Date().toISOString(),
});

const defaultConditions = () => ({
  hasCondition: false,
  display: "SHOW",
  match: "ALL",
  rules: [],
});

export const createField = (label, type, index) => {
  const baseField = {
    id: crypto.randomUUID(),
    label: `${label} ${index + 1}`,
    fieldType: type,
    placeholder: "",
    required: false,
    addonPrice: 0,
    conditions: defaultConditions(),
  };

  if (["checkbox", "radio", "button"].includes(type)) {
    baseField.options = [
      { id: crypto.randomUUID(), name: `${type}_1`, addonPrice: 0 },
    ];
  } else if (type === "color_swatch") {
    baseField.options = [
      {
        id: crypto.randomUUID(),
        name: `color_1`,
        value: "#000000",
        addonPrice: 0,
      },
    ];
  } else if (type === "image_swatch") {
    baseField.options = [
      {
        id: crypto.randomUUID(),
        name: `image_1`,
        imageUrl: "",
        addonPrice: 0,
      },
    ];
  } else if (type === "dateField" || type === "timeField") {
    baseField.isActive = true;
  }

  return baseField;
};

export const validateOptionSet = (optionSet, allOptionSets) => {
  if (!optionSet.name?.trim()) return { message: "Name is required" };

  if (
    allOptionSets.some(
      (t) =>
        t._id !== optionSet._id &&
        t.name?.trim().toLowerCase() === optionSet.name?.trim().toLowerCase(),
    )
  )
    return { message: "Name must be unique" };

  if (!optionSet.fields?.length) return { message: "Add at least one field" };

  for (let i = 0; i < optionSet.fields.length; i++) {
    const f = optionSet.fields[i];
    if (!f.label?.trim())
      return { message: `Field ${i + 1}: Label is required` };
    if (["checkbox", "radio"].includes(f.fieldType)) {
      if (!f.options?.length)
        return { message: `${f.label}: At least one option is required` };
      if (f.options.some((o) => !o.name?.trim()))
        return { message: `${f.label}: All options need a name` };
    }
  }

  const { type, products = [], collections = [] } = optionSet.products || {};
  if (type === "products" && !products.length)
    return { message: "Select at least one product" };
  if (type === "collections" && !collections.length)
    return { message: "Select at least one collection" };

  return null;
};

/**
 * Evaluate a field's conditions against the current form values.
 * Returns true if the field should be VISIBLE, false if hidden.
 *
 * @param {object} field - The field definition (with .conditions)
 * @param {object} formValues - Map of fieldId → current value
 * @param {Array}  allFields  - All fields in the option set (for type lookups)
 */
export const evaluateConditions = (field, formValues, allFields) => {
  const cond = field.conditions;
  if (!cond?.hasCondition || !cond.rules?.length) return true;

  const results = cond.rules.map((rule) => {
    if (rule.fieldId === "none") return true;

    const sourceField = allFields.find((f) => f.id === rule.fieldId);
    if (!sourceField) return true;

    const currentVal = formValues[rule.fieldId];

    if (sourceField.fieldType === "switch") {
      const isOn = !!currentVal;
      if (rule.operator === "ON") return isOn;
      if (rule.operator === "OFF") return !isOn;
      return true;
    }

    const strVal = String(currentVal ?? "").toLowerCase();
    const ruleVal = String(rule.value ?? "").toLowerCase();

    switch (rule.operator) {
      case "EQUALS":
        return strVal === ruleVal;
      case "NOTEQUALS":
        return strVal !== ruleVal;
      case "CONTAIN":
        return strVal.includes(ruleVal);
      case "DOESNOTCONTAIN":
        return !strVal.includes(ruleVal);
      case "LESS":
        return Number(currentVal) < Number(rule.value);
      case "GREATER":
        return Number(currentVal) > Number(rule.value);
      default:
        return true;
    }
  });

  const allPass = cond.match === "ALL"
    ? results.every(Boolean)
    : results.some(Boolean);

  return cond.display === "SHOW" ? allPass : !allPass;
};