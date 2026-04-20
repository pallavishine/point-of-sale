// import { render } from "preact";
// import { useState, useEffect } from "preact/hooks";

// function numericId(globalId) {
//   return parseInt(globalId.split("/").pop() ?? "0", 10);
// }

// async function gql(query, variables) {
//   const response = await fetch("shopify:admin/api/graphql.json", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ query, variables }),
//   });
//   return response.json();
// }

// const PRODUCT_QUERY = `#graphql
//   query GetProduct($id: ID!) {
//     product(id: $id) {
//       title
//       vendor

//       variants(first: 10) {
//         edges {
//           node {
//             id
//             title
//             price
//             sku

//           }
//         }
//       }
//     }
//   }
// `;

// export default async () => {
//   render(<ProductModal />, document.body);
// };

// function ProductModal() {
//   const [productData, setProductData] = useState(null);
//   const [isLoadingProduct, setIsLoadingProduct] = useState(true);
//   const [selectedVariant, setSelectedVariant] = useState(null);
//   const [customProperties, setCustomProperties] = useState({});
//   const [propertyKey, setPropertyKey] = useState("");
//   const [propertyValue, setPropertyValue] = useState("");
//   const [isAddingToCart, setIsAddingToCart] = useState(false);

//   const productNumericId = shopify.product.id;

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
//         const variantEdges = productNode.variants?.edges ?? [];

//         const formattedVariants = variantEdges.map(({ node: variantNode }) => {


//           return {
//             id: variantNode.id,
//             numericId: numericId(variantNode.id),
//             title: variantNode.title,
//             price: variantNode.price,
//             sku: variantNode.sku ?? "",
//           };
//         });

//         setProductData({
//           title: productNode.title,
//           vendor: productNode.vendor,
//           variants: formattedVariants,
//         });

//         if (formattedVariants.length > 0) {
//           setSelectedVariant(formattedVariants[0]);
//         }
//       } finally {
//         setIsLoadingProduct(false);
//       }
//     })();
//   }, [productNumericId]);

//   async function handleAddToCart() {
//     if (!selectedVariant) return;


//     setIsAddingToCart(true);

//     try {
//       const lineItemUuid = await shopify.cart.addLineItem(
//         selectedVariant.numericId,
//         1,
//       );

//       if (!lineItemUuid) {
//         shopify.toast.show("Item not added");
//         return;
//       }

//       if (Object.keys(customProperties).length > 0) {
//         await shopify.cart.addLineItemProperties(
//           lineItemUuid,
//           customProperties,
//         );
//       }



//       // shopify.action.close();
//     } catch (error) {
//       shopify.toast.show(`Error: ${error?.message ?? "Failed to add to cart"}`);
//     } finally {
//       setIsAddingToCart(false);
//     }
//   }

//   if (isLoadingProduct) {
//     return (
//       <s-page heading="Add to Cart">
//         <s-section>
//           <s-box padding="large">
//             <s-stack
//               direction="inline"
//               justifyContent="center"
//               alignItems="center"
//             >
//               <s-text>Loading data...</s-text>
//             </s-stack>
//           </s-box>
//         </s-section>
//       </s-page>
//     );
//   }

//   if (!productData || !selectedVariant) {
//     return (
//       <s-page heading="Add to Cart">
//         <s-section>
//           <s-text>Product not found or no variants available.</s-text>
//         </s-section>
//       </s-page>
//     );
//   }


//   return (
//     <s-page heading={productData.title}>
//       <s-scroll-box padding="large">
//         <s-section heading="Product">
//           <s-text>
//             Title: {productData.title} | Vendor: {productData.vendor}
//           </s-text>
//         </s-section>

//         {productData.variants.length > 1 && (
//           <s-section heading="Select Variant">
//             <s-choice-list
//               values={[selectedVariant.id]}
//               onChange={(event) => {
//                 const selectedId = event.currentTarget.values[0];

//                 const variant = productData.variants.find(
//                   (variantItem) => variantItem.id === selectedId,
//                 );

//                 if (variant) {
//                   setSelectedVariant(variant);
//                 }
//               }}
//             >
//               {productData.variants.map((variantItem) => (
//                 <s-choice key={variantItem.id} value={variantItem.id}>
//                   {`${variantItem.title} — $${variantItem.price}${
//                     variantItem.sku ? ` (${variantItem.sku})` : ""
//                   }`}
//                 </s-choice>
//               ))}
//             </s-choice-list>
//           </s-section>
//         )}

//         <s-section heading="Variant Details">
//           <s-text>Title: {selectedVariant.title}</s-text>
//           <s-text>Price: ${selectedVariant.price}</s-text>
//         </s-section>



//         <s-section heading="Custom Properties">
//           <s-box paddingBlock="small">
//             <s-stack gap="base">
//               <s-stack direction="inline" gap="base">
//                 {Object.entries(customProperties).map(([key, value]) => (
//                   <s-clickable
//                     onClick={() => {
//                       const updatedProperties = {
//                         ...customProperties,
//                       };
//                       delete updatedProperties[key];
//                       setCustomProperties(updatedProperties);
//                     }}
//                   >
//                     <s-stack
//                       key={key}
//                       direction="inline"
//                       gap="small-400"
//                       alignItems="center"
//                     >
//                       <s-badge>
//                         {" "}
//                         {key} : {value}{" "}
//                       </s-badge>
//                       <s-icon type="x" size="small" />
//                     </s-stack>
//                   </s-clickable>
//                 ))}
//               </s-stack>

//               <s-text-field
//                 label="Key"
//                 value={propertyKey}
//                 onChange={(event) => setPropertyKey(event.target.value)}
//               />

//               <s-text-field
//                 label="Value"
//                 value={propertyValue}
//                 onChange={(event) => setPropertyValue(event.target.value)}
//               />

//               <s-button
//                 onClick={() => {
//                   if (!propertyKey.trim() || !propertyValue.trim()) {
//                     shopify.toast.show("Key and value both required !!");
//                     return;
//                   }

//                   setCustomProperties((previousProperties) => ({
//                     ...previousProperties,
//                     [propertyKey.trim()]: propertyValue,
//                   }));

//                   setPropertyKey("");
//                   setPropertyValue("");
//                 }}
//               >
//                 + Add Property
//               </s-button>

//               <s-button
//                 variant="primary"
//                 onClick={handleAddToCart}
//                 loading={isAddingToCart}
//               >
//                 Add to Cart
//               </s-button>
//             </s-stack>
//           </s-box>
//         </s-section>
//       </s-scroll-box>
//     </s-page>
//   );
// }


import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import FieldRenderer from "./FieldRenderer.jsx"

function numericId(globalId) {
  return parseInt(globalId.split("/").pop() ?? "0", 10);
}

async function gql(query, variables) {
  const response = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

const PRODUCT_QUERY = `#graphql
  query GetProduct($id: ID!) {
    product(id: $id) {
      title
      vendor
      variants(first: 10) {
        edges {
          node {
            id
            title
            price
            sku
          }
        }
      }
    }
  }
`;

export default async () => {
  render(<ProductModal />, document.body);
};

function ProductModal() {
  const [productData, setProductData] = useState(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [fields, setFields] = useState([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);

  const [customProperties, setCustomProperties] = useState({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const productNumericId = shopify.product.id;

  // 🔹 Fetch Product
  useEffect(() => {
    (async () => {
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

        setProductData({
          title: productNode.title,
          vendor: productNode.vendor,
          variants: formattedVariants,
        });

        if (formattedVariants.length > 0) {
          setSelectedVariant(formattedVariants[0]);
        }
      } finally {
        setIsLoadingProduct(false);
      }
    })();
  }, [productNumericId]);

  // 🔹 Fetch Fields from DB
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `https://arnold-tons-brain-brisbane.trycloudflare.com/api/getFields?productId=${productNumericId}&shop=${shopify.session.currentSession.shopDomain}`
        );

        const data = await res.json();
        setFields(data?.data || []);
        shopify.toast.show("success");
        setIsLoadingFields(false);
      } catch(err) {
        shopify.toast.show("err.messagess");
      } finally {
        setIsLoadingFields(false);
      }
    })();
  }, [productNumericId]);

  // 🔹 Add to Cart
  // async function handleAddToCart() {
  //   if (!selectedVariant) return;

  //   // ✅ Validation
  //   const missing = fields.find(
  //     (f) => f.required && !customProperties[f.id]
  //   );

  //   if (missing) {
  //     shopify.toast.show(`${missing.label} is required`);
  //     return;
  //   }

  //   setIsAddingToCart(true);

  //   try {
  //     const lineItemUuid = await shopify.cart.addLineItem(
  //       selectedVariant.numericId,
  //       1
  //     );

  //     if (!lineItemUuid) {
  //       shopify.toast.show("Item not added");
  //       return;
  //     }

  //     // ✅ Convert ID → Label
  //     const formatted = {};

  //     fields.forEach((field) => {
  //       if (customProperties[field.id] !== undefined) {
  //         formatted[field.label] = String(customProperties[field.id]);
  //       }
  //     });

  //     if (Object.keys(formatted).length > 0) {
  //       await shopify.cart.addLineItemProperties(
  //         lineItemUuid,
  //         formatted
  //       );
  //     }

  //     shopify.toast.show("Added to cart");
  //   } catch (error) {
  //     shopify.toast.show("Error adding to cart");
  //   } finally {
  //     setIsAddingToCart(false);
  //   }
  // }

async function handleAddToCart() {
  if (!selectedVariant) return;

  // ✅ Validate required fields
  const missing = fields.find(
    (f) => f.required && !customProperties[f.id]
  );

  if (missing) {
    shopify.toast.show(`${missing.label} is required`);
    return;
  }

  setIsAddingToCart(true);

  try {
    // 🛒 STEP 1: Add main product
    const lineItemId = await shopify.cart.addLineItem(
      selectedVariant.numericId,
      1
    );

    if (!lineItemId) {
      shopify.toast.show("Failed to add product");
      return;
    }

    // 🧾 STEP 2: Attach ALL properties (for display)
    const properties = {};

    fields.forEach((field) => {
      const value = customProperties[field.id];
      if (!value) return;

      if (field.fieldType === "checkbox" && Array.isArray(value)) {
        properties[field.label] = value.join(", ");
      } else {
        properties[field.label] = String(value);
      }
    });

    if (Object.keys(properties).length > 0) {
      await shopify.cart.addLineItemProperties(lineItemId, properties);
    }

    // ➕ STEP 3: Add priced add-ons as custom sale
    let addedAddons = [];

    for (const field of fields) {
      const value = customProperties[field.id];
      if (!value) continue;

      // 🔹 SWITCH (boolean)
      if (field.fieldType === "switch") {
        if (value === true && field.addonPrice > 0) {
          await shopify.cart.addCustomSale({
            title: `[Addon] ${field.label}`,
            price: String(field.addonPrice),
            quantity: 1,
            taxable: true,
          });

          addedAddons.push(`${field.label} (+₹${field.addonPrice})`);
        }
      }

      // 🔹 RADIO (single option)
      else if (field.fieldType === "radio") {
        const opt = field.options.find(o => o.value === value);

        if (opt && opt.price > 0) {
          await shopify.cart.addCustomSale({
            title: `[Addon] ${field.label} - ${opt.label}`,
            price: String(opt.price),
            quantity: 1,
            taxable: true,
          });

          addedAddons.push(`${field.label}: ${opt.label} (+₹${opt.price})`);
        }
      }

      // 🔹 CHECKBOX (multiple options)
      else if (field.fieldType === "checkbox") {
        for (const val of value) {
          const opt = field.options.find(o => o.value === val);

          if (opt && opt.price > 0) {
            await shopify.cart.addCustomSale({
              title: `[Addon] ${field.label} - ${opt.label}`,
              price: String(opt.price),
              quantity: 1,
              taxable: true,
            });

            addedAddons.push(`${field.label}: ${opt.label} (+₹${opt.price})`);
          }
        }
      }

      // 🔹 OTHER TYPES (textarea, date, time etc.)
      else {
        if (field.addonPrice > 0) {
          await shopify.cart.addCustomSale({
            title: `[Addon] ${field.label}`,
            price: String(field.addonPrice),
            quantity: 1,
            taxable: true,
          });

          addedAddons.push(`${field.label} (+₹${field.addonPrice})`);
        }
      }
    }

    // 🔔 Final toast
    if (addedAddons.length > 0) {
      shopify.toast.show(
        `Added with: ${addedAddons.join(", ")}`
      );
    } else {
      shopify.toast.show("Added to cart");
    }

  } catch (error) {
    console.error(error);
    shopify.toast.show("Error adding to cart");
  } finally {
    setIsAddingToCart(false);
  }
}

  // 🔹 Loading
  if (isLoadingProduct) {
    return (
      <s-page heading="Loading">
        <s-text>Loading product...</s-text>
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

  // 🔹 UI
  return (
    <s-page heading={productData.title}>
      <s-scroll-box padding="large">
        {/* Product */}
        <s-section heading="Product">
          <s-text>
            {productData.title} | {productData.vendor}
          </s-text>
        </s-section>

        {/* Variants */}
        {productData.variants.length > 1 && (
          <s-section heading="Select Variant">
            <s-choice-list
              values={[selectedVariant.id]}
              onChange={(e) => {
                const id = e.currentTarget.values[0];
                const v = productData.variants.find((v) => v.id === id);
                if (v) setSelectedVariant(v);
              }}
            >
              {productData.variants.map((v) => (
                <s-choice key={v.id} value={v.id}>
                  {v.title} — ${v.price}
                </s-choice>
              ))}
            </s-choice-list>
          </s-section>
        )}

        {/* Dynamic Fields */}
        <s-section heading="Custom Options">
          <s-stack gap="base">
            {isLoadingFields ? (
              <s-text>Loading options...</s-text>
            ) : fields.length === 0 ? (
              <s-text>No custom options</s-text>
            ) : (
              fields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={customProperties[field.id]}
                  onChange={(id, val) =>
                    setCustomProperties((prev) => ({
                      ...prev,
                      [id]: val,
                    }))
                  }
                />
              ))
            )}
          </s-stack>
        </s-section>

        {/* Add to cart */}
        <s-button
          variant="primary"
          onClick={handleAddToCart}
          loading={isAddingToCart}
        >
          Add to Cart
        </s-button>
      </s-scroll-box>
    </s-page>
  );
}
