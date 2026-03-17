// import { useState, useCallback, useMemo } from "react";
// import { LABEL_FIELDS_BY_LINE } from "../components/constants";
// import { getPaperDisplayFields } from "../utils/labelPaperUtils";

// export const useFormData = (initialData) => {
//   const [formData, setFormData] = useState({
//     templateName: initialData?.templateName || "",
//     description: initialData?.description || "",
//     paperBrand: initialData?.paperBrand || "",
//     paperModel: initialData?.paperModel || "",
//     settings: initialData?.settings || {},
//     lines: initialData?.lines || LABEL_FIELDS_BY_LINE,
//     dimension: initialData?.dimension || {},
//     advancedElements: initialData?.advancedElements || [],
//   });

//   const dimension = useMemo(() => {
//     return formData.paperBrand && formData.paperModel
//       ? getPaperDisplayFields(formData.paperBrand, formData.paperModel)
//       : {};
//   }, [formData.paperBrand, formData.paperModel]);

//   const handleChange = useCallback((e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData((prev) => {
//       // ✅ FIX: Compute fresh dimension inside the updater using the latest prev state,
//       // not the stale closure value. This breaks the circular dependency.
//       const newBrand = name === "paperBrand" ? value : prev.paperBrand;
//       const newModel = name === "paperModel" ? value : prev.paperModel;
//       const freshDimension =
//         newBrand && newModel
//           ? getPaperDisplayFields(newBrand, newModel)
//           : {};

//       return {
//         ...prev,
//         [name]: type === "checkbox" ? checked : value,
//         ...(name === "paperBrand" && { paperModel: "" }),
//         ...(name === "paperBrand" || name === "paperModel"
//           ? { dimension: freshDimension }
//           : {}),
//       };
//     });
//   // ✅ FIX: No dependency on `dimension` — avoids stale closure entirely
//   }, []);

//   const updateLabelSetting = useCallback((e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       settings: {
//         ...prev.settings,
//         [name]: type === "checkbox" ? checked : value,
//       },
//     }));
//   }, []);

//   const updateLines = useCallback((newLines) => {
//     setFormData((prev) => ({ ...prev, lines: newLines }));
//   }, []);

//   const updateLine = useCallback((lineId, updatedLine) => {
//     setFormData((prev) => ({
//       ...prev,
//       lines: prev.lines.map((line) =>
//         line?.id === lineId ? { ...line, ...updatedLine } : line,
//       ),
//     }));
//   }, []);

//   const updateLineSetting = useCallback((lineId, settings) => {
//     setFormData((prev) => ({
//       ...prev,
//       lines: prev.lines.map((line) =>
//         line?.id === lineId
//           ? { ...line, settings: { ...line?.settings, ...settings } }
//           : line,
//       ),
//     }));
//   }, []);

//   const toggleFieldInLine = useCallback((lineId, fieldId) => {
//     setFormData((prev) => ({
//       ...prev,
//       lines: prev.lines.map((line) => {
//         if (line?.id !== lineId) return line;
//         return {
//           ...line,
//           fields: line.fields.map((field) =>
//             field?.id === fieldId
//               ? { ...field, enabled: !field.enabled }
//               : field,
//           ),
//         };
//       }),
//     }));
//   }, []);

//   const removeFieldFromLine = useCallback((lineId, fieldId) => {
//     setFormData((prev) => ({
//       ...prev,
//       lines: prev.lines.map((line) => {
//         if (line?.id !== lineId) return line;
//         return {
//           ...line,
//           fields: line.fields
//             .filter((f) => f.id !== fieldId)
//             .map((f, idx) => ({ ...f, order: idx })),
//         };
//       }),
//     }));
//   }, []);

//   const reorderFieldsInLine = useCallback((lineId, sourceIndex, destinationIndex) => {
//     setFormData((prev) => ({
//       ...prev,
//       lines: prev.lines.map((line) => {
//         if (line?.id !== lineId) return line;
//         const reordered = Array.from(line.fields);
//         const [moved] = reordered.splice(sourceIndex, 1);
//         reordered.splice(destinationIndex, 0, moved);
//         return {
//           ...line,
//           fields: reordered.map((item, idx) => ({ ...item, order: idx })),
//         };
//       }),
//     }));
//   }, []);

//   const updateAdvancedElements = useCallback((newElements) => {
//     setFormData((prev) => ({ ...prev, advancedElements: newElements }));
//   }, []);

//   const addAdvancedElement = useCallback((element) => {
//     setFormData((prev) => ({
//       ...prev,
//       advancedElements: [...prev.advancedElements, element],
//     }));
//   }, []);

//   const removeAdvancedElement = useCallback((elementId) => {
//     setFormData((prev) => ({
//       ...prev,
//       advancedElements: prev.advancedElements.filter((el) => el.id !== elementId),
//     }));
//   }, []);

//   const updateAdvancedElement = useCallback((elementId, updates) => {
//     setFormData((prev) => ({
//       ...prev,
//       advancedElements: prev.advancedElements.map((el) =>
//         el.id === elementId ? { ...el, ...updates } : el,
//       ),
//     }));
//   }, []);

//   const resetForm = useCallback(() => {
//     setFormData({
//       templateName: "",
//       description: "",
//       paperBrand: "",
//       paperModel: "",
//       settings: {},
//       lines: [],
//       advancedElements: [],
//     });
//   }, []);

//   return {
//     formData,
//     dimension, // ✅ expose derived dimension separately so consumers don't need to recompute
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
//   };
// };

// hooks/useFormData.js
import { useState, useCallback, useRef } from "react";
import { LABEL_FIELDS_BY_LINE } from "../components/constants";
import { getPaperDisplayFields } from "../utils/labelPaperUtils";

export const useFormData = (initialData) => {
  // ─────────────────────────────────────────────
  // Build normalized state
  // ─────────────────────────────────────────────
  const buildState = (data = {}) => {
    const dimension =
      data?.paperBrand && data?.paperModel
        ? getPaperDisplayFields(data.paperBrand, data.paperModel)
        : data?.dimension || {};

    return {
      ...data,
      templateName: data?.templateName || "",
      description: data?.description || "",
      paperBrand: data?.paperBrand || "",
      paperModel: data?.paperModel || "",
      dimension:dimension||{},
      lines: data?.lines || LABEL_FIELDS_BY_LINE,
      advancedElements: data?.advancedElements || [],
    };
  };

  // ─────────────────────────────────────────────
  // Initialize state
  // ─────────────────────────────────────────────
  const initialState = buildState(initialData);

  const [formData, setFormData] = useState(initialState);

  // keep original loader snapshot
  const originalData = useRef(initialState);

  // ─────────────────────────────────────────────
  // Handle input changes
  // ─────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const el = e.currentTarget ?? e.target;
    const { name, value, type, checked } = el;

    setFormData((prev) => {
      const newBrand = name === "paperBrand" ? value : prev.paperBrand;
      const newModel = name === "paperModel" ? value : prev.paperModel;

      const freshDimension =
        newBrand && newModel
          ? getPaperDisplayFields(newBrand, newModel)
          : {};

      return {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
        ...(name === "paperBrand" && { paperModel: "" }),
        ...(name === "paperBrand" || name === "paperModel"
          ? { dimension: freshDimension||{} }
          : {}),
      };
    });
  }, []);

  // ─────────────────────────────────────────────
  // Label settings
  // ─────────────────────────────────────────────
  const updateLabelSetting = useCallback((e) => {
    const el = e.currentTarget ?? e.target;
    const { name, value, type, checked } = el;

    setFormData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [name]: type === "checkbox" ? checked : value,
      },
    }));
  }, []);

  // ─────────────────────────────────────────────
  // Lines
  // ─────────────────────────────────────────────
  const updateLines = useCallback((newLines) => {
    setFormData((prev) => ({ ...prev, lines: newLines }));
  }, []);

  const updateLine = useCallback((lineId, updatedLine) => {
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line?.id === lineId ? { ...line, ...updatedLine } : line
      ),
    }));
  }, []);

  const updateLineSetting = useCallback((lineId, settings) => {
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.map((line) =>
        line?.id === lineId
          ? { ...line, settings: { ...line?.settings, ...settings } }
          : line
      ),
    }));
  }, []);

  const toggleFieldInLine = useCallback((lineId, fieldId) => {
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => {
        if (line?.id !== lineId) return line;

        return {
          ...line,
          fields: line.fields.map((field) =>
            field?.id === fieldId
              ? { ...field, enabled: !field.enabled }
              : field
          ),
        };
      }),
    }));
  }, []);

  const removeFieldFromLine = useCallback((lineId, fieldId) => {
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => {
        if (line?.id !== lineId) return line;

        return {
          ...line,
          fields: line.fields
            .filter((f) => f.id !== fieldId)
            .map((f, idx) => ({ ...f, order: idx })),
        };
      }),
    }));
  }, []);

  const reorderFieldsInLine = useCallback(
    (lineId, sourceIndex, destinationIndex) => {
      setFormData((prev) => ({
        ...prev,
        lines: prev.lines.map((line) => {
          if (line?.id !== lineId) return line;

          const reordered = Array.from(line.fields);
          const [moved] = reordered.splice(sourceIndex, 1);
          reordered.splice(destinationIndex, 0, moved);

          return {
            ...line,
            fields: reordered.map((item, idx) => ({
              ...item,
              order: idx,
            })),
          };
        }),
      }));
    },
    []
  );

  // ─────────────────────────────────────────────
  // Advanced elements
  // ─────────────────────────────────────────────
  const updateAdvancedElements = useCallback((newElements) => {
    setFormData((prev) => ({ ...prev, advancedElements: newElements }));
  }, []);

  const addAdvancedElement = useCallback((element) => {
    setFormData((prev) => ({
      ...prev,
      advancedElements: [...prev.advancedElements, element],
    }));
  }, []);

  const removeAdvancedElement = useCallback((elementId) => {
    setFormData((prev) => ({
      ...prev,
      advancedElements: prev.advancedElements.filter(
        (el) => el.id !== elementId
      ),
    }));
  }, []);

  const updateAdvancedElement = useCallback((elementId, updates) => {
    setFormData((prev) => ({
      ...prev,
      advancedElements: prev.advancedElements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      ),
    }));
  }, []);

  // ─────────────────────────────────────────────
  // Reset form
  // ─────────────────────────────────────────────
  const resetForm = useCallback(() => {
    // clone to avoid shared reference mutation
    setFormData(JSON.parse(JSON.stringify(originalData.current)));
  }, []);

  // ─────────────────────────────────────────────
  return {
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
  };
};