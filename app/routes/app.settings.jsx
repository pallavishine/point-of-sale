// // app/routes/settings.jsx
// import { settingsModel } from "../db.schema";
// import { authenticate } from "../shopify.server";
// import { useState } from "react";
// import { useLoaderData, useFetcher, useNavigate } from "react-router";

// const POS_FIELD_TYPES = [
//   { label: "Text field", value: "text" },
//   { label: "Textarea", value: "textarea" },
//   { label: "Email", value: "email" },
//   { label: "Number", value: "number" },
//   { label: "Checkbox", value: "checkbox" },
//   { label: "Radio", value: "radio" },
//   { label: "Switch", value: "switch" },
//   { label: "Date Field", value: "dateField" },
//   { label: "Date Picker", value: "datePicker" },
//   { label: "Time Field", value: "timeField" },
//   { label: "Time Picker", value: "timePicker" },
// ];

// export async function loader({ request }) {
//   const { session } = await authenticate.admin(request);

//   const settingsData = await settingsModel.findOne(
//     {
//       shop: session.shop,
//     }
//   );
//   console.log("settingsData====>", JSON.parse(JSON.stringify(settingsData))?.fields);
//   return {
//     initialFields: JSON.parse(JSON.stringify(settingsData))?.fields ?? [],
//     shop: session.shop,
//   };
// }

// export async function action({ request }) {
//   const { session } = await authenticate.admin(request);

//   const formData = await request.formData();
//   const fields = JSON.parse(formData.get("data")??[]);

//   console.log("Saving:", fields);
//   const ddtta = await settingsModel.findOneAndUpdate(
//     { shop: session.shop },
//     {
//       shop: session?.shop,
//       fields:fields,
//       // discounts:{}
//     },
//     {new:true,upsert:true}
//   );
//   console.log("ddttaddtta",ddtta)
//   return { success: true };
// }

// const createEmptyField = (fieldType, index) => {
//   const WITH_OPTIONS = ["checkbox", "radio"];
//   const hasOptions = WITH_OPTIONS.includes(fieldType);

//   const typeLabel =
//     POS_FIELD_TYPES.find((el) => el.value === fieldType)?.label || "Field";

//   return {
//     id: crypto.randomUUID(),
//     label: `${typeLabel} ${index + 1}`,
//     fieldType,
//     placeholder: "",
//     required: false,
//     ...(hasOptions && {
//       options: [{ label: "Option 1", value: "option_1" }],
//     }),
//     products: [],
//     helpText: "",
//     order: index,
//   };
// };

// function OptionsEditor({ field, setField }) {
//   const addOption = () => {
//     setField((f) => {
//       const length = (f.options || []).length + 1;
//       const defaultValue = `option_${length + 1}`;

//       return {
//         ...f,
//         options: [
//           ...(f.options || []),
//           {
//             label: defaultValue,
//             value: defaultValue,
//           },
//         ],
//       };
//     });
//   };
//   const delOption = (index) => {
//     if (field.options?.length == 1) {
//       shopify.toast.show("Minimum one option is required", { isError: true });
//       return;
//     }
//     setField((f) => {
//       const updatedOptions = [...(f.options || [])];

//       updatedOptions.splice(index, 1);

//       return {
//         ...f,
//         options: updatedOptions,
//       };
//     });
//   };

//   const handleChangeOption = (value, index) => {
//     setField((f) => {
//       const updatedOptions = [...(f.options || [])];

//       updatedOptions[index] = {
//         label: value,
//         value: value.toLowerCase().replace(/\s+/g, "_"),
//       };

//       return {
//         ...f,
//         options: updatedOptions,
//       };
//     });
//   };

//   return (
//     <s-box paddingBlock="large">
//       <s-stack gap="small">
//         <s-heading>Options :</s-heading>

//         {field.options?.map((opt, index) => (
//           <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
//             <s-grid-item gridRow="span 1" gridColumn="span 11">
//               <s-text-field
//                 key={index}
//                 value={opt.label}
//                 onInput={(e) => handleChangeOption(e.target.value, index)}
//               />
//             </s-grid-item>
//             <s-grid-item gridRow="span 1" gridColumn="span 1">
//               <s-button
//                 icon="delete"
//                 variant="tertiary"
//                 tone="critical"
//                 onClick={() => delOption(index)}
//               />
//             </s-grid-item>
//           </s-grid>
//         ))}

//         <s-stack direction="inline" justifyContent="end">
//           <s-button onClick={addOption}>+ Add more option</s-button>
//         </s-stack>
//       </s-stack>
//     </s-box>
//   );
// }

// export default function SettingsPage() {
//   const { initialFields, shop } = useLoaderData();
//   console.log(initialFields, shop);
//   const fetcher = useFetcher();
//   const navigate = useNavigate();

//   const [posFields, setPosFields] = useState(initialFields);
//   const [mode, setMode] = useState("list"); // list | add | edit
//   const [activeField, setActiveField] = useState(null);

//   const handleSave = () => {
//     const formData = new FormData();
//     formData.append("data", JSON.stringify(posFields));
//     fetcher.submit(formData, { method: "post" });
//   };

//   const resetToList = () => {
//     setMode("list");
//     setActiveField(null);
//   };

//   const upsertField = (field) => {
//     setPosFields((prev) => {
//       const exists = prev.some((f) => f.id === field.id);
//       const next = exists
//         ? prev.map((f) => (f.id === field.id ? field : f))
//         : [...prev, field];

//       return next;
//     });

//     resetToList();
//   };

//   const removeField = (fieldId) => {
//     setPosFields((prev) => {
//       const next = prev.filter((f) => f.id !== fieldId);
//       return next;
//     });

//     if (activeField?.id === fieldId) {
//       resetToList();
//     }
//   };

//   const startAddFlow = () => {
//     setMode("add");
//     setActiveField(null);
//   };

//   const startEditFlow = (field) => {
//     setMode("edit");
//     setActiveField(field);
//   };

//   const selectFieldType = (fieldType) => {
//     setActiveField(createEmptyField(fieldType, posFields.length));
//   };

//   const saveActiveField = () => {
//     if (!activeField) return;
//     upsertField(activeField);
//   };

//   return (
//     <s-page heading="Settings">
//       <s-box paddingInline="none" paddingBlock="small">
//         <s-stack direction="inline" gap="none" justifyContent="space-between">
//           <s-stack direction="inline" gap="small">
//             <s-icon
//               type="arrow-left"
//               style={{ cursor: "pointer" }}
//               onClick={() => {
//                 navigate("/app");
//               }}
//             />
//           </s-stack>
//           <s-button variant="primary" onClick={() => handleSave()}>
//             Save
//           </s-button>
//         </s-stack>
//       </s-box>
//       <s-section heading="POS Fields">
//         <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="base">
//           <s-grid-item gridColumn="span 2.5" gridRow="span 1">
//             <s-box
//               border="base"
//               padding="small"
//               background="subdued"
//               borderRadius="base"
//             >
//               <s-stack  gap="small">
//                 <s-clickable
//                   padding="small-200"
//                   border="base"
//                   background="subdued"
//                   borderRadius="base"
//                   onClick={resetToList}
//                 >
//                   Field
//                 </s-clickable>
//                 <s-clickable
//                   padding="small-200"
//                   border="base"
//                   background="subdued"
//                   borderRadius="base"
//                 >
//                   Product
//                 </s-clickable>
//               </s-stack>
//             </s-box>
//           </s-grid-item>
//           <s-grid-item gridColumn="span 9.5" gridRow="span 1">
//             <s-box border="base" padding="small" borderRadius="base">
//               {mode === "list" && (
//                 <s-stack gap="small">
//                   {posFields?.map((field) => (
//                     <s-box key={field.id} border="base" padding="small-200">
//                       <s-stack
//                         direction="inline"
//                         justifyContent="space-between"
//                       >
//                         <s-text>{field.label}</s-text>

//                         <s-stack direction="inline">
//                           <s-button
//                             variant="tertiary"
//                             icon="edit"
//                             onClick={() => startEditFlow(field)}
//                           />

//                           <s-button
//                             variant="tertiary"
//                             icon="delete"
//                             tone="critical"
//                             onClick={() => removeField(field.id)}
//                           />
//                         </s-stack>
//                       </s-stack>
//                     </s-box>
//                   ))}

//                   <s-clickable
//                     border="base"
//                     padding="small"
//                     background="subdued"
//                     borderRadius="base"
//                     onClick={startAddFlow}
//                   >
//                     Add new Field
//                   </s-clickable>
//                 </s-stack>
//               )}

//               {(mode === "add" || mode === "edit") && (
//                 <s-stack gap="small">
//                   <s-button
//                     variant="tertiary"
//                     onClick={resetToList}
//                     icon="arrow-left"
//                   >
//                     {activeField?.label}
//                   </s-button>
//                   {!activeField && mode === "add" && (
//                     <s-stack gap="small">
//                       <s-grid gridTemplateColumns="repeat(3, 4fr)" gap="small">
//                         {POS_FIELD_TYPES.map(({ label, value }) => (
//                           <s-grid-item key={value}>
//                             <s-clickable onClick={() => selectFieldType(value)}>
//                               <s-box
//                                 padding="small"
//                                 background="subdued"
//                                 borderRadius="base"
//                               >
//                                 <s-section>
//                                   <s-heading>{label}</s-heading>
//                                 </s-section>
//                               </s-box>
//                             </s-clickable>
//                           </s-grid-item>
//                         ))}
//                       </s-grid>
//                     </s-stack>
//                   )}

//                   {activeField && (
//                     <s-box border="base" padding="base">
//                       <s-text-field
//                         label="Label"
//                         value={activeField.label}
//                         onInput={(e) =>
//                           setActiveField((f) => ({
//                             ...f,
//                             label: e.target.value,
//                           }))
//                         }
//                       />

//                       <s-text-field
//                         label="Placeholder"
//                         value={activeField.placeholder}
//                         onInput={(e) =>
//                           setActiveField((f) => ({
//                             ...f,
//                             placeholder: e.target.value,
//                           }))
//                         }
//                       />

//                       <s-checkbox
//                         label="Required"
//                         checked={activeField.required}
//                         onChange={(e) =>

//                         {
//                           console.log(e.target.checked,"sldjksadjskd")

//                           setActiveField((f) => ({
//                             ...f,
//                             required: e.target.checked,
//                           }))}
//                         }
//                       />

//                       {["checkbox", "radio"].includes(
//                         activeField.fieldType,
//                       ) && (
//                         <OptionsEditor
//                           field={activeField}
//                           setField={setActiveField}
//                         />
//                       )}

//                       <s-stack direction="inline" justifyContent="end">
//                         {mode === "edit" && (
//                           <s-button
//                             variant="tertiary"
//                             tone="critical"
//                             onClick={() => removeField(activeField.id)}
//                           >
//                             Remove
//                           </s-button>
//                         )}

//                         <s-button variant="primary" onClick={saveActiveField}>
//                           {mode == "add" ? "Add" : "Update"}
//                         </s-button>
//                       </s-stack>
//                     </s-box>
//                   )}
//                 </s-stack>
//               )}
//             </s-box>
//           </s-grid-item>
//         </s-grid>
//       </s-section>

//       {/* ─── LIVE PREVIEW ─── */}
//       <s-box slot="aside">
//         <s-section heading="Preview">
//           {posFields.map((field) => {
//             switch (field.fieldType) {
//               case "text":
//                 return <s-text-field key={field.id} label={field.label} />;

//               case "textarea":
//                 return <s-text-area key={field.id} label={field.label} />;

//               case "number":
//                 return <s-number-field key={field.id} label={field.label} />;

//               case "email":
//                 return <s-email-field key={field.id} label={field.label} />;

//               case "switch":
//                 return <s-switch key={field.id} label={field.label} />;

//               case "checkbox":
//                 return (
//                   <s-choice-list key={field.id} label={field.label} multiple>
//                     {field.options?.map((opt) => (
//                       <s-choice key={opt.value} value={opt.value}>
//                         {opt.label}
//                       </s-choice>
//                     ))}
//                   </s-choice-list>
//                 );

//               case "radio":
//                 return (
//                   <s-choice-list key={field.id} label={field.label}>
//                     {field.options?.map((opt) => (
//                       <s-choice key={opt.value} value={opt.value}>
//                         {opt.label}
//                       </s-choice>
//                     ))}
//                   </s-choice-list>
//                 );

//               default:
//                 return null;
//             }
//           })}
//         </s-section>
//       </s-box>
//     </s-page>
//   );
// }

// app/routes/settings.jsx

import { settingsModel } from "../db.schema";
import { authenticate } from "../shopify.server";
import { useState } from "react";
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
  // { label: "Date Picker", value: "datePicker" },
  { label: "Time Field", value: "timeField" },
  // { label: "Time Picker", value: "timePicker" },
];

// ---------- LOADER ----------
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const data = await settingsModel.findOne({ shop: session.shop });

  return {
    templates: JSON.parse(JSON.stringify(data))?.templates ?? [],
  };
}

// ---------- ACTION ----------
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  let templates = [];
  try {
    templates = JSON.parse(formData.get("data") || "[]");
  } catch {}

  await settingsModel.findOneAndUpdate(
    { shop: session.shop },
    { shop: session.shop, templates },
    { upsert: true },
  );

  return { success: true };
}

// ---------- HELPERS ----------
const createTemplate = () => ({
  id: crypto.randomUUID(),
  name: "",
  products: [],
  fields: [],
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

        {options.map((opt) => (
          <s-box key={opt.id} border="base" padding="small">
            <s-stack gap="small">
              <s-text-field
                label="Label"
                value={opt.label}
                onInput={(e) => updateOption(opt.id, "label", e.target.value)}
              />

              <s-text-field
                label="Value"
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
                Remove
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

// ---------- PRODUCT SELECTOR ----------
function ProductSelector({ template, setTemplate }) {
  const openPicker = async () => {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
    });

    if (!selection) return;

    setTemplate((t) => ({
      ...t,
      products: selection.map((p) => ({
        id: p.id,
        title: p.title,
      })),
    }));
  };

  return (
    <s-box border="base" padding="base">
      <s-stack gap="small">
        <s-stack direction="inline" justifyContent="space-between">
          <s-heading>Products</s-heading>
          <s-button onClick={openPicker}>Select</s-button>
        </s-stack>

        {template.products.length === 0 && (
          <s-text tone="subdued">No products selected</s-text>
        )}

        {template.products.map((p) => (
          <s-stack key={p.id} direction="inline" justifyContent="space-between">
            <s-text>{p.title}</s-text>
            <s-button
              tone="critical"
              variant="tertiary"
              onClick={() =>
                setTemplate((t) => ({
                  ...t,
                  products: t.products.filter((x) => x.id !== p.id),
                }))
              }
            >
              Remove
            </s-button>
          </s-stack>
        ))}
      </s-stack>
    </s-box>
  );
}

// ---------- MAIN ----------
export default function SettingsPage() {
  const { templates: initialTemplates } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState(initialTemplates);
  const [mode, setMode] = useState("list");
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [activeField, setActiveField] = useState(null);

  const saveTemplate = () => {
    const updated = templates.some((t) => t.id === activeTemplate.id)
      ? templates.map((t) => (t.id === activeTemplate.id ? activeTemplate : t))
      : [...templates, activeTemplate];

    setTemplates(updated);

    const fd = new FormData();
    fd.append("data", JSON.stringify(updated));
    fetcher.submit(fd, { method: "post" });

    setMode("list");
  };

  return (
    <s-page heading="Template Builder">
      {/* LIST */}
      {mode === "list" && (
        <s-stack gap="base">
          <s-stack direction="inline" justifyContent="space-between">
            <s-button onClick={() => navigate("/app")}>Back</s-button>
            <s-button
              variant="primary"
              onClick={() => {
                setActiveTemplate(createTemplate());
                setMode("editor");
              }}
            >
              + Create Template
            </s-button>
          </s-stack>

          {templates.length === 0 ? (
            <s-box padding="large" border="base">
              <s-text>No templates yet</s-text>
            </s-box>
          ) : (
            templates.map((t) => (
              <s-box key={t.id} border="base" padding="base">
                <s-stack direction="inline" justifyContent="space-between">
                  <s-text>{t.name}</s-text>

                  <s-stack direction="inline">
                    <s-button
                      onClick={() => {
                        setActiveTemplate(t);
                        setMode("editor");
                      }}
                    >
                      Edit
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-box>
            ))
          )}
        </s-stack>
      )}

      {/* EDITOR */}
      {mode === "editor" && activeTemplate && (
        <s-stack gap="base">
          <s-stack direction="inline" justifyContent="space-between">
            <s-button onClick={() => setMode("list")}>Back</s-button>
            <s-button variant="primary" onClick={saveTemplate}>
              Save Template
            </s-button>
          </s-stack>

          <s-box border="base" padding="base">
            <s-stack gap="base">
              <s-text-field
                label="Template Name"
                value={activeTemplate.name}
                onInput={(e) =>
                  setActiveTemplate((t) => ({
                    ...t,
                    name: e.target.value,
                  }))
                }
              />

              <ProductSelector
                template={activeTemplate}
                setTemplate={setActiveTemplate}
              />

              {/* FIELDS */}
              <s-heading>Fields</s-heading>

              {activeTemplate.fields.map((f) => (
                <s-box key={f.id} border="base" padding="small">
                  <s-stack direction="inline" justifyContent="space-between">
                    <s-text>{f.label}</s-text>
                    <s-stack direction="inline">
                      <s-button onClick={() => setActiveField(f)}>
                        Edit
                      </s-button>
                      <s-button
                        onClick={() => {
                          setActiveTemplate((t) => ({
                            ...t,
                            fields: t.fields.filter((x) => x.id !== f.id),
                          }));
                          setActiveField(null);
                        }}
                      >
                        Delete
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-box>
              ))}

              {!activeField && (
                <s-stack direction="inline" wrap>
                  {FIELD_TYPES.map((t) => (
                    <s-button
                      key={t.value}
                      onClick={() =>
                        setActiveField(
                          createField(t.value, activeTemplate.fields.length),
                        )
                      }
                    >
                      + {t.label}
                    </s-button>
                  ))}
                </s-stack>
              )}

              {/* FIELD EDITOR */}
              {activeField && (
                <s-box border="base" padding="base">
                  <s-stack gap="base">
                    <s-heading>Edit Field</s-heading>

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

                    {!["radio", "checkbox"].includes(activeField.fieldType) && (
                      <s-number-field
                        label="Addon Price (₹)"
                        value={activeField.addonPrice || ""}
                        onChange={(e) =>
                          setActiveField((f) => ({
                            ...f,
                            addonPrice: Number(e.target.value),
                          }))
                        }
                      />
                    )}

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

                    <s-stack direction="inline" justifyContent="end">
                      <s-button onClick={() => setActiveField(null)}>
                        Discard
                      </s-button>

                      <s-button
                        variant="primary"
                        onClick={() => {
                          setActiveTemplate((t) => ({
                            ...t,
                            fields: [
                              ...t.fields.filter(
                                (f) => f.id !== activeField.id,
                              ),
                              activeField,
                            ],
                          }));
                          setActiveField(null);
                        }}
                      >
                        Save Field
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-box>
              )}
            </s-stack>
          </s-box>
        </s-stack>
      )}
    </s-page>
  );
}
