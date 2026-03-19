import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

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
      requiresSellingPlan
      variants(first: 10) {
        edges {
          node {
            id
            title
            price
            sku
            sellingPlanGroups(first: 5) {
              edges {
                node {
                  name
                  sellingPlans(first: 10) {
                    edges {
                      node {
                        id
                        name
                        deliveryPolicy {
                          ... on SellingPlanRecurringDeliveryPolicy {
                            interval
                            intervalCount
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
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
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [customProperties, setCustomProperties] = useState({});
  const [propertyKey, setPropertyKey] = useState("");
  const [propertyValue, setPropertyValue] = useState("");
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [requiresSellingPlan, setrequiresSellingPlan] = useState(false);

  const productNumericId = shopify.product.id;

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
        setrequiresSellingPlan(productNode?.requiresSellingPlan);
        const variantEdges = productNode.variants?.edges ?? [];

        const formattedVariants = variantEdges.map(({ node: variantNode }) => {
          const sellingPlans = [];

          const groupEdges = variantNode.sellingPlanGroups?.edges ?? [];

          for (let i = 0; i < groupEdges.length; i++) {
            const groupNode = groupEdges[i].node;
            const planEdges = groupNode.sellingPlans?.edges ?? [];

            for (let j = 0; j < planEdges.length; j++) {
              const planNode = planEdges[j].node;

              sellingPlans.push({
                id: planNode.id,
                numericId: numericId(planNode.id),
                name: planNode.name,
                deliveryInterval: planNode.deliveryPolicy?.interval ?? "MONTH",
                deliveryIntervalCount:
                  planNode.deliveryPolicy?.intervalCount ?? 1,
              });
            }
          }

          return {
            id: variantNode.id,
            numericId: numericId(variantNode.id),
            title: variantNode.title,
            price: variantNode.price,
            sku: variantNode.sku ?? "",
            sellingPlans: sellingPlans,
          };
        });

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

  async function handleAddToCart() {
    if (!selectedVariant) return;

    if (requiresSellingPlan && !selectedPlan) {
      shopify.toast.show(
        "This product requires a selling plan. Please select one.",
      );
      return;
    }

    setIsAddingToCart(true);

    try {
      const lineItemUuid = await shopify.cart.addLineItem(
        selectedVariant.numericId,
        1,
      );

      if (!lineItemUuid) {
        shopify.toast.show("Item not added");
        return;
      }

      if (Object.keys(customProperties).length > 0) {
        await shopify.cart.addLineItemProperties(
          lineItemUuid,
          customProperties,
        );
      }

      if (selectedPlan) {
        await shopify.cart.addLineItemSellingPlan({
          lineItemUuid: lineItemUuid,
          sellingPlanId: selectedPlan.numericId,
          sellingPlanName: selectedPlan.name,
          deliveryIntervalCount: selectedPlan.deliveryIntervalCount,
        });

        shopify.toast.show(
          `Added${selectedPlan ? ` · ${selectedPlan.name}` : ""}`,
        );
      }

      // shopify.action.close();
    } catch (error) {
      shopify.toast.show(`Error: ${error?.message ?? "Failed to add to cart"}`);
    } finally {
      setIsAddingToCart(false);
    }
  }

  if (isLoadingProduct) {
    return (
      <s-page heading="Add to Cart">
        <s-section>
          <s-box padding="large">
            <s-stack
              direction="inline"
              justifyContent="center"
              alignItems="center"
            >
              <s-text>Loading data...</s-text>
            </s-stack>
          </s-box>
        </s-section>
      </s-page>
    );
  }

  if (!productData || !selectedVariant) {
    return (
      <s-page heading="Add to Cart">
        <s-section>
          <s-text>Product not found or no variants available.</s-text>
        </s-section>
      </s-page>
    );
  }

  const hasSellingPlans = selectedVariant.sellingPlans.length > 0;

  return (
    <s-page heading={productData.title}>
      <s-scroll-box padding="large">
        <s-section heading="Product">
          <s-text>
            Title: {productData.title} | Vendor: {productData.vendor}
          </s-text>
        </s-section>

        {productData.variants.length > 1 && (
          <s-section heading="Select Variant">
            <s-choice-list
              values={[selectedVariant.id]}
              onChange={(event) => {
                const selectedId = event.currentTarget.values[0];

                const variant = productData.variants.find(
                  (variantItem) => variantItem.id === selectedId,
                );

                if (variant) {
                  setSelectedVariant(variant);
                  setSelectedPlan(null);
                }
              }}
            >
              {productData.variants.map((variantItem) => (
                <s-choice key={variantItem.id} value={variantItem.id}>
                  {`${variantItem.title} — $${variantItem.price}${
                    variantItem.sku ? ` (${variantItem.sku})` : ""
                  }`}
                </s-choice>
              ))}
            </s-choice-list>
          </s-section>
        )}

        <s-section heading="Variant Details">
          <s-text>Title: {selectedVariant.title}</s-text>
          <s-text>Price: ${selectedVariant.price}</s-text>
        </s-section>

        {hasSellingPlans && (
          <s-section heading="Selling Plans">
            <s-choice-list
              values={[selectedPlan?.id || "one-time"]}
              onChange={(event) => {
                const selectedValue = event.currentTarget.values[0];

                if (selectedValue === "one-time") {
                  setSelectedPlan(null);
                  return;
                }

                const plan = selectedVariant.sellingPlans.find(
                  (planItem) => planItem.id === selectedValue,
                );

                if (plan) {
                  setSelectedPlan(plan);
                }
              }}
            >
              <s-choice value="one-time">One-time purchase</s-choice>

              {selectedVariant.sellingPlans.map((planItem) => (
                <s-choice key={planItem.id} value={planItem.id}>
                  {planItem.name}
                  <s-text>
                    {`Every ${planItem.deliveryIntervalCount} ${planItem.deliveryInterval.toLowerCase()}(s)`}
                  </s-text>
                </s-choice>
              ))}
            </s-choice-list>
          </s-section>
        )}

        <s-section heading="Custom Properties">
          <s-box paddingBlock="small">
            <s-stack gap="base">
              <s-stack direction="inline" gap="base">
                {Object.entries(customProperties).map(([key, value]) => (
                  <s-clickable
                    onClick={() => {
                      const updatedProperties = {
                        ...customProperties,
                      };
                      delete updatedProperties[key];
                      setCustomProperties(updatedProperties);
                    }}
                  >
                    <s-stack
                      key={key}
                      direction="inline"
                      gap="small-400"
                      alignItems="center"
                    >
                      <s-badge>
                        {" "}
                        {key} : {value}{" "}
                      </s-badge>
                      <s-icon type="x" size="small" />
                    </s-stack>
                  </s-clickable>
                ))}
              </s-stack>

              <s-text-field
                label="Key"
                value={propertyKey}
                onChange={(event) => setPropertyKey(event.target.value)}
              />

              <s-text-field
                label="Value"
                value={propertyValue}
                onChange={(event) => setPropertyValue(event.target.value)}
              />

              <s-button
                onClick={() => {
                  if (!propertyKey.trim() || !propertyValue.trim()) {
                    shopify.toast.show("Key and value both required !!");
                    return;
                  }

                  setCustomProperties((previousProperties) => ({
                    ...previousProperties,
                    [propertyKey.trim()]: propertyValue,
                  }));

                  setPropertyKey("");
                  setPropertyValue("");
                }}
              >
                + Add Property
              </s-button>

              <s-button
                variant="primary"
                onClick={handleAddToCart}
                loading={isAddingToCart}
              >
                Add to Cart
                {selectedPlan ? ` · ${selectedPlan.name}` : ""}
              </s-button>
            </s-stack>
          </s-box>
        </s-section>
      </s-scroll-box>
    </s-page>
  );
}
