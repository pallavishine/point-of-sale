// import { useEffect, useState } from "react";

// export default function SelectedProductsTable({
//   selectedVariants,
//   setSelectedVariants,
//   isLoading,
//   setGenerationModal,
//   assignmentType,
//   generationType,
//   overwriteExisting,
//   selectedRows,
//   setSelectedRows,
//   handleResourcePicker,
// }) {
//   console.log("selectedVariants", selectedVariants);
//   console.log("assignmentType", assignmentType);
//   console.log("selectedRows", selectedRows);

//   // State for quantity management
//   const [quantityType, setQuantityType] = useState("");
//   const [customQuantity, setCustomQuantity] = useState(0);
//   const [labelQuantities, setLabelQuantities] = useState({});
//   const [sortBy, setSortBy] = useState("ProductTitle");
//   const [sortOrder, setSortOrder] = useState("asc");
//   const [searchQuery, setSearchQuery] = useState("");

//   const selectAll =
//     selectedVariants.length > 0 &&
//     selectedRows.size === selectedVariants.length;

//   // Filter and sort variants
//   const getFilteredAndSortedVariants = () => {
//     let filtered = [...selectedVariants];

//     // Apply search filter
//     if (searchQuery) {
//       const query = searchQuery.toLowerCase();
//       filtered = filtered.filter(
//         (v) =>
//           v.productTitle?.toLowerCase().includes(query) ||
//           v.title?.toLowerCase().includes(query) ||
//           v.sku?.toLowerCase().includes(query) ||
//           v.barcode?.toLowerCase().includes(query),
//       );
//     }

//     // Apply sorting
//     filtered.sort((a, b) => {
//       let aVal = a[sortBy];
//       let bVal = b[sortBy];

//       if (sortBy === "ProductTitle") aVal = a.productTitle;
//       if (sortBy === "title") aVal = a.title;
//       if (sortBy === "inventory") {
//         aVal = a.inventory || 0;
//         bVal = b.inventory || 0;
//       }

//       if (sortOrder === "asc") {
//         return aVal > bVal ? 1 : -1;
//       } else {
//         return aVal < bVal ? 1 : -1;
//       }
//     });

//     return filtered;
//   };

//   const filteredVariants = getFilteredAndSortedVariants();
//   console.log("filteredVariants",filteredVariants);

//   const handleSelectAll = () => {
//     if (selectAll) {
//       setSelectedRows(new Set());
//     } else {
//       setSelectedRows(new Set(filteredVariants.map((v) => v?.variantId)));
//     }
//   };

//   const handleRowSelect = (id) => {
//     setSelectedRows((prev) => {
//       const newSelected = new Set(prev);
//       if (newSelected.has(id)) {
//         newSelected.delete(id);
//       } else {
//         newSelected.add(id);
//       }
//       return newSelected;
//     });
//   };

//   const handleRemoveVariant = (id) => {
//     setSelectedVariants((prev) => {
//       const filtered = prev.filter((v) => v?.variantId !== id);
//       return filtered;
//     });

//     setSelectedRows((prev) => {
//       const newSet = new Set(prev);
//       newSet.delete(id);
//       return newSet;
//     });

//     // Also remove from label quantities
//     setLabelQuantities((prev) => {
//       const newQuantities = { ...prev };
//       delete newQuantities[id];
//       return newQuantities;
//     });
//   };

//   const handleClearAll = () => {
//     setSelectedVariants([]);
//     setSelectedRows(new Set());
//     setLabelQuantities({});
//   };

//   // Handle quantity update for all selected rows
//   const handleApplyQuantity = () => {
//     setSelectedVariants((prev) => {
//       return prev.map(variant => {
//         // Only update if variant is selected
//         if (selectedRows.has(variant.variantId)) {
//           if (quantityType === "match_inventory") {
//             return {
//               ...variant,
//               label_quantity: variant.inventory || 0
//             };
//           } else {
//             return {
//               ...variant,
//               label_quantity: customQuantity
//             };
//           }
//         }
//         return {
//           ...variant,
//           label_quantity: variant.label_quantity || 0
//         };
//       });
//     });

//     setShowQuantityPopover(false);
//   };

//   // Update individual variant label quantity
//   const handleLabelQuantityChange = (variantId, value) => {
//     setLabelQuantities((prev) => ({
//       ...prev,
//       [variantId]: value,
//     }));
//   };

//   // Clean up selected rows when variants are removed
//   useEffect(() => {
//     setSelectedRows((prev) => {
//       const validIds = new Set(selectedVariants.map((v) => v.variantId));
//       const cleaned = new Set([...prev].filter((id) => validIds.has(id)));
//       return cleaned.size !== prev.size ? cleaned : prev;
//     });
//     setLabelQuantities((prev) => ({
//       ...prev,
//       [variantId]: value,
//     }));
//   }, [selectedVariants]);

//   return (
//     <>
//       {selectedVariants.length > 0 && (
//         <s-stack gap="small">
//           <s-stack direction="inline" justifyContent="end">
//             <s-stack
//               direction="inline"
//               gap="small-100"
//               wrap={false}
//               align="space-between"
//             >
//               <s-link tone="critical" onClick={handleClearAll}>
//                 Clear All
//               </s-link>

//               {/* Quantity Popover */}
//               <s-link commandFor="label-count-popover">Set quantity</s-link>
//               <s-popover id="label-count-popover">
//                 <s-box padding="base" style={{ minWidth: "300px" }}>
//                   <s-stack gap="small-200">
//                     <s-heading>Set print quantity for selected</s-heading>
//                     <s-choice-list
//                       values={[quantityType]}
//                       onChange={(e) => {
//                         console.log(e.currentTarget.values?.[0]);
//                         setQuantityType(e.currentTarget.values?.[0]);
//                       }}
//                     >
//                       <s-choice value="match_inventory">
//                         Match Inventory
//                       </s-choice>
//                       <s-choice value="custom">Custom Quantity</s-choice>
//                     </s-choice-list>

//                     {quantityType === "custom" && (
//                       <s-number-field
//                         placeholder="Enter quantity"
//                         value={customQuantity}
//                         onChange={(e) => {
//                           console.log("onChange" ,e.target.value);
//                           setCustomQuantity(e.target.value);
//                         }}
//                         onInput={(e) => {
//                           console.log("onInput", e.target.value);
//                           setCustomQuantity(e.target.value);
//                         }}
//                         min={0}
//                         step={1}
//                         inputMode="numeric"
//                       />
//                     )}

//                     {/* {quantityType === "match_inventory" && (
//                       <s-text tone="subdued" size="small">
//                         Will set label count to match inventory for{" "}
//                         {selectedRows.size} selected variants
//                       </s-text>
//                     )} */}

//                     <s-stack justifyContent="end" gap="small-100">
//                       <s-button
//                         variant="primary"
//                         onClick={handleApplyQuantity}
//                         disabled={selectedRows.size === 0}
//                       >
//                         Apply
//                       </s-button>
//                     </s-stack>
//                   </s-stack>
//                 </s-box>
//               </s-popover>

//               <s-link
//                 onClick={() =>
//                   setGenerationModal({
//                     type: "bulk",
//                     count: selectedVariants.length,
//                     variants: selectedVariants,
//                   })
//                 }
//                 disabled={selectedVariants.length === 0}
//               >
//                 Generate for {selectAll ? "all" : selectedVariants.length}{" "}
//                 variant{selectedVariants.length > 1 ? "s" : ""}
//               </s-link>

//               {/* Sort Popover */}
//               {/* <s-popover
//                 activator={
//                   <s-link onClick={() => {}}>
//                     Sort
//                   </s-link>
//                 }
//               >
//                 <s-stack gap="none">
//                   <s-box padding="small">
//                     <s-choice-list
//                       label="Sort by"
//                       value={sortBy}
//                       onChange={setSortBy}
//                     >
//                       <s-choice value="ProductTitle">Product</s-choice>
//                       <s-choice value="title">Variant</s-choice>
//                       <s-choice value="inventory">Inventory</s-choice>
//                       <s-choice value="barcode">Barcode</s-choice>
//                       <s-choice value="sku">SKU</s-choice>
//                       <s-choice value="price">Price</s-choice>
//                     </s-choice-list>
//                   </s-box>
//                   <s-divider />
//                   <s-box padding="small">
//                     <s-choice-list
//                       label="Order by"
//                       value={sortOrder}
//                       onChange={setSortOrder}
//                     >
//                       <s-choice value="asc">A-Z</s-choice>
//                       <s-choice value="desc">Z-A</s-choice>
//                     </s-choice-list>
//                   </s-box>
//                 </s-stack>
//               </s-popover> */}
//             </s-stack>
//           </s-stack>

//           {/* Variants Table */}
//           <s-box border="base" borderRadius="base">
//             <s-table>
//               <s-grid
//                 slot="filters"
//                 gap="small-200"
//                 gridTemplateColumns="1fr auto"
//               >
//                 <s-text-field
//                   label="Search products"
//                   labelAccessibilityVisibility="exclusive"
//                   icon="search"
//                   placeholder="Searching all products"
//                   value={searchQuery}
//                   onChange={setSearchQuery}
//                 />
//               </s-grid>

//               <s-table-header-row>
//                 <s-table-header listSlot="primary">
//                   <s-stack direction="inline" gap="base">
//                     <s-checkbox
//                       checked={selectAll}
//                       onChange={handleSelectAll}
//                       indeterminate={
//                         selectedRows.size > 0 &&
//                         selectedRows.size < filteredVariants.length
//                       }
//                     />
//                     <s-heading>Product ({filteredVariants.length})</s-heading>
//                   </s-stack>
//                 </s-table-header>

//                 <s-table-header listSlot="kicker">
//                   Existing
//                   {assignmentType === "sku"
//                     ? " SKU"
//                     : assignmentType === "barcode"
//                       ? " Barcode"
//                       : assignmentType === "both"
//                         ? " Values"
//                         : ""}
//                 </s-table-header>

//                 <s-table-header listSlot="inline">
//                   New
//                   {assignmentType === "sku"
//                     ? " SKU"
//                     : assignmentType === "barcode"
//                       ? " Barcode"
//                       : assignmentType === "both"
//                         ? " Values"
//                         : ""}
//                 </s-table-header>

//                 <s-table-header listSlot="labeled" format="base">
//                   Status
//                 </s-table-header>
//                 <s-table-header listSlot="labeled" format="numeric">
//                   Inventory
//                 </s-table-header>
//                 <s-table-header listSlot="labeled" format="numeric">
//                   Label count
//                 </s-table-header>
//                 <s-table-header listSlot="labeled" format="currency">
//                   Actions
//                 </s-table-header>
//               </s-table-header-row>

//               <s-table-body>
//                 {filteredVariants.map((variant) => (
//                   <s-table-row
//                     key={variant?.variantId}
//                     clickDelegate={variant?.variantId}
//                   >
//                     <s-table-cell>
//                       <s-stack
//                         direction="inline"
//                         gap="small-200"
//                         alignItems="center"
//                       >
//                         <s-checkbox
//                           id={variant?.variantId}
//                           checked={selectedRows.has(variant?.variantId)}
//                           onChange={() => handleRowSelect(variant?.variantId)}
//                         />
//                         {variant?.image && (
//                           <s-thumbnail
//                             source={variant?.image}
//                             alt={variant?.productTitle}
//                             size="small"
//                           />
//                         )}
//                         <s-stack gap="none">
//                           <s-heading>{variant?.productTitle}</s-heading>
//                           <s-text size="small" tone="subdued">
//                             {variant?.title}
//                             {variant?.options?.length > 0 &&
//                               ` - ${variant?.options.map((opt) => opt.value).join(" / ")}`}
//                           </s-text>
//                         </s-stack>
//                       </s-stack>
//                     </s-table-cell>

//                     <s-table-cell>
//                       <s-stack gap="small-100">
//                         {(assignmentType === "sku" ||
//                           assignmentType === "both") && (
//                           <s-text
//                             tone={variant?.sku ? "auto" : "critical"}
//                             size="small"
//                           >
//                             <s-text fontWeight="bold" tone="subdued" as="span">
//                               {assignmentType === "both" ? "SKU: " : ""}
//                             </s-text>
//                             {variant?.sku || "Missing"}
//                           </s-text>
//                         )}
//                         {(assignmentType === "barcode" ||
//                           assignmentType === "both") && (
//                           <s-text
//                             tone={variant?.barcode ? "auto" : "critical"}
//                             size="small"
//                           >
//                             <s-text fontWeight="bold" tone="subdued" as="span">
//                               {assignmentType === "both" ? "Barcode: " : ""}
//                             </s-text>
//                             {variant?.barcode || "Missing"}
//                           </s-text>
//                         )}
//                       </s-stack>
//                     </s-table-cell>

//                     <s-table-cell>
//                       <s-stack gap="small-100">
//                         {(assignmentType === "sku" ||
//                           assignmentType === "both") && (
//                           <s-text-field
//                             size="slim"
//                             placeholder="New SKU"
//                             value={variant?.newSku || ""}
//                             onChange={(e) => {
//                               const updated = selectedVariants.map((v) =>
//                                 v?.variantId === variant?.variantId
//                                   ? { ...v, newSku: e.target.value }
//                                   : v,
//                               );
//                               setSelectedVariants(updated);
//                             }}
//                           />
//                         )}
//                         {(assignmentType === "barcode" ||
//                           assignmentType === "both") && (
//                           <s-text> {variant?.newBarcode || ""}</s-text>
//                         )}
//                       </s-stack>
//                     </s-table-cell>

//                     <s-table-cell>
//                       <s-badge
//                         tone={
//                           variant?.status === "ACTIVE" ? "success" : "warning"
//                         }
//                       >
//                         {variant?.status?.toLowerCase() || "unknown"}
//                       </s-badge>
//                     </s-table-cell>

//                     <s-table-cell>
//                       <s-text>{variant?.inventory || 0}</s-text>
//                     </s-table-cell>

//                     <s-table-cell>
//                       <div style={{ maxWidth: "80px" }}>
//                         <s-number-field
//                           value={labelQuantities[variant?.variantId] || 0}
//                           min={0}
//                           step={1}
//                           inputMode="numeric"
//                           onChange={(val) =>
//                             handleLabelQuantityChange(variant?.variantId, val)
//                           }
//                         />
//                       </div>
//                     </s-table-cell>

//                     <s-table-cell>
//                       <s-stack
//                         direction="inline"
//                         gap="none"
//                         justifyContent="end"
//                       >
//                         <s-button
//                           variant="tertiary"
//                           onClick={() => {
//                             setGenerationModal({
//                               type: "single",
//                               variant: variant,
//                             });
//                           }}
//                           icon="print"
//                           disabled={
//                             assignmentType !== "both"
//                               ? !variant?.[assignmentType]
//                               : !variant?.barcode || !variant?.sku
//                           }
//                           tooltip="Print label"
//                         />
//                         <s-button
//                           variant="tertiary"
//                           tone="critical"
//                           onClick={() =>
//                             handleRemoveVariant(variant?.variantId)
//                           }
//                           icon="x-circle"
//                           tooltip="Remove"
//                         />
//                       </s-stack>
//                     </s-table-cell>
//                   </s-table-row>
//                 ))}
//               </s-table-body>
//             </s-table>
//           </s-box>

//           {/* Footer with summary */}
//           <s-stack align="space-between">
//             <s-text tone="subdued" size="small">
//               Showing {filteredVariants.length} of {selectedVariants.length}{" "}
//               variants
//               {searchQuery && ` (filtered)`}
//             </s-text>
//             <s-text fontWeight="bold">
//               Total labels:{" "}
//               {Object.values(labelQuantities).reduce((a, b) => a + b, 0)}
//             </s-text>
//           </s-stack>
//         </s-stack>
//       )}

//       {/* Empty State */}
//       {(!selectedVariants || !selectedVariants?.length) && (
//         <s-stack
//           direction="column"
//           gap="medium-200"
//           alignItems="center"
//           padding="800"
//         >
//           <s-icon name="products" size="large" />
//           <s-heading level="3">No products selected</s-heading>
//           <s-text tone="subdued">
//             Click "Browse Products" to select variants
//           </s-text>
//           <s-button variant="primary" onClick={handleResourcePicker}>
//             Browse Products
//           </s-button>
//         </s-stack>
//       )}
//     </>
//   );
// }

import { useEffect, useState } from "react";

export default function SelectedProductsTable({
  selectedVariants,
  setSelectedVariants,
  isLoading,
  setGenerationModal,
  assignmentType,
  generationType,
  overwriteExisting,
  // selectAll,
  // setSelectAll,
  selectedRows,
  setSelectedRows,
  handleResourcePicker,
}) {
  console.log("selectedVariants", selectedVariants);
  console.log("assignmentType", assignmentType);
  console.log("selectedRows", selectedRows);
  const [quantityType, setQuantityType] = useState("");
  const [customQuantity, setCustomQuantity] = useState(0);
  const [labelQuantities, setLabelQuantities] = useState({});
  const [sortBy, setSortBy] = useState("ProductTitle");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const selectAll =
    selectedVariants.length > 0 &&
    selectedRows.size === selectedVariants.length;
  console.log("selectAll", selectAll);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(selectedVariants.map((v) => v.variantId)));
    }
  };

  // Handle single row select
  const handleRowSelect = (id) => {
    setSelectedRows((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  // Remove single variant
  const handleRemoveVariant = (id) => {
    console.log("idddd", id);
    setSelectedVariants((prev) => {
      console.log(prev.length);
      const filtered = prev.filter((v) => v.variantId !== id);
      console.log(filtered.length);
      return filtered;
    });

    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  // Clear all variants
  const handleClearAll = () => {
    setSelectedVariants([]);
    setSelectedRows(new Set());
  };

  useEffect(() => {
    setSelectedRows((prev) => {
      const validIds = new Set(selectedVariants.map((v) => v.variantId));
      const cleaned = new Set([...prev].filter((id) => validIds.has(id)));

      if (cleaned.size !== prev.size) {
        return cleaned;
      }
      return prev;
    });
  }, [selectedVariants]);
  const handleApplyQuantity = () => {
    setSelectedVariants((prev) => {
      return prev.map((variant) => {
        // Only update if variant is selected
        if (selectedRows.has(variant.variantId)) {
          console.log("selectedRows", selectedRows);
          if (quantityType === "match_inventory") {
            return {
              ...variant,
              label_quantity: variant.inventory || 0,
            };
          } else if (quantityType === "custom" && customQuantity) {
            return {
              ...variant,
              label_quantity: customQuantity,
            };
          }
        }
        return {
          ...variant,
          label_quantity: variant.label_quantity || 0,
        };
      });
    });
  };
  return (
    <>
      {selectedVariants.length > 0 && (
        <s-stack gap="small">
          <s-stack direction="inline" justifyContent="end">
            <s-stack
              direction="inline"
              gap="small-100"
              wrap={false}
              align="space-between"
            >
              <s-link tone="critical" onClick={handleClearAll}>
                Clear All
              </s-link>
              {/* <s-link
                commandFor="label-count-popover"
                onClick={() => setQuantityType("")}
              >
                Set quantity
              </s-link>
              <s-popover id="label-count-popover">
                <s-box padding="base" style={{ minWidth: "300px" }}>
                  <s-stack gap="small-200">
                    <s-heading>Set print quantity for selected</s-heading>
                    <s-choice-list
                      values={[quantityType]}
                      onChange={(e) => {
                        console.log(e.currentTarget.values?.[0]);
                        setQuantityType(e.currentTarget.values?.[0]);
                      }}
                    >
                      <s-choice value="match_inventory">
                        Match Inventory
                      </s-choice>
                      <s-choice value="custom">Custom Quantity</s-choice>
                    </s-choice-list>

                    {quantityType === "custom" && (
                      <s-number-field
                        placeholder="Enter quantity"
                        value={customQuantity}
                        onChange={(e) => {
                          console.log("onChange", e.target.value);
                          setCustomQuantity(e.target.value);
                        }}
                        onInput={(e) => {
                          console.log("onInput", e.target.value);
                          setCustomQuantity(e.target.value);
                        }}
                        min={0}
                        step={1}
                        inputMode="numeric"
                      />
                    )}

                  

                    <s-stack justifyContent="end" gap="small-100">
                      <s-button
                        variant="primary"
                        onClick={handleApplyQuantity}
                        disabled={selectedRows.size === 0}
                        command="hide--"
                        commandFor="label-count-popover"
                      >
                        Apply
                      </s-button>
                    </s-stack>
                  </s-stack>
                </s-box>
              </s-popover> */}

              <s-link
                commandFor="generate-barcode-modal"
                command="--show"
                onClick={() =>
                  setGenerationModal({
                    type: "bulk",
                    count: selectedVariants.length,
                    variants: selectedVariants,
                  })
                }
                disabled={selectedVariants.length === 0}
              >
                Generate for {selectAll ? "all" : selectedVariants.length}{" "}
                variant
                {selectedVariants.length > 1 ? "s" : ""}
              </s-link>
              <s-link tone="critical" onClick={() => {}}>
                Sort
              </s-link>
            </s-stack>
          </s-stack>
          {/* Variants Table */}
          <s-box border="base" borderRadius="base">
            <s-table>
              <s-grid
                slot="filters"
                gap="small-200"
                gridTemplateColumns="1fr auto"
              >
                <s-text-field
                  label="Search products"
                  labelAccessibilityVisibility="exclusive"
                  icon="search"
                  placeholder="Searching all products"
                />
                <s-button
                  icon="sort"
                  variant="secondary"
                  accessibilityLabel="Sort"
                  interestFor="sort-tooltip"
                  commandFor="sort-actions"
                />
                <s-tooltip id="sort-tooltip">
                  <s-text>Sort</s-text>
                </s-tooltip>
                <s-popover id="sort-actions">
                  <s-stack gap="none">
                    <s-box padding="small">
                      <s-choice-list label="Sort by" name="Sort by">
                        <s-choice value="ProductTitle" selected>
                          Product
                        </s-choice>
                        <s-choice value="title">variant</s-choice>
                        <s-choice value="inventory">inventory</s-choice>
                        <s-choice value="barcode">Barcode</s-choice>
                        <s-choice value="sku">SKU</s-choice>
                        <s-choice value="price">Price</s-choice>
                      </s-choice-list>
                    </s-box>
                    <s-divider />
                    <s-box padding="small">
                      <s-choice-list label="Order by" name="Order by">
                        <s-choice value="product-title" selected>
                          A-Z
                        </s-choice>
                        <s-choice value="created">Z-A</s-choice>
                      </s-choice-list>
                    </s-box>
                  </s-stack>
                </s-popover>
              </s-grid>
              <s-table-header-row>
                <s-table-header listSlot="primary">
                  <s-stack direction="inline" gap="base">
                    <s-checkbox
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                    <s-heading>Product</s-heading>
                  </s-stack>
                </s-table-header>
                <s-table-header listSlot="kicker">
                  Existing
                  {assignmentType == "sku"
                    ? " SKU"
                    : assignmentType == "barcode"
                      ? " Barcode"
                      : ""}
                </s-table-header>
                <s-table-header listSlot="inline">
                  New
                  {assignmentType == "sku"
                    ? " SKU"
                    : assignmentType == "barcode"
                      ? " Barcode"
                      : ""}
                </s-table-header>

                <s-table-header listSlot="labeled" format="base">
                  Status
                </s-table-header>
                {/* <s-table-header listSlot="labeled" format="numeric">
                  Inventory
                </s-table-header> */}
                {/* <s-table-header listSlot="labeled" format="numeric">
                  Label count
                </s-table-header> */}
                <s-table-header listSlot="labeled" format="currency">
                  Actions
                </s-table-header>
              </s-table-header-row>
              <s-table-body>
                {selectedVariants.map((variant) => (
                  <s-table-row
                    key={variant?.variantId}
                    clickDelegate={variant?.variantId}
                  >
                    <s-table-cell>
                      <s-stack
                        direction="inline"
                        gap="small-200"
                        alignItems="center"
                      >
                        <s-checkbox
                          id={variant?.variantId}
                          checked={selectedRows.has(variant?.variantId)}
                          onChange={() => handleRowSelect(variant?.variantId)}
                        />
                        {variant?.image && (
                          <s-thumbnail
                            source={variant?.image}
                            alt={variant?.productTitle}
                            size="small"
                          />
                        )}
                        <s-stack gap="none">
                          <s-heading>{variant?.productTitle}</s-heading>
                          <s-text>{variant?.title}</s-text>
                        </s-stack>
                      </s-stack>
                    </s-table-cell>

                    <s-table-cell>
                      <s-stack>
                        {(assignmentType == "sku" ||
                          assignmentType == "both") && (
                          <s-text tone={variant?.sku ? "auto" : "critical"}>
                            {assignmentType == "both" ? "SKU :" : ""}
                            {variant?.sku || "Missing"}
                          </s-text>
                        )}
                        {(assignmentType == "barcode" ||
                          assignmentType == "both") && (
                          <s-text tone={variant?.barcode ? "auto" : "critical"}>
                            {assignmentType == "both" ? "Barcode:" : ""}
                            {variant?.barcode || "Missing"}
                          </s-text>
                        )}
                      </s-stack>
                    </s-table-cell>

                    <s-table-cell>
                      <s-stack>
                        {(assignmentType == "sku" ||
                          assignmentType == "both") && (
                          <s-text>
                            {assignmentType == "both" ? "SKU :" : ""}
                            {variant?.sku}
                          </s-text>
                        )}
                        {(assignmentType == "barcode" ||
                          assignmentType == "both") && (
                          <s-text>
                            {assignmentType == "both" ? "Barcode:" : ""}
                            {variant?.barcode}
                          </s-text>
                        )}
                      </s-stack>
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge
                        tone={
                          variant?.status == "ACTIVE" ? "success" : "warning"
                        }
                      >
                        {variant?.status?.toLowerCase()}
                      </s-badge>
                    </s-table-cell>
                    {/* <s-table-cell>
                      <s-text>{variant?.inventory}</s-text>
                    </s-table-cell> */}
                    {/* <s-table-cell>
                      <div style={{ maxWidth: "80px" }}>
                        <s-number-field
                          value={variant.label_quantity}
                          min={0}
                          step={1}
                          inputMode="numeric"
                          onChange={(e) => {
                            console.log("onChange", e.target.value);
                            setCustomQuantity(e.target.value);
                          }}
                          onInput={(e) => {
                            console.log("onInput", e.target.value);
                            setCustomQuantity(e.target.value);
                          }}
                        />
                      </div>
                    </s-table-cell> */}
                    <s-table-cell>
                      <s-stack
                        direction="inline"
                        gap="none"
                        justifyContent="end"
                      >
                        {/* <s-button
                          variant="tertiary"
                          onClick={() => {}}
                          icon="print"
                          disabled={
                            assignmentType !== "both"
                              ? !variant?.[assignmentType]
                              : variant?.barcode && variant?.sku
                          }
                        /> */}
                        <s-button
                          variant="tertiary"
                          tone="critical"
                          onClick={() =>
                            handleRemoveVariant(variant?.variantId)
                          }
                          icon="x-circle"
                        />
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          </s-box>
        </s-stack>
      )}

      {/* Empty State */}
      {(!selectedVariants || !selectedVariants?.length) && (
        <s-stack
          direction="column"
          gap="medium-200"
          alignItems="center"
          padding="800"
        >
          <s-icon name="products" size="large" />
          <s-heading level="3">No products selected</s-heading>
          <s-text tone="subdued">
            Click "Browse Products" to select variants
          </s-text>
          <s-button variant="primary" onClick={() => handleResourcePicker()}>
            Browse Products
          </s-button>
        </s-stack>
      )}
    </>
  );
}
