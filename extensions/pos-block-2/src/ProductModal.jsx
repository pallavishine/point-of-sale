import { render } from "preact";
import { useState, useEffect, useCallback, useMemo } from "preact/hooks";
import FieldRenderer from "./FieldRenderer.jsx";

export default async () => {
  render(<ProductModal />, document.body);
};

// ── Constants ────────────────────────────────────────────────────────────────
const PRODUCT_QUERY = `#graphql
  query GetProduct($id: ID!) {
    product(id: $id) {
      title
      vendor
      collections(first: 150) {
        edges { node { id } }
      }
      variants(first: 10) {
        edges {
          node { id title price sku }
        }
      }
    }
  }
`;

// ── Utility Functions ────────────────────────────────────────────────────────
const numericId = (globalId) => parseInt(globalId.split("/").pop() ?? "0", 10);

const gql = async (query, variables) => {
  const response = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
};

// ── Condition Evaluator ─────────────────────────────────────────────────────
const evaluateConditions = (field, formValues, allFields) => {
  const cond = field.conditions;
  if (!cond?.hasCondition || !cond.rules?.length) return true;

  const results = cond.rules.map((rule) => {
    if (!rule.fieldId || rule.fieldId === "none") return true;

    const sourceField = allFields.find((f) => f.id === rule.fieldId);
    if (!sourceField) return true;

    const currentVal = formValues[rule.fieldId];

    // Switch — boolean
    if (sourceField.fieldType === "switch") {
      const isOn = !!currentVal;
      if (rule.operator === "ON") return isOn;
      if (rule.operator === "OFF") return !isOn;
      return true;
    }

    // Checkbox — currentVal is an array
    if (sourceField.fieldType === "checkbox") {
      const arr = Array.isArray(currentVal) ? currentVal : [];
      const rv = String(rule.value ?? "");
      if (rule.operator === "EQUALS") return arr.includes(rv);
      if (rule.operator === "NOTEQUALS") return !arr.includes(rv);
      return true;
    }

    // Number
    if (sourceField.fieldType === "number") {
      const num = Number(currentVal);
      const ruleNum = Number(rule.value);
      switch (rule.operator) {
        case "EQUALS": return num === ruleNum;
        case "NOTEQUALS": return num !== ruleNum;
        case "LESS": return num < ruleNum;
        case "GREATER": return num > ruleNum;
        default: return true;
      }
    }

    // Text / everything else
    const strVal = String(currentVal ?? "").toLowerCase();
    const ruleVal = String(rule.value ?? "").toLowerCase();
    switch (rule.operator) {
      case "EQUALS": return strVal === ruleVal;
      case "NOTEQUALS": return strVal !== ruleVal;
      case "CONTAIN": return strVal.includes(ruleVal);
      case "DOESNOTCONTAIN": return !strVal.includes(ruleVal);
      default: return true;
    }
  });

  const passes = cond.match === "ALL" ? results.every(Boolean) : results.some(Boolean);
  return cond.display === "SHOW" ? passes : !passes;
};

// ── Addon Calculator ────────────────────────────────────────────────────────
const calculateAddons = (fields, formValues) => {
  const addons = [];
  
  fields.forEach((field) => {
    if (!evaluateConditions(field, formValues, fields)) return;
    
    const value = formValues[field.id];
    if (value === undefined || value === null || value === "") return;

    // Switch field
    if (field.fieldType === "switch" && value === true && field.addonPrice > 0) {
      addons.push({
        key: field.id,
        price: field.addonPrice,
        fieldId: field.id,
        label: field.label
      });
    }
    
    // Radio / Image Swatch / Button fields
    else if (["radio", "image_swatch", "button"].includes(field.fieldType)) {
      const selectedOption = field.options?.find((opt) => opt.name === value);
      if (selectedOption?.addonPrice > 0) {
        addons.push({
          key: `${field.id}_${selectedOption.name}`,
          price: selectedOption.addonPrice,
          fieldId: field.id,
          label: `${field.label} - ${selectedOption.name}`
        });
      }
    }
    
    // Checkbox field
    else if (field.fieldType === "checkbox") {
      const selectedValues = Array.isArray(value) ? value : [];
      selectedValues.forEach((selectedValue) => {
        const selectedOption = field.options?.find((opt) => opt.name === selectedValue);
        if (selectedOption?.addonPrice > 0) {
          addons.push({
            key: `${field.id}_${selectedOption.name}`,
            price: selectedOption.addonPrice,
            fieldId: field.id,
            label: `${field.label} - ${selectedOption.name}`
          });
        }
      });
    }
    
    // Other input types
    else if (value && field.addonPrice > 0) {
      addons.push({
        key: field.id,
        price: field.addonPrice,
        fieldId: field.id,
        label: field.label
      });
    }
  });
  
  return addons;
};

// ── Addon Processor for Cart ────────────────────────────────────────────────
const processAddonsToCart = async (visibleFields, formValues) => {
  const addonPromises = [];
  let totalPrice = 0;

  for (const field of visibleFields) {
    const value = formValues[field.id];
    if (!value) continue;

    // Switch field
    if (field.fieldType === "switch" && value === true && field.addonPrice > 0) {
      totalPrice += field.addonPrice;
      addonPromises.push(
        shopify.cart.addCustomSale({
          title: `[Addon] ${field.label}`,
          price: String(field.addonPrice),
          quantity: 1,
          taxable: true,
        })
      );
    }
    
    // Radio / Image Swatch / Button fields
    else if (["radio", "image_swatch", "button"].includes(field.fieldType)) {
      const opt = field.options?.find(o => o.name === value);
      if (opt?.addonPrice > 0) {
        totalPrice += opt.addonPrice;
        addonPromises.push(
          shopify.cart.addCustomSale({
            title: `[Addon] ${field.label} - ${opt.name}`,
            price: String(opt.addonPrice),
            quantity: 1,
            taxable: true,
          })
        );
      }
    }
    
    // Checkbox field
    else if (field.fieldType === "checkbox") {
      const selectedValues = Array.isArray(value) ? value : [];
      for (const val of selectedValues) {
        const opt = field.options?.find(o => o.name === val);
        if (opt?.addonPrice > 0) {
          totalPrice += opt.addonPrice;
          addonPromises.push(
            shopify.cart.addCustomSale({
              title: `[Addon] ${field.label} - ${opt.name}`,
              price: String(opt.addonPrice),
              quantity: 1,
              taxable: true,
            })
          );
        }
      }
    }
    
    // Other input types
    else if (field.addonPrice > 0) {
      totalPrice += field.addonPrice;
      addonPromises.push(
        shopify.cart.addCustomSale({
          title: `[Addon] ${field.label}`,
          price: String(field.addonPrice),
          quantity: 1,
          taxable: true,
        })
      );
    }
  }

  if (addonPromises.length > 0) {
    await Promise.all(addonPromises);
  }

  return { totalPrice, addonCount: addonPromises.length };
};

// ── Main Component ──────────────────────────────────────────────────────────
function ProductModal() {
  // State
  const [productData, setProductData] = useState(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [fields, setFields] = useState([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [customProperties, setCustomProperties] = useState({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [totalAddons, setTotalAddons] = useState([]);

  const productNumericId = shopify.product.id;
  const SERVER = "https://donated-mold-sight-aud.trycloudflare.com";

  // ── Memoized Values ───────────────────────────────────────────────────────
  const visibleFields = useMemo(
    () => fields.filter((field) => evaluateConditions(field, customProperties, fields)),
    [fields, customProperties]
  );

  const totalAddonPrice = useMemo(
    () => totalAddons.reduce((acc, a) => acc + a.price, 0),
    [totalAddons]
  );

  // ── Effects ────────────────────────────────────────────────────────────────
  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const responseData = await gql(PRODUCT_QUERY, {
          id: `gid://shopify/Product/${productNumericId}`,
        });

        const productNode = responseData?.data?.product;
        if (!productNode) {
          shopify.toast.show("Failed to load product");
          return;
        }

        const formattedVariants = productNode.variants.edges.map(({ node }) => ({
          id: node.id,
          numericId: numericId(node.id),
          title: node.title,
          price: node.price,
          sku: node.sku ?? "",
        }));

        const colIds = productNode?.collections?.edges?.map(({ node }) => node.id) || [];

        setProductData({
          title: productNode.title,
          vendor: productNode.vendor,
          variants: formattedVariants,
          colIds,
        });

        if (formattedVariants.length > 0) {
          setSelectedVariant(formattedVariants[0]);
        }
      } catch (err) {
        shopify.toast.show(err.message);
      } finally {
        setIsLoadingProduct(false);
      }
    };

    fetchProduct();
  }, [productNumericId]);

  // Fetch fields
  useEffect(() => {
    if (!productData?.colIds) return;

    const fetchFields = async () => {
      try {
        const token = await shopify.session.getSessionToken();
        const res = await fetch(
          `${SERVER}/api/getFields?shop=${shopify.session.currentSession.shopDomain}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              productId: `gid://shopify/Product/${productNumericId}`,
              colIds: productData.colIds,
            }),
          }
        );

        const data = await res.json();
        setFields(data?.data || []);
        shopify.toast.show("Fields loaded");
      } catch (error) {
        shopify.toast.show(error.message);
      } finally {
        setIsLoadingFields(false);
      }
    };

    fetchFields();
  }, [productNumericId, productData?.colIds]);

  // Recalculate addons
  useEffect(() => {
    if (fields.length > 0) {
      const newAddons = calculateAddons(fields, customProperties);
      setTotalAddons(newAddons);
    }
  }, [fields, customProperties]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOnChange = useCallback((id, val) => {
    setCustomProperties((prev) => ({ ...prev, [id]: val }));
  }, []);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    // Validate required fields
    const missingField = visibleFields.find(
      (field) => field.required && !customProperties[field.id]
    );
    
    if (missingField) {
      shopify.toast.show(`${missingField.label} is required`);
      return;
    }

    setIsAddingToCart(true);

    try {
      // Add main product
      const lineItemId = await shopify.cart.addLineItem(selectedVariant.numericId, 1);
      
      if (!lineItemId) {
        shopify.toast.show("Failed to add product");
        return;
      }

      // Add field values as properties
      const properties = {};
      visibleFields.forEach((field) => {
        const value = customProperties[field.id];
        if (value === undefined || value === null || value === "") return;
        
        properties[field.label] = field.fieldType === "checkbox" && Array.isArray(value)
          ? value.join(", ")
          : String(value);
      });

      if (Object.keys(properties).length > 0) {
        await shopify.cart.addLineItemProperties(lineItemId, properties);
      }

      // Process and add addons
      const { totalPrice, addonCount } = await processAddonsToCart(visibleFields, customProperties);

      // Show success message
      const message = addonCount > 0
        ? `Added to cart with ${addonCount} addon(s) worth $${totalPrice}`
        : "Added to cart";
      shopify.toast.show(message);
      
      // Reset form
      setCustomProperties({});
      setTotalAddons([]);
      
    } catch (error) {
      console.error("Add to cart error:", error);
      shopify.toast.show(
        `Error adding to cart: ${error?.message || "Something went wrong"}`,
        { isError: true }
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  // ── Render Loading / Error States ─────────────────────────────────────────
  if (isLoadingProduct) {
    return (
      <s-page heading="Loading">
        <s-stack alignItems="center" alignContent="center" padding="base">
          <s-text>Loading product...</s-text>
        </s-stack>
      </s-page>
    );
  }

  if (!productData || !selectedVariant) {
    return (
      <s-page heading="Error">
        <s-text>No product found</s-text>
      </s-page>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <s-page heading={productData.title}>
      <s-scroll-box padding="large">
        {isLoadingFields ? (
          <s-stack alignContent="center">
            <s-text>Loading options...</s-text>
          </s-stack>
        ) : (
          visibleFields.length > 0 && (
            <s-section heading="Custom Options">
              {totalAddonPrice > 0 && (
                <s-stack direction="inline" justifyContent="center">
                  <s-badge tone="info">
                    Total Addon Price: ${totalAddonPrice}
                  </s-badge>
                </s-stack>
              )}

              <s-stack gap="base" padding="base">
                {visibleFields.map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={customProperties[field.id]}
                    onChange={(id, val) => handleOnChange(id, val)}
                  />
                ))}
              </s-stack>
            </s-section>
          )
        )}

        <s-button
          variant="primary"
          onClick={handleAddToCart}
          loading={isAddingToCart}
        >
          Add to Cart {totalAddonPrice > 0 && `(+$${totalAddonPrice})`}
        </s-button>
      </s-scroll-box>
    </s-page>
  );
}
// import { render } from "preact";
// import { useState, useEffect } from "preact/hooks";
// import FieldRenderer from "./FieldRenderer.jsx";

// export default async () => {
//   render(<ProductModal />, document.body);
// };

// // ── Helper Functions ────────────────────────────────────────────────────────

// // Condition evaluator - returns true if field should be VISIBLE
// // @ts-ignore
// function evaluateConditions(field, formValues, allFields) {
//   const cond = field.conditions;
//   if (!cond?.hasCondition || !cond.rules?.length) return true;

//   // @ts-ignore
//   const results = cond.rules.map((rule) => {
//     if (!rule.fieldId || rule.fieldId === "none") return true;

//     // @ts-ignore
//     const sourceField = allFields.find((f) => f.id === rule.fieldId);
//     if (!sourceField) return true;

//     const currentVal = formValues[rule.fieldId];

//     // Switch — boolean
//     if (sourceField.fieldType === "switch") {
//       const isOn = !!currentVal;
//       if (rule.operator === "ON") return isOn;
//       if (rule.operator === "OFF") return !isOn;
//       return true;
//     }

//     // Checkbox — currentVal is an array
//     if (sourceField.fieldType === "checkbox") {
//       const arr = Array.isArray(currentVal) ? currentVal : [];
//       const rv = String(rule.value ?? "");
//       if (rule.operator === "EQUALS") return arr.includes(rv);
//       if (rule.operator === "NOTEQUALS") return !arr.includes(rv);
//       return true;
//     }

//     // Number
//     if (sourceField.fieldType === "number") {
//       const num = Number(currentVal);
//       const ruleNum = Number(rule.value);
//       switch (rule.operator) {
//         case "EQUALS": return num === ruleNum;
//         case "NOTEQUALS": return num !== ruleNum;
//         case "LESS": return num < ruleNum;
//         case "GREATER": return num > ruleNum;
//         default: return true;
//       }
//     }

//     // Text / everything else
//     const strVal = String(currentVal ?? "").toLowerCase();
//     const ruleVal = String(rule.value ?? "").toLowerCase();
//     switch (rule.operator) {
//       case "EQUALS": return strVal === ruleVal;
//       case "NOTEQUALS": return strVal !== ruleVal;
//       case "CONTAIN": return strVal.includes(ruleVal);
//       case "DOESNOTCONTAIN": return !strVal.includes(ruleVal);
//       default: return true;
//     }
//   });

//   const passes = cond.match === "ALL" ? results.every(Boolean) : results.some(Boolean);
//   return cond.display === "SHOW" ? passes : !passes;
// }

// // Common function to calculate addons based on current visible fields and values
// // @ts-ignore
// function calculateAddons(fields, formValues) {
//   // @ts-ignore
//   const addons = [];
  
//   // @ts-ignore
//   fields.forEach((field) => {
//     // Only process visible fields
//     if (!evaluateConditions(field, formValues, fields)) return;
    
//     const value = formValues[field.id];
//     if (value === undefined || value === null || value === "") return;

//     // -------- SWITCH --------
//     if (field.fieldType === "switch") {
//       if (value === true && field.addonPrice > 0) {
//         addons.push({
//           key: field.id,
//           price: field.addonPrice,
//           fieldId: field.id,
//           label: field.label
//         });
//       }
//     }
    
//     // -------- RADIO / IMAGE / BUTTON --------
//     else if (
//       field.fieldType === "radio" ||
//       field.fieldType === "image_swatch" ||
//       field.fieldType === "button"
//     ) {
//       // @ts-ignore
//       const selectedOption = field.options?.find((opt) => opt.name === value);
//       if (selectedOption?.addonPrice > 0) {
//         addons.push({
//           key: `${field.id}_${selectedOption.name}`,
//           price: selectedOption.addonPrice,
//           fieldId: field.id,
//           label: `${field.label} - ${selectedOption.name}`
//         });
//       }
//     }
    
//     // -------- CHECKBOX --------
//     else if (field.fieldType === "checkbox") {
//       const selectedValues = Array.isArray(value) ? value : [];
//       selectedValues.forEach((selectedValue) => {
//         // @ts-ignore
//         const selectedOption = field.options?.find((opt) => opt.name === selectedValue);
//         if (selectedOption?.addonPrice > 0) {
//           addons.push({
//             key: `${field.id}_${selectedOption.name}`,
//             price: selectedOption.addonPrice,
//             fieldId: field.id,
//             label: `${field.label} - ${selectedOption.name}`
//           });
//         }
//       });
//     }
    
//     // -------- OTHER INPUTS (text, number, etc.) --------
//     else {
//       if (value && field.addonPrice > 0) {
//         addons.push({
//           key: field.id,
//           price: field.addonPrice,
//           fieldId: field.id,
//           label: field.label
//         });
//       }
//     }
//   });
  
//   // @ts-ignore
//   return addons;
// }

// // Get visible fields only
// // @ts-ignore
// function getVisibleFields(fields, formValues) {
//   // @ts-ignore
//   return fields.filter((field) => evaluateConditions(field, formValues, fields));
// }

// // Get addon properties for cart
// // @ts-ignore
// function getAddonProperties(addons) {
//   const properties = {};
//   if (addons.length > 0) {
//     // @ts-ignore
//     properties["_addons"] = JSON.stringify(addons.map(a => ({
//       label: a.label,
//       price: a.price
//     })));
//     // @ts-ignore
//     properties["_addons_total"] = addons.reduce((sum, a) => sum + a.price, 0).toString();
//   }
//   return properties;
// }

// function ProductModal() {
//   const [productData, setProductData] = useState(null);
//   const [isLoadingProduct, setIsLoadingProduct] = useState(true);
//   const [selectedVariant, setSelectedVariant] = useState(null);

//   const [fields, setFields] = useState([]);
//   const [isLoadingFields, setIsLoadingFields] = useState(true);

//   const [customProperties, setCustomProperties] = useState({});
//   const [isAddingToCart, setIsAddingToCart] = useState(false);
//   const [totalAddons, setTotalAddons] = useState([]);

//   const productNumericId = shopify.product.id;
//   const SERVER = "https://donated-mold-sight-aud.trycloudflare.com";

//   // @ts-ignore
//   function numericId(globalId) {
//     return parseInt(globalId.split("/").pop() ?? "0", 10);
//   }

//   // @ts-ignore
//   async function gql(query, variables) {
//     const response = await fetch("shopify:admin/api/graphql.json", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ query, variables }),
//     });
//     return response.json();
//   }

//   const PRODUCT_QUERY = `#graphql
//   query GetProduct($id: ID!) {
//     product(id: $id) {
//       title
//       vendor
//       collections(first: 150) {
//         edges { node { id } }
//       }
//       variants(first: 10) {
//         edges {
//           node { id title price sku }
//         }
//       }
//     }
//   }
// `;

//   // ── Fetch product ────────────────────────────────────────────────────────
//   useEffect(() => {
//     (async () => {
//       try {
//         const responseData = await gql(PRODUCT_QUERY, {
//           id: `gid://shopify/Product/${productNumericId}`,
//         });

//         const productNode = responseData?.data?.product;
//         if (!productNode) {
//           shopify.toast.show("Failed to load product");
//           return;
//         }

//         const formattedVariants = productNode.variants.edges.map(
//           // @ts-ignore
//           ({ node }) => ({
//             id: node.id,
//             numericId: numericId(node.id),
//             title: node.title,
//             price: node.price,
//             sku: node.sku ?? "",
//           }),
//         );

//         // @ts-ignore
//         const colIds = productNode?.collections?.edges?.map(({ node }) => node.id) || [];

//         setProductData({
//           // @ts-ignore
//           title: productNode.title,
//           vendor: productNode.vendor,
//           variants: formattedVariants,
//           colIds,
//         });

//         if (formattedVariants.length > 0)
//           setSelectedVariant(formattedVariants[0]);
//       } catch (err) {
//         // @ts-ignore
//         shopify.toast.show(err.message);
//       } finally {
//         setIsLoadingProduct(false);
//       }
//     })();
//   }, [productNumericId]);

//   // ── Fetch fields ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     // @ts-ignore
//     if (!productData?.colIds) return;

//     (async () => {
//       try {
//         const token = await shopify.session.getSessionToken();

//         const res = await fetch(
//           `${SERVER}/api/getFields?shop=${shopify.session.currentSession.shopDomain}`,
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer ${token}`,
//             },
//             body: JSON.stringify({
//               productId: `gid://shopify/Product/${productNumericId}`,
//               // @ts-ignore
//               colIds: productData.colIds,
//             }),
//           },
//         );

//         const data = await res.json();
//         setFields(data?.data || []);
//         shopify.toast.show("Fields loaded");
//       } catch (error) {
//         // @ts-ignore
//         shopify.toast.show(error.message);
//       } finally {
//         setIsLoadingFields(false);
//       }
//     })();
//   // @ts-ignore
//   }, [productNumericId, productData?.colIds]);

//   // ── Recalculate addons whenever fields or customProperties change ────────
//   useEffect(() => {
//     if (fields.length > 0) {
//       const newAddons = calculateAddons(fields, customProperties);
//       // @ts-ignore
//       setTotalAddons(newAddons);
//     }
//   }, [fields, customProperties]);

//   // ── handleOnChange - Update form values and let useEffect handle addons ───
//   // @ts-ignore
//   function handleOnChange(id, val, field) {
//     setCustomProperties((prev) => ({ ...prev, [id]: val }));
//   }

//   // ── handleAddToCart ───────────────────────────────────────────────────────
//   async function handleAddToCart() {
//     if (!selectedVariant) return;
  
//     // Get current visible fields
//     const visibleFields = getVisibleFields(fields, customProperties);
    
//     // Validate required fields
//     const missing = visibleFields.find(
//       // @ts-ignore
//       (f) => f.required && !customProperties[f.id]
//     );
    
//     if (missing) {
//       shopify.toast.show(`${missing.label} is required`);
//       return;
//     }
  
//     setIsAddingToCart(true);
  
//     try {
//       // STEP 1 — add main product
//       const lineItemId = await shopify.cart.addLineItem(
//         // @ts-ignore
//         selectedVariant.numericId,
//         1,
//       );
      
//       if (!lineItemId) {
//         shopify.toast.show("Failed to add product");
//         return;
//       }
  
//       // STEP 2 — attach visible field values as line item properties
//       const properties = {};
      
//       // @ts-ignore
//       visibleFields.forEach((field) => {
//         // @ts-ignore
//         const value = customProperties[field.id];
//         if (value === undefined || value === null || value === "") return;
        
//         if (field.fieldType === "checkbox" && Array.isArray(value)) {
//           // @ts-ignore
//           properties[field.label] = value.join(", ");
//         } else {
//           // @ts-ignore
//           properties[field.label] = String(value);
//         }
//       });
  
//       // STEP 3 — add all properties to cart
//       if (Object.keys(properties).length > 0) {
//         // @ts-ignore
//         await shopify.cart.addLineItemProperties(lineItemId, properties);
//       }
    
//       // STEP 4 — add addons as custom sales (separate line items)
//       let addonPromises = 0;
//       for (const field of visibleFields) {
//         const value = customProperties[field.id];
//         if (!value) continue;

//         if (field.fieldType === "switch") {
         
//           if (value === true && field.addonPrice > 0) {
//             await shopify.cart.addCustomSale({
//               title: `[Addon] ${field.label}`,
//               price: String(field.addonPrice),
//               quantity: 1,
//               taxable: true,
//             });
//             addonPromises=addonPromises + 1;
//           }
//         }
  
//         // 🔹 RADIO (single option)
//         else if (field.fieldType === "radio"|| field.fieldType === "image_swatch" || field.fieldType === "button" ) {
//           // @ts-ignore
//           const opt = field.options.find(o => o.name === value);

//         if (opt && opt.price > 0) {
//           await shopify.cart.addCustomSale({
//             title: `[Addon] ${field.label} - ${opt.name}`,
//             price: String(opt.price),
//             quantity: 1,
//             taxable: true,
//           });

//           addonPromises=addonPromises + 1;
//         }
//         }
  
  
//         // 🔹 CHECKBOX (multiple options)
//         else if (field.fieldType === "checkbox") {
//           // const selectedValues = Array.isArray(value) ? value : [];
//           for (const val of value) {
//             const opt = field.options.find(o => o.name === val);
  
//             if (opt && opt.price > 0) {
//               await shopify.cart.addCustomSale({
//                 title: `[Addon] ${field.label} - ${opt.name}`,
//                 price: String(opt.price),
//                 quantity: 1,
//                 taxable: true,
//               });
  
//               addonPromises=addonPromises + 1;
//             }
//           }
//         }
  
//         // 🔹 OTHER TYPES (textarea, date, time, number, text etc.)
//         else {
//           if (field.addonPrice > 0) {
//             addonPromises=addonPromises + 1;
//             await  shopify.cart.addCustomSale({
//               title: `[Addon] ${field.label}`,
//               price: String(field.addonPrice),
//               quantity: 1,
//               taxable: true,
//               })
            
//           }
//         }
//       }
//       // Show success message
//       if (totalAddonPrice > 0) {
//         shopify.toast.show(
//           `Added to cart with ${addonPromises} addon(s) worth $${totalAddonPrice}`
//         );
//       } else {
//         shopify.toast.show("Added to cart");
//       }
      
//       // Reset form after successful add
//       setCustomProperties({});
//       setTotalAddons([]);
      
//     } catch (error) {
//       console.error("Add to cart error:", error);
//       shopify.toast.show(
//         // @ts-ignore
//         `Error adding to cart: ${error?.message || "Something went wrong"}`,
//         // @ts-ignore
//         { isError: true },
//       );
//     } finally {
//       setIsAddingToCart(false);
//     }
//   }

//   // ── Loading / error states ────────────────────────────────────────────────
//   if (isLoadingProduct) {
//     return (
//       <s-page heading="Loading">
//         <s-stack alignItems="center" alignContent="center" padding="base">
//           <s-text>Loading product...</s-text>
//         </s-stack>
//       </s-page>
//     );
//   }

//   if (!productData || !selectedVariant) {
//     return (
//       <s-page heading="Error">
//         <s-text>No product found</s-text>
//       </s-page>
//     );
//   }

//   const visibleFields = getVisibleFields(fields, customProperties);
//   // @ts-ignore
//   const totalAddonPrice = totalAddons.reduce((acc, a) => acc + a.price, 0);

//   return (
//     <s-page heading={productData.
// // @ts-ignore
//     title}>
//       <s-scroll-box padding="large">
//         {isLoadingFields ? (
//           <s-stack alignContent="center">
//             <s-text>Loading options...</s-text>
//           </s-stack>
//         ) : (
//           visibleFields.length > 0 && (
//             <s-section heading="Custom Options">
//               {totalAddonPrice > 0 && (
//                 <s-stack direction="inline" justifyContent="center">
//                   <s-badge tone="info">
//                     Total Addon Price: ${totalAddonPrice}
//                   </s-badge>
//                 </s-stack>
//               )}

//               <s-stack gap="base" padding="base">
//                 {visibleFields.map((
// // @ts-ignore
//                 field) => (
//                   <FieldRenderer
//                     key={field.id}
//                     field={field}
//                     // @ts-ignore
//                     value={customProperties[field.id]}
//                     // @ts-ignore
//                     onChange={(id, val) => handleOnChange(id, val, field)}
//                   />
//                 ))}
//               </s-stack>
//             </s-section>
//           )
//         )}

//         <s-button
//           variant="primary"
//           onClick={handleAddToCart}
//           loading={isAddingToCart}
//         >
//           Add to Cart {totalAddonPrice > 0 && `(+$${totalAddonPrice})`}
//         </s-button>
//       </s-scroll-box>
//     </s-page>
//   );
// }