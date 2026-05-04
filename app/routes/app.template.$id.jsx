

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



  const handleSettingClick = useCallback((lineId) => {
    setActiveSettingId((prev) => (prev === lineId ? null : lineId));
  }, []);

  return (
    <s-page heading="Template Builder">
      <s-link slot="breadcrumb-actions" href="/app">
        pos-app-new
      </s-link>
      <s-link slot="breadcrumb-actions" href={`/app/template/${templateId}`}>Template Builder</s-link>
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
                    console.log("You have unsaved changes.    Discard and leave??????");
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
                        {/* <s-stack direction="inline" gap="small-200">
                          {["simple", "advanced"].map((mode) => (
                            <s-clickable
                              key={mode}
                              border="base"
                              padding="small-200"
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
                        </s-stack> */}

                        <s-box paddingInline="none" paddingBlock="small-400">
                          {/* <s-grid
                            gridTemplateColumns="repeat(4, 4fr)"
                            gap="base"
                          >
                            {["Top", "Bottom", "Left", "Right"].map((side) => (
                              <s-grid-item key={side}>
                                <s-number-field
                                  label={`Margin ${side}`}
                                  name={`margin${side}`}
                                  value={
                                    formData?.settings?.[`margin${side}`] || 0
                                  }
                                  onChange={(e)=>updateLabelSetting(`margin${side}`,e.target.value)}
                                  onInput={(e)=>updateLabelSetting(`margin${side}`,e.target.value)}
                                  suffix="in"
                                  min="0"
                                  step="1"
                                />
                              </s-grid-item>
                            ))}
                          </s-grid> */}
                        </s-box>

                        {designMode === "simple" ? (
                          <s-stack
                            gap="small-400"
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
                              e.target.value
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
