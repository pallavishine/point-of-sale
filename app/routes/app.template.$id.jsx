// import { useEffect, useState, useCallback, useMemo, useRef } from "react";
// import {
//   useActionData,
//   useLoaderData,
//   useNavigate,
//   useSubmit,
//   useLocation,
// } from "react-router";

// import { authenticate } from "../shopify.server";
// import PDFPrintButton from "../components/PDFPrintButton";
// import { useFormData } from "../hooks/useFormData";
// import { useLinesManager } from "../hooks/useLinesManager";

// // Components
// import { AdvancedDesign } from "../components/DesignMode/AdvancedDesign";
// import LabelPreview from "../components/LabelPreview";
// // Constants
// import {
//   PAPER_BRAND_OPTIONS,
//   PAPER_MODEL_OPTIONS,
// } from "../components/constants";
// import { templateModel } from "../db.schema";
// import mongoose from "mongoose";
// import { LineItem } from "../components/LineItem/LineItem";

// export const loader = async ({ request, params }) => {
//   const { session, admin } = await authenticate.admin(request);
//   const { id } = params;

//   if (!id || id == "create") {
//     return { TEMPLATE_DATA: null, templateId: id };
//   }
//   const templateData = await templateModel.findOne({
//     shop: session.shop,
//     _id: new mongoose.Types.ObjectId(id),
//   });
//   const TEMPLATE_DATA = await JSON.parse(JSON.stringify(templateData));
//   return { TEMPLATE_DATA: TEMPLATE_DATA, templateId: id, shop :session.shop};
// };

// export const action = async ({ request }) => {
//   const { admin, session } = await authenticate.admin(request);
//   const formData = await request.formData();
//   const data = formData?.get("data");
//   const templateData = await JSON.parse(data);
//   const templateId = formData?.get("templateId");
//   console.log("templateId", templateId);

//   // Create template object
//   const template = {
//     shop: session.shop,
//     ...templateData,
//   };
//   // console.log("template=========>", template);

//   let result;
//   if (templateId && templateId !== "create") {
//     // Update existing template
//     result = await templateModel.updateOne(
//       { _id: templateId, shop: session.shop },
//       { $set: template },
//       { upsert: true },
//     );
//   } else {
//     // Create new template
//     result = await templateModel.create(template);
//   }

//   return {
//     status: true,
//     template: result,
//     message: templateId
//       ? "Template updated successfully"
//       : "Template created successfully",
//   };

//   return null;
// };

// export default function TemplateEditor() {
//   const navigate = useNavigate();
//   const loacation = useLocation();
//   const submit = useSubmit();
//   const actionData = useActionData();
//   const { TEMPLATE_DATA, templateId, shop } = useLoaderData();
//   const [testprintQuantity, setTestPrintQuantity] = useState(5);
//   const [tabSelected, setTabSelected] = useState("general");
//   const [designMode, setDesignMode] = useState("simple");
//   const [activeSettingId, setActiveSettingId] = useState(null);
//   const {
//     formData,
//     dimension,
//     handleChange,
//     updateLabelSetting,
//     updateLines,
//     updateLine,
//     updateLineSetting,
//     toggleFieldInLine,
//     removeFieldFromLine,
//     reorderFieldsInLine,
//     updateAdvancedElements,
//     addAdvancedElement,
//     removeAdvancedElement,
//     updateAdvancedElement,
//     resetForm,
//     setFormData,
//   } = useFormData(TEMPLATE_DATA);
//   const isPaperSelected = formData?.paperBrand && formData?.paperModel;
//   const paperModelOptions = PAPER_MODEL_OPTIONS[formData?.paperBrand] || [];
//   const labelPreviewRef = useRef();

//   const lines = useMemo(() => formData?.lines, [formData?.lines]);
//   const { selectedFieldsAsLines, allFields, enabledFieldsCount } =
//     useLinesManager(lines);

//   useEffect(() => {
//     if (actionData) {
//       // console.log("actionData===>", actionData);

//       if (actionData?.status) {
//         shopify.toast.show(actionData?.message);
//       }
//       navigate(-1);
//     }
//   }, [actionData]);

//   const getLabelPreviewHTML = () => {
//     if (labelPreviewRef.current) {
//       return labelPreviewRef.current.outerHTML;
//     }
//     return "";
//   };
//   // Handlers
//   const handleDragEnd = useCallback(
//     (result) => {
//       const { source, destination, draggableId } = result;

//       // If no destination or dropped in same place
//       if (!destination) return;

//       if (
//         source.droppableId === destination.droppableId &&
//         source.index === destination.index
//       ) {
//         return;
//       }

//       // Handle field reordering within same line
//       if (source.droppableId === destination.droppableId) {
//         reorderFieldsInLine(
//           source.droppableId,
//           source.index,
//           destination.index,
//         );
//       }
//       // TODO: Add cross-line field movement if needed
//       // else {
//       //   moveFieldBetweenLines(
//       //     source.droppableId,
//       //     destination.droppableId,
//       //     source.index,
//       //     destination.index,
//       //     draggableId
//       //   );
//       // }
//     },
//     [reorderFieldsInLine],
//   );

//   const handleSettingClick = useCallback((lineId) => {
//     setActiveSettingId((prev) => (prev === lineId ? null : lineId));
//   }, []);

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     const formDataObj = new FormData();
//     formDataObj.append("data", JSON.stringify(formData));
//     formDataObj.append("templateId", templateId);

//     submit(formDataObj, {
//       method: "post",
//       encType: "multipart/form-data",
//     });
//   };

//   return (
//     <s-page>
//       <s-stack gap="base" padding="base">
//         {/* Header */}
//         <s-box paddingInline="none" paddingBlock="small">
//           <s-stack direction="inline" gap="none" alignItems="start">
//             <s-icon
//               type="arrow-left"
//               onClick={() => navigate("/app/template")}
//               style={{ cursor: "pointer" }}
//             />
//             <s-heading inlineSize>
//               {templateId ? "Edit Template" : "New Template"}
//             </s-heading>
//           </s-stack>
//         </s-box>

//         <s-section padding="none">
//           <s-box padding="base">
//             <s-stack gap="small" direction="inline">
//               <s-clickable-chip
//                 color={tabSelected == "general" ? "strong" : "subdued"}
//                 accessibilityLabel="tabSelected"
//                 onClick={() => setTabSelected("general")}
//               >
//                 <s-icon slot="graphic" type="filter" />
//                 General
//               </s-clickable-chip>
//               <s-clickable-chip
//                 color={tabSelected == "settings" ? "strong" : "subdued"}
//                 accessibilityLabel="tabSelected"
//                 onClick={() => setTabSelected("settings")}
//               >
//                 <s-icon slot="graphic" type="settings" />
//                 Label Settings
//               </s-clickable-chip>
//             </s-stack>
//           </s-box>
//           <s-divider />

//           <s-box paddingInline="small" paddingBlock="base">
//             <s-grid
//               gridTemplateColumns="repeat(3, 3fr)"
//               gap="base"
//               paddingInline="small"
//             >
//               {/* Information Section */}
//               <s-grid-item gridColumn="span 2" key="1">
//                 <form
//                   onSubmit={handleSubmit}
//                   data-save-bar
//                   data-discard-confirmation

//                 >
//                   <s-box
//                     padding="large"
//                     border="base"
//                     borderColor="base"
//                     borderRadius="base"
//                     borderStyle="auto"
//                   >
//                     {tabSelected == "general" ? (
//                       <s-stack gap="small">
//                         <s-text-field
//                           label="Template Name"
//                           name="templateName"
//                           value={formData?.templateName}
//                           onChange={(e) => handleChange(e)}
//                           required
//                         />
//                         <s-text-area
//                           label="Description"
//                           name="description"
//                           value={formData?.description}
//                           onChange={(e) => handleChange(e)}
//                           rows={1}
//                         />

//                         <s-stack gap="small">
//                           <s-grid
//                             gridTemplateColumns="repeat(12, 1fr)"
//                             gap="base"
//                           >
//                             <s-grid-item gridColumn="span 6" key="1">
//                               {" "}
//                               <s-select
//                                 label="Paper Brand"
//                                 name="paperBrand"
//                                 value={formData?.paperBrand}
//                                 onChange={(e) => handleChange(e)}
//                                 required
//                               >
//                                 <s-option value="">Choose an option</s-option>
//                                 {PAPER_BRAND_OPTIONS.map((opt) => (
//                                   <s-option key={opt.value} value={opt.value}>
//                                     {opt.label}
//                                   </s-option>
//                                 ))}
//                               </s-select>
//                             </s-grid-item>
//                             <s-grid-item gridColumn="span 6" key="2">
//                               {" "}
//                               <s-select
//                                 label="Paper Model"
//                                 name="paperModel"
//                                 value={formData?.paperModel}
//                                 onChange={(e) => handleChange(e)}
//                                 disabled={!formData?.paperBrand}
//                                 required
//                               >
//                                 <s-option value="">Choose an option</s-option>
//                                 {paperModelOptions.map((opt) => (
//                                   <s-option key={opt.value} value={opt.value}>
//                                     {opt.label}
//                                   </s-option>
//                                 ))}
//                               </s-select>
//                             </s-grid-item>
//                           </s-grid>
//                           {isPaperSelected && dimension && (
//                             <s-stack
//                               direction="inline"
//                               gap="large"
//                               paddingInline="base"
//                             >
//                               <s-unordered-list>
//                                 <s-list-item>
//                                   Label size: {formData?.dimension?.labelSize}
//                                 </s-list-item>
//                                 <s-list-item>
//                                   Paper size: {formData?.dimension?.paperSize}
//                                 </s-list-item>
//                                 <s-list-item>
//                                   Paper type: {formData?.dimension?.paperType}
//                                 </s-list-item>
//                                 <s-list-item>
//                                   Rows: {formData?.dimension?.rows} Columns:{" "}
//                                   {formData?.dimension?.cols}
//                                 </s-list-item>
//                               </s-unordered-list>
//                               <s-box padding="small-200">
//                                 <s-image
//                                   src={
//                                     formData?.dimension?.paperType == "sheet"
//                                       ? "/a4-sheet-illustration.svg"
//                                       : "/roll-illustration.svg"
//                                   }
//                                   alt="paperType"
//                                   borderRadius="large"
//                                   objectFit="cover"
//                                   aspectRatio="1/1"
//                                 />
//                               </s-box>
//                             </s-stack>
//                           )}
//                         </s-stack>
//                       </s-stack>
//                     ) : (
//                       <>
//                         <s-stack direction="inline" gap="small">
//                           {["simple", "advanced"].map((mode) => (
//                             <s-clickable
//                               key={mode}
//                               border="base"
//                               padding="small"
//                               onClick={() => setDesignMode(mode)}
//                               background={
//                                 designMode === mode ? "strong" : "transparent"
//                               }
//                             >
//                               {mode === "simple"
//                                 ? "Simple Design"
//                                 : "Advanced Design"}
//                             </s-clickable>
//                           ))}
//                         </s-stack>

//                         <s-box paddingInline="none" paddingBlock="base">
//                           <s-grid
//                             gridTemplateColumns="repeat(4, 4fr)"
//                             gap="base"
//                           >
//                             {["Top", "Bottom", "Left", "Right"].map((side) => (
//                               <s-grid-item key={side}>
//                                 <s-text-field
//                                   label={`Margin ${side}`}
//                                   name={`margin${side}`}
//                                   type="number"
//                                   value={
//                                     formData?.settings?.[`margin${side}`] ||
//                                     0
//                                   }
//                                   onChange={updateLabelSetting}
//                                   suffix="in"
//                                   min="0"
//                                   step="0.01"
//                                 />
//                               </s-grid-item>
//                             ))}
//                           </s-grid>
//                         </s-box>
//                         {designMode === "simple" ? (
//                           // <DragDropContext onDragEnd={handleDragEnd}>
//                           <s-stack
//                             vertical
//                             gap="small"
//                             style={{ marginTop: "12px" }}
//                           >
//                             {formData?.lines.map((line) => (
//                               <LineItem
//                                 shop={shop}
//                                 line={line}
//                                 lines={formData?.lines}
//                                 isActive={activeSettingId === line.id}
//                                 onSettingsClick={handleSettingClick}
//                                 updateLineSettings={(updatedLine) =>
//                                   updateLine(line.id, updatedLine)
//                                 }
//                                 onToggleField={(lineId, fieldId) =>
//                                   toggleFieldInLine(lineId, fieldId)
//                                 }
//                                 onRemoveField={(lineId, fieldId) =>
//                                   removeFieldFromLine(lineId, fieldId)
//                                 }
//                                 allFields={allFields}
//                               />
//                             ))}
//                           </s-stack>
//                         ) : (
//                           //  </DragDropContext>
//                           <AdvancedDesign
//                             dimension={dimension.raw}
//                             settings={formData?.settings}
//                             selectedFieldsAsLines={selectedFieldsAsLines}
//                             advancedElements={formData?.advancedElements}
//                             onAddElement={addAdvancedElement}
//                             onUpdateElement={updateAdvancedElement}
//                             onRemoveElement={removeAdvancedElement}
//                           />
//                         )}
//                       </>
//                     )}
//                   </s-box>
//                 </form>
//               </s-grid-item>

//               {/* Preview Panel */}
//               <s-grid-item gridColumn="span 1" key="2">
//                 <s-stack alignItems="center">
//                   <s-heading>Preview</s-heading>
//                 </s-stack>
//                 <s-box padding="base">
//                   <s-stack
//                     gap="small"
//                     ref={labelPreviewRef}
//                     alignItems="center"
//                   >
//                     <div style={{ boxShadow: "0 0 25px rgba(0,0,0,0.15)" }}>
//                       <LabelPreview
//                         shop={shop}
//                         dimension={dimension.raw}
//                         settings={formData?.settings}
//                         lines={selectedFieldsAsLines}
//                         advancedElements={
//                           designMode === "advanced"
//                             ? formData?.advancedElements
//                             : []
//                         }
//                       />
//                     </div>

//                     <s-grid
//                       gridTemplateColumns="repeat(12, 1fr)"
//                       gap="small"
//                       paddingInline="base"
//                     >
//                       <s-grid-item gridColumn="span 10" key="1">
//                         <s-number-field
//                           prefix="Test Print Qty:"
//                           name="testprintQuantity"
//                           value={testprintQuantity}
//                           onChange={(e) => {
//                             setTestPrintQuantity(e.target.value);
//                           }}
//                           onInput={(e) => {
//                             setTestPrintQuantity(e.target.value);
//                           }}
//                         />
//                       </s-grid-item>
//                       <s-grid-item gridColumn="span 2" key="2">
//                         <PDFPrintButton
//                           documentProps={{
//                             lines: selectedFieldsAsLines,
//                             quantity: Number(testprintQuantity),
//                             dimension: dimension.raw,
//                             testPrint: true,
//                             shop:shop
//                           }}
//                           buttonText="Print"
//                         />
//                       </s-grid-item>
//                     </s-grid>
//                   </s-stack>
//                 </s-box>
//               </s-grid-item>
//             </s-grid>
//           </s-box>
//         </s-section>
//       </s-stack>
//     </s-page>
//   );
// }

// app/routes/app.template.$id.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useSubmit,
} from "react-router";
import { SaveBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import PDFPrintButton from "../components/PDFPrintButton";
import { useFormData } from "../hooks/useFormData";
import { useLinesManager } from "../hooks/useLinesManager";
import { AdvancedDesign } from "../components/DesignMode/AdvancedDesign";
import LabelPreview from "../components/LabelPreview";
import {
  PAPER_BRAND_OPTIONS,
  PAPER_MODEL_OPTIONS,
} from "../components/constants";
import { templateModel } from "../db.schema";
import mongoose from "mongoose";
import { LineItem } from "../components/LineItem/LineItem";
import isEqual from "lodash/isEqual";
const SAVE_BAR_ID = "template-editor-save-bar";

// ─── loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  if (!id || id === "create") {
    return { TEMPLATE_DATA: null, templateId: id, shop: session.shop };
  }

  const templateData = await templateModel.findOne({
    shop: session.shop,
    _id: new mongoose.Types.ObjectId(id),
  });

  return {
    TEMPLATE_DATA: JSON.parse(JSON.stringify(templateData)),
    templateId: id,
    shop: session.shop,
  };
};

// ─── action ───────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const templateData = JSON.parse(formData?.get("data"));
  const templateId = formData?.get("templateId");

  const template = { shop: session.shop, ...templateData };

  let result;
  if (templateId && templateId !== "create") {
    result = await templateModel.updateOne(
      { _id: templateId, shop: session.shop },
      { $set: template },
      { upsert: true },
    );
  } else {
    result = await templateModel.create(template);
  }

  return {
    status: true,
    template: result,
    message: templateId
      ? "Template updated successfully"
      : "Template created successfully",
  };
};

// ─── component ────────────────────────────────────────────────────────────────

export default function TemplateEditor() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const actionData = useActionData();
  const { TEMPLATE_DATA, templateId, shop } = useLoaderData();

  const [testprintQuantity, setTestPrintQuantity] = useState(5);
  const [tabSelected, setTabSelected] = useState("general");
  const [designMode, setDesignMode] = useState("simple");
  const [activeSettingId, setActiveSettingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const labelPreviewRef = useRef();

  const {
    formData,
    handleChange,
    updateLabelSetting,
    updateLines,
    updateLine,
    updateLineSetting,
    toggleFieldInLine,
    removeFieldFromLine,
    reorderFieldsInLine,
    updateAdvancedElements,
    addAdvancedElement,
    removeAdvancedElement,
    updateAdvancedElement,
    resetForm,
    setFormData,
  } = useFormData(TEMPLATE_DATA);

  const isPaperSelected = formData?.paperBrand && formData?.paperModel;
  const paperModelOptions = PAPER_MODEL_OPTIONS[formData?.paperBrand] || [];
  const lines = useMemo(() => formData?.lines, [formData?.lines]);
  const { selectedFieldsAsLines, allFields } = useLinesManager(lines);

  useEffect(() => {
    const isSame = JSON.stringify(formData) === JSON.stringify(TEMPLATE_DATA);
    console.log("isSame", isSame);

    setIsDirty(true);
  }, [formData]);

  // useEffect(() => {
  //   if (isDirty) {
  //     shopify.saveBar.show(SAVE_BAR_ID);
  //   } else {
  //     shopify.saveBar.hide(SAVE_BAR_ID);
  //   }
  // }, [isDirty]);

  useEffect(() => {
    if (!actionData) return;
    if (actionData.status) {
      shopify.toast.show(actionData.message);
    }
    setIsSaving(false);
    setIsDirty(false);
    navigate(-1);
  }, [actionData]);

  const handleSave = () => {
    setIsSaving(true);
    const form = new FormData();
    console.log("formData===>", formData);

    form.append("data", JSON.stringify(formData));
    form.append("templateId", templateId);
    submit(form, { method: "post", encType: "multipart/form-data" });
  };

  const handleDiscard = useCallback(() => {
    resetForm();
    setIsDirty(false);
    setTabSelected("general");
    setDesignMode("simple");
    setActiveSettingId(null);
  }, [resetForm]);

  // ── Drag end (field reorder) ───────────────────────────────────────────────
  const handleDragEnd = useCallback(
    ({ source, destination }) => {
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      )
        return;
      if (source.droppableId === destination.droppableId) {
        reorderFieldsInLine(
          source.droppableId,
          source.index,
          destination.index,
        );
      }
    },
    [reorderFieldsInLine],
  );

  const handleSettingClick = useCallback((lineId) => {
    setActiveSettingId((prev) => (prev === lineId ? null : lineId));
  }, []);

  return (
    <s-page heading="">
      <s-link slot="breadcrumb-actions" href="/app">
        pos-app-new
      </s-link>

      {/* <SaveBar id={SAVE_BAR_ID}>
        <button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          loading={isSaving ? "" : undefined}
        >
          Save
        </button>
        <button onClick={handleDiscard} disabled={isSaving}>
          Discard
        </button>
      </SaveBar> */}

      <s-stack gap="base" padding="base">
        <s-box paddingInline="none" paddingBlock="small">
          <s-stack direction="inline" gap="none" justifyContent="space-between">
            <s-stack direction="inline" gap="small">
              <s-icon
                type="arrow-left"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  if (isDirty) {
                    console.log("You have unsaved changes. Discard and leave?");
                    navigate("/app/template");
                    // handleDiscard();
                  } else {
                    navigate("/app/template");
                  }
                }}
              />
              <s-heading inlineSize>
                {templateId && templateId !== "create"
                  ? "Edit Template"
                  : "New Template"}
              </s-heading>
            </s-stack>
            <s-button variant="primary" onClick={handleSave}>
              Save
            </s-button>
            {/* <s-button variant="primary" onClick={handleDiscard}>Discard</s-button> */}
          </s-stack>
        </s-box>

        <s-section padding="none">
          {/* ── Tabs  */}
          <s-box padding="base">
            <s-stack gap="small" direction="inline">
              <s-clickable-chip
                color={tabSelected === "general" ? "strong" : "subdued"}
                onClick={() => setTabSelected("general")}
              >
                <s-icon slot="graphic" type="filter" />
                General
              </s-clickable-chip>
              <s-clickable-chip
                color={tabSelected === "settings" ? "strong" : "subdued"}
                onClick={() => setTabSelected("settings")}
              >
                <s-icon slot="graphic" type="settings" />
                Label Settings
              </s-clickable-chip>
            </s-stack>
          </s-box>
          <s-divider />

          <s-box paddingInline="small" paddingBlock="base">
            <s-grid
              gridTemplateColumns="repeat(3, 3fr)"
              gap="base"
              paddingInline="small"
            >
              {/* ── Left panel — form  */}
              <s-grid-item gridColumn="span 2">
                <form
                  id="template-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                >
                  <s-box
                    padding="large"
                    border="base"
                    borderColor="base"
                    borderRadius="base"
                    borderStyle="auto"
                  >
                    {tabSelected === "general" ? (
                      /* ── General tab  */
                      <s-stack gap="small">
                        <s-text-field
                          label="Template Name"
                          name="templateName"
                          value={formData?.templateName}
                          onChange={handleChange}
                          required
                        />
                        <s-text-area
                          label="Description"
                          name="description"
                          value={formData?.description}
                          onChange={handleChange}
                          rows={1}
                        />

                        <s-stack gap="small">
                          <s-grid
                            gridTemplateColumns="repeat(12, 1fr)"
                            gap="base"
                          >
                            <s-grid-item gridColumn="span 6">
                              <s-select
                                label="Paper Brand"
                                name="paperBrand"
                                value={formData?.paperBrand}
                                onChange={handleChange}
                                required
                              >
                                <s-option value="">Choose an option</s-option>
                                {PAPER_BRAND_OPTIONS.map((opt) => (
                                  <s-option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </s-option>
                                ))}
                              </s-select>
                            </s-grid-item>
                            <s-grid-item gridColumn="span 6">
                              <s-select
                                label="Paper Model"
                                name="paperModel"
                                value={formData?.paperModel}
                                onChange={handleChange}
                                disabled={!formData?.paperBrand}
                                required
                              >
                                <s-option value="">Choose an option</s-option>
                                {paperModelOptions.map((opt) => (
                                  <s-option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </s-option>
                                ))}
                              </s-select>
                            </s-grid-item>
                          </s-grid>

                          {isPaperSelected && formData?.dimension && (
                            <s-stack
                              direction="inline"
                              gap="large"
                              paddingInline="base"
                            >
                              <s-unordered-list>
                                <s-list-item>
                                  Label size: {formData?.dimension?.labelSize}
                                </s-list-item>
                                <s-list-item>
                                  Paper size: {formData?.dimension?.paperSize}
                                </s-list-item>
                                <s-list-item>
                                  Paper type: {formData?.dimension?.paperType}
                                </s-list-item>
                                <s-list-item>
                                  Rows: {formData?.dimension?.rows} Columns:{" "}
                                  {formData?.dimension?.cols}
                                </s-list-item>
                              </s-unordered-list>
                              <s-box padding="small-200">
                                <s-image
                                  src={
                                    formData?.dimension?.paperType === "sheet"
                                      ? "/a4-sheet-illustration.svg"
                                      : "/roll-illustration.svg"
                                  }
                                  alt="paperType"
                                  borderRadius="large"
                                  objectFit="cover"
                                  aspectRatio="1/1"
                                />
                              </s-box>
                            </s-stack>
                          )}
                        </s-stack>
                      </s-stack>
                    ) : (
                      /* ── Label Settings tab  */
                      <>
                        <s-stack direction="inline" gap="small">
                          {["simple", "advanced"].map((mode) => (
                            <s-clickable
                              key={mode}
                              border="base"
                              padding="small"
                              onClick={() => setDesignMode(mode)}
                              background={
                                designMode === mode ? "strong" : "transparent"
                              }
                            >
                              {mode === "simple"
                                ? "Simple Design"
                                : "Advanced Design"}
                            </s-clickable>
                          ))}
                        </s-stack>

                        <s-box paddingInline="none" paddingBlock="base">
                          <s-grid
                            gridTemplateColumns="repeat(4, 4fr)"
                            gap="base"
                          >
                            {["Top", "Bottom", "Left", "Right"].map((side) => (
                              <s-grid-item key={side}>
                                <s-text-field
                                  label={`Margin ${side}`}
                                  name={`margin${side}`}
                                  type="number"
                                  value={
                                    formData?.settings?.[`margin${side}`] || 0
                                  }
                                  onChange={updateLabelSetting}
                                  suffix="in"
                                  min="0"
                                  step="0.01"
                                />
                              </s-grid-item>
                            ))}
                          </s-grid>
                        </s-box>

                        {designMode === "simple" ? (
                          <s-stack
                            vertical
                            gap="small"
                            style={{ marginTop: "12px" }}
                          >
                            {formData?.lines.map((line) => (
                              <LineItem
                                key={line.id}
                                shop={shop}
                                line={line}
                                lines={formData?.lines}
                                isActive={activeSettingId === line.id}
                                onSettingsClick={handleSettingClick}
                                updateLineSettings={(updatedLine) =>
                                  updateLine(line.id, updatedLine)
                                }
                                onToggleField={(lineId, fieldId) =>
                                  toggleFieldInLine(lineId, fieldId)
                                }
                                onRemoveField={(lineId, fieldId) =>
                                  removeFieldFromLine(lineId, fieldId)
                                }
                                allFields={allFields}
                              />
                            ))}
                          </s-stack>
                        ) : (
                          <AdvancedDesign
                            dimension={formData?.dimension?.raw}
                            settings={formData?.settings}
                            selectedFieldsAsLines={selectedFieldsAsLines}
                            advancedElements={formData?.advancedElements}
                            onAddElement={addAdvancedElement}
                            onUpdateElement={updateAdvancedElement}
                            onRemoveElement={removeAdvancedElement}
                          />
                        )}
                      </>
                    )}
                  </s-box>
                </form>
              </s-grid-item>

              {/* ── Right panel — preview  */}
              <s-grid-item gridColumn="span 1">
                <s-stack alignItems="center">
                  <s-heading>Preview</s-heading>
                </s-stack>
                <s-box padding="base">
                  <s-stack
                    gap="small"
                    ref={labelPreviewRef}
                    alignItems="center"
                  >
                    <div style={{ boxShadow: "0 0 25px rgba(0,0,0,0.15)" }}>
                      <LabelPreview
                        shop={shop}
                        dimension={formData?.dimension?.raw}
                        settings={formData?.settings}
                        lines={selectedFieldsAsLines}
                        advancedElements={
                          designMode === "advanced"
                            ? formData?.advancedElements
                            : []
                        }
                      />
                    </div>

                    <s-grid
                      gridTemplateColumns="repeat(12, 1fr)"
                      gap="small"
                      paddingInline="base"
                    >
                      <s-grid-item gridColumn="span 10">
                        <s-number-field
                          prefix="Test Print Qty:"
                          name="testprintQuantity"
                          value={testprintQuantity}
                          onInput={(e) =>
                            setTestPrintQuantity(
                              e.currentTarget.value ?? e.target.value,
                            )
                          }
                        />
                      </s-grid-item>
                      <s-grid-item gridColumn="span 2">
                        <PDFPrintButton
                          documentProps={{
                            lines: selectedFieldsAsLines,
                            quantity: Number(testprintQuantity),
                            dimension: formData?.dimension?.raw,
                            testPrint: true,
                            shop,
                          }}
                          buttonText="Print"
                        />
                      </s-grid-item>
                    </s-grid>
                  </s-stack>
                </s-box>
              </s-grid-item>
            </s-grid>
          </s-box>
        </s-section>
      </s-stack>
    </s-page>
  );
}
