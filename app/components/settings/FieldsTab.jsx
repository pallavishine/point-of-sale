// import { useState } from "react";
// import { FIELD_TYPES, createField } from "../../utils/optionSetHelpers";
// import OptionsEditor from "./OptionsEditor";
// import  ColorSwatchEditor  from "./ColorSwatchEditor";
// import  ImageSwatchEditor  from "./ImageSwatchEditor";
// import  DateConfig  from "./DateConfig";

// function FieldsTab({ optionSet, setOptionSet ,setOpenFieldedit,openFieldEdit}) {
//   const [editingField, setEditingField] = useState(null);
//   const [isNew, setIsNew] = useState(false);

//   const openCreate = (label, type) => {
//     setIsNew(true);
//     setEditingField(createField(label, type, optionSet.fields.length));
//     setOpenFieldedit(true)
//   };

//   const openEdit = (f) => {
//     setIsNew(false);
//     setEditingField(f);
//     setOpenFieldedit(true)
//   };

//   const handleSave = (savedField) => {
//     setOptionSet((prev) => ({
//       ...prev,
//       fields: isNew
//         ? [...prev.fields, savedField]
//         : prev.fields.map((f) => (f.id === savedField.id ? savedField : f)),
//     }));
//     setEditingField(null);
//     setOpenFieldedit(false)
//   };

//   const handleDelete = (id) => {
//     setOptionSet((prev) => ({
//       ...prev,
//       fields: prev.fields.filter((f) => f.id !== id),
//     }));
//   };

//   // Render field editor based on type
//   const renderFieldEditor = () => {
//     const fieldType = editingField.fieldType;
//     const isOptionType = ["checkbox", "radio", "color_swatch", "image_swatch","button"].includes(fieldType);
//     const isDateTimeType = ["dateField", "timeField"].includes(fieldType);

//     return (
//       <s-stack gap="small-200">
//         <s-button
//           variant="tertiary"
//           icon="arrow-left"
//           accessibilityLabel="icon"
//           onClick={() => {
//             setEditingField(null);
//             setOpenFieldedit(false);
//           }}
//         >
//           {editingField.label}
//         </s-button>
//         <s-divider />

//         {/* Common fields */}
//         <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
//           <s-grid-item gridColumn={"span 6"}>
//             <s-text-field
//               label="Label"
//               value={editingField.label}
//               onInput={(e) =>
//                 setEditingField((f) => ({ ...f, label: e.target.value }))
//               }
//             />
//           </s-grid-item>
//           <s-grid-item gridColumn={"span 6"}>
//             <s-text-field
//               label="Placeholder"
//               value={editingField.placeholder || ""}
//               onInput={(e) =>
//                 setEditingField((f) => ({ ...f, placeholder: e.target.value }))
//               }
//             />
//           </s-grid-item>
//           {![
//             "checkbox",
//             "radio",
//             "color_swatch",
//             "image_swatch",
//             "button",
//           ].includes(fieldType) && (
//             <s-grid-item gridColumn="span 6">
//               <s-number-field
//                 label="Add-on Price"
//                 value={editingField.addonPrice ?? 0}
//                 helpText="Extra charge added when customer fills this field."
//                 onChange={(e) =>
//                   setEditingField((f) => ({
//                     ...f,
//                     addonPrice: Number(e.target.value),
//                   }))
//                 }
//               />
//             </s-grid-item>
//           )}
//         </s-grid>

//         {/* Options editor for checkbox, radio, color_swatch, image_swatch */}
//         {fieldType === "button" && (
//           <OptionsEditor field={editingField} setField={setEditingField} />
//         )}
//         {fieldType === "checkbox" && (
//           <OptionsEditor field={editingField} setField={setEditingField} />
//         )}

//         {fieldType === "radio" && (
//           <OptionsEditor field={editingField} setField={setEditingField} />
//         )}

//         {fieldType === "color_swatch" && (
//           <ColorSwatchEditor field={editingField} setField={setEditingField} />
//         )}

//         {fieldType === "image_swatch" && (
//           <ImageSwatchEditor field={editingField} setField={setEditingField} />
//         )}

//         {/* Date/Time configuration */}
//         {isDateTimeType && (
//           <DateConfig
//             field={editingField}
//             setField={setEditingField}
//             fieldType={fieldType}
//           />
//         )}

//         {/* {fieldType === "button" && (
//           <s-box border="base" padding="base" borderRadius="base">
//               <s-text-field
//                 label="Button URL (optional)"
//                 value={editingField.buttonUrl || ""}
//                 helpText="Redirect to this URL when clicked"
//                 onInput={(e) =>
//                   setEditingField((f) => ({ ...f, buttonUrl: e.target.value }))
//                 }
//               />
//           </s-box>
//         )} */}

//         <s-stack direction="inline" justifyContent="end" gap="small">
//           <s-button
//             variant="tertiary"
//             onClick={() => {
//               setEditingField(null);
//               setOpenFieldedit(false);
//             }}
//           >
//             Cancel
//           </s-button>
//           <s-button
//             variant="primary"
//             disabled={!editingField.label?.trim()}
//             onClick={() => handleSave(editingField)}
//           >
//             {isNew ? "Add Field" : "Update Field"}
//           </s-button>
//         </s-stack>
//       </s-stack>
//     );
//   };

//   if (editingField && openFieldEdit) {
//     return renderFieldEditor();
//   }

//   return (
//     <s-stack gap="small-200">
//       <s-stack
//         direction="inline"
//         justifyContent="space-between"
//         alignItems="center"
//       >
//         <s-stack gap="none">
//           <s-heading>Custom Fields</s-heading>
//           <s-text tone="subdued">
//             Define the input fields customers will fill in.
//           </s-text>
//         </s-stack>
//         <s-badge tone={optionSet.fields?.length > 0 ? "success" : "neutral"}>
//           {optionSet.fields?.length || 0} field
//           {optionSet.fields?.length !== 1 ? "s" : ""}
//         </s-badge>
//       </s-stack>
//       <s-divider />

//       {!optionSet.fields.length && (
//         <s-box padding="large" background="subdued" borderRadius="base">
//           <s-stack gap="small" alignItems="center">
//             <s-icon type="form" size="large" />
//             <s-text tone="subdued">No fields yet. Add one below.</s-text>
//           </s-stack>
//         </s-box>
//       )}

//       {optionSet.fields.map((f) => (
//         <s-clickable key={f.id} onClick={() => openEdit(f)}>
//           <s-box border="base" padding="small-200" borderRadius="base">
//             <s-stack
//               direction="inline"
//               justifyContent="space-between"
//               alignItems="center"
//             >
//               <s-stack gap="none">
//               <s-heading  >{f.label}</s-heading>
//               </s-stack>
//               <s-stack direction="inline" gap="none">
//                 <s-button
//                   variant="tertiary"
//                   icon="duplicate"
//                   accessibilityLabel="Duplicate field"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     const dupe = {
//                       ...f,
//                       id: crypto.randomUUID(),
//                       label: `${f.label} (Copy)`,
//                     };
//                     setOptionSet((prev) => ({
//                       ...prev,
//                       fields: [...prev.fields, dupe],
//                     }));
//                   }}
//                 />
//                 <s-button
//                   variant="tertiary"
//                   icon="edit"
//                   accessibilityLabel="Edit field"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     openEdit(f);
//                   }}
//                 />
//                 <s-button
//                   tone="critical"
//                   variant="tertiary"
//                   icon="delete"
//                   accessibilityLabel="Delete field"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     handleDelete(f.id);
//                   }}
//                 />
//               </s-stack>
//             </s-stack>
//           </s-box>
//         </s-clickable>
//       ))}

//       <s-box border="base" padding="base" borderRadius="base">
//         <s-stack gap="small">
//           <s-text fontWeight="semibold">Add New Field</s-text>
//           <s-stack direction="inline" gap="small" style={{ flexWrap: "wrap" }}>
//             {FIELD_TYPES.map(({ label, value }) => (
//               <s-button
//                 key={value}
//                 variant="secondary"
//                 onClick={() => openCreate(label, value)}
//               >
//                 + {label}
//               </s-button>
//             ))}
//           </s-stack>
//         </s-stack>
//       </s-box>
//     </s-stack>
//   );
// }

// export default FieldsTab;

import { useState } from "react";
import { FIELD_TYPES, createField } from "../../utils/optionSetHelpers";
import OptionsEditor from "./OptionsEditor";
import ColorSwatchEditor from "./ColorSwatchEditor";
import ImageSwatchEditor from "./ImageSwatchEditor";
import DateConfig from "./DateConfig";
import ConditionEditor from "./ConditionEditor";

const EDITOR_TABS = [
  { id: "settings", label: "Settings" },
  { id: "conditions", label: "Conditions" },
];

function FieldsTab({
  optionSet,
  setOptionSet,
  setOpenFieldedit,
  openFieldEdit,
}) {
  const [editingField, setEditingField] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");

  const openCreate = (label, type) => {
    setIsNew(true);
    setEditingField(createField(label, type, optionSet.fields.length));
    setOpenFieldedit(true);
    setActiveTab("settings");
  };

  const openEdit = (f) => {
    setIsNew(false);
    setEditingField(f);
    setOpenFieldedit(true);
    setActiveTab("settings");
  };

  const handleSave = (savedField) => {
    setOptionSet((prev) => ({
      ...prev,
      fields: isNew
        ? [...prev.fields, savedField]
        : prev.fields.map((f) => (f.id === savedField.id ? savedField : f)),
    }));
    setEditingField(null);
    setOpenFieldedit(false);
  };

  const handleDelete = (id) => {
    setOptionSet((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
    }));
  };

  const handleMoveUp = (e, index) => {
    e.stopPropagation();
    if (index === 0) return;
    setOptionSet((prev) => {
      const fields = [...prev.fields];
      [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
      return { ...prev, fields };
    });
  };

  const handleMoveDown = (e, index) => {
    e.stopPropagation();
    const len = optionSet.fields.length;
    if (index === len - 1) return;
    setOptionSet((prev) => {
      const fields = [...prev.fields];
      [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
      return { ...prev, fields };
    });
  };

  const getPriorFields = (targetField) => {
    const idx = optionSet.fields.findIndex((f) => f.id === targetField.id);
    if (idx <= 0) return [];
    return optionSet.fields.slice(0, idx);
  };

  const renderSettingsTab = () => {
    const fieldType = editingField.fieldType;

    return (
      <s-stack gap="small-200">
        <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
          <s-grid-item gridColumn="span 6">
            <s-text-field
              label="Label"
              value={editingField.label}
              onInput={(e) =>
                setEditingField((f) => ({ ...f, label: e.target.value }))
              }
            />
          </s-grid-item>
          <s-grid-item gridColumn="span 6">
            <s-text-field
              label="Placeholder"
              value={editingField.placeholder || ""}
              onInput={(e) =>
                setEditingField((f) => ({
                  ...f,
                  placeholder: e.target.value,
                }))
              }
            />
          </s-grid-item>
          {![
            "checkbox",
            "radio",
            "color_swatch",
            "image_swatch",
            "button",
          ].includes(fieldType) && (
            <s-grid-item gridColumn="span 6">
              <s-number-field
                label="Add-on Price"
                value={editingField.addonPrice ?? 0}
                helpText="Extra charge when customer fills this field."
                onChange={(e) =>
                  setEditingField((f) => ({
                    ...f,
                    addonPrice: Number(e.target.value),
                  }))
                }
              />
            </s-grid-item>
          )}
         
        </s-grid>

        {fieldType === "button" && (
          <OptionsEditor field={editingField} setField={setEditingField} />
        )}
        {fieldType === "checkbox" && (
          <OptionsEditor field={editingField} setField={setEditingField} />
        )}
        {fieldType === "radio" && (
          <OptionsEditor field={editingField} setField={setEditingField} />
        )}
        {fieldType === "color_swatch" && (
          <ColorSwatchEditor field={editingField} setField={setEditingField} />
        )}
        {fieldType === "image_swatch" && (
          <ImageSwatchEditor field={editingField} setField={setEditingField} />
        )}
        {["dateField", "timeField"].includes(fieldType) && (
          <DateConfig
            field={editingField}
            setField={setEditingField}
            fieldType={fieldType}
          />
        )}
      </s-stack>
    );
  };

  const renderConditionsTab = () => {
    const priorFields = isNew ? [] : getPriorFields(editingField);
    return (
      <ConditionEditor
        field={editingField}
        setField={setEditingField}
        allPriorFields={priorFields}
      />
    );
  };

  if (editingField && openFieldEdit) {
    return (
      <s-stack gap="small-200">
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-button
            variant="tertiary"
            icon="arrow-left"
            accessibilityLabel="Back to fields list"
            onClick={() => {
              setEditingField(null);
              setOpenFieldedit(false);
            }}
          >
            {editingField.label || "New Field"}
          </s-button>
          <s-switch
            label="Required"
            labelAccessibilityVisibility="visible"
            checked={editingField?.required}
            onChange={(e) => {
              console.log("required", e.target?.checked);
              setEditingField((f) => ({
                ...f,
                required: e.target?.checked ?? false,
              }));
            }}
          />
        </s-stack>

        <s-divider />

        {/* <s-stack direction="inline" gap="small-100">
          {EDITOR_TABS.map((tab) => (
            <s-clickable-chip
              key={tab.id}
              color={activeTab === tab.id ? "strong" : "subdued"}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </s-clickable-chip>
          ))}
        </s-stack> */}

        {renderSettingsTab()}
        <s-divider />
        {renderConditionsTab()}

        <s-stack direction="inline" justifyContent="end" gap="small">
          <s-button
            variant="tertiary"
            onClick={() => {
              setEditingField(null);
              setOpenFieldedit(false);
            }}
          >
            Cancel
          </s-button>
          <s-button
            variant="primary"
            disabled={!editingField.label?.trim()}
            onClick={() => handleSave(editingField)}
          >
            {isNew ? "Add Field" : "Update Field"}
          </s-button>
        </s-stack>
      </s-stack>
    );
  }

  return (
    <s-stack gap="small-200">
      <s-stack
        direction="inline"
        justifyContent="space-between"
        alignItems="center"
      >
        <s-stack gap="none">
          <s-heading>Custom Fields</s-heading>
          <s-text tone="subdued">
            Define the input fields customers will fill in.
          </s-text>
        </s-stack>
        <s-badge tone={optionSet.fields?.length > 0 ? "success" : "neutral"}>
          {optionSet.fields?.length || 0} field
          {optionSet.fields?.length !== 1 ? "s" : ""}
        </s-badge>
      </s-stack>

      <s-divider />

      {!optionSet.fields.length && (
        <s-box padding="large" background="subdued" borderRadius="base">
          <s-stack gap="small" alignItems="center">
            <s-icon type="form" size="large" />
            <s-text tone="subdued">No fields yet. Add one below.</s-text>
          </s-stack>
        </s-box>
      )}

      {optionSet.fields.map((f, index) => {
        const hasCondition =
          f.conditions?.hasCondition && f.conditions.rules?.length > 0;
        const hasAddon = f.addonPrice && f.addonPrice > 0;
        const isFirst = index === 0;
        const isLast = index === optionSet.fields.length - 1;

        return (
          <s-clickable key={f.id} onClick={() => openEdit(f)}>
            <s-box border="base" padding="small-200" borderRadius="base">
              <s-stack
                direction="inline"
                justifyContent="space-between"
                alignItems="center"
              >
                <s-stack gap="none">
                  <s-stack
                    direction="inline"
                    gap="small-100"
                    alignItems="center"
                  >
                    <s-heading>{f.label}</s-heading>
                    {f.required === true && (
                      <s-badge tone="critical">Required</s-badge>
                    )}
                    {hasAddon ? <s-badge tone="success">Addon</s-badge> : <></>}
                    {hasCondition && <s-badge tone="info">Conditional</s-badge>}
                  </s-stack>
                </s-stack>

                <s-stack direction="inline" gap="none">
                  <s-button
                    variant="tertiary"
                    icon="arrow-up"
                    accessibilityLabel="Move field up"
                    disabled={isFirst}
                    onClick={(e) => handleMoveUp(e, index)}
                  />
                  <s-button
                    variant="tertiary"
                    icon="arrow-down"
                    accessibilityLabel="Move field down"
                    disabled={isLast}
                    onClick={(e) => handleMoveDown(e, index)}
                  />
                  <s-button
                    variant="tertiary"
                    icon="duplicate"
                    accessibilityLabel="Duplicate field"
                    onClick={(e) => {
                      e.stopPropagation();
                      const dupe = {
                        ...f,
                        id: crypto.randomUUID(),
                        label: `${f.label} (Copy)`,
                        conditions: {
                          hasCondition: false,
                          display: "SHOW",
                          match: "ALL",
                          rules: [],
                        },
                      };
                      setOptionSet((prev) => ({
                        ...prev,
                        fields: [...prev.fields, dupe],
                      }));
                    }}
                  />
                  <s-button
                    variant="tertiary"
                    icon="edit"
                    accessibilityLabel="Edit field"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(f);
                    }}
                  />
                  <s-button
                    tone="critical"
                    variant="tertiary"
                    icon="delete"
                    accessibilityLabel="Delete field"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(f.id);
                    }}
                  />
                </s-stack>
              </s-stack>
            </s-box>
          </s-clickable>
        );
      })}

      <s-box border="base" padding="base" borderRadius="base">
        <s-stack gap="small">
          <s-text fontWeight="semibold">Add New Field</s-text>
          <s-stack direction="inline" gap="small" style={{ flexWrap: "wrap" }}>
            {FIELD_TYPES.map(({ label, value }) => (
              <s-button
                key={value}
                variant="secondary"
                onClick={() => openCreate(label, value)}
              >
                + {label}
              </s-button>
            ))}
          </s-stack>
        </s-stack>
      </s-box>
    </s-stack>
  );
}

export default FieldsTab;
