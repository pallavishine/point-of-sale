

import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

function numericId(gid) {
  return parseInt(gid.split("/").pop() ?? "0", 10);
}

async function gql(query, variables) {
  const res = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

const PRODUCT_QUERY = `#graphql
  query GetProduct($id: ID!) {
    product(id: $id) {
      title vendor
      variants(first: 10) {
        edges {
          node {
            id title price sku requiresSellingPlan
            sellingPlanGroups(first: 5) {
              edges {
                node {
                  name
                  sellingPlans(first: 10) {
                    edges {
                      node {
                        id name
                        deliveryPolicy {
                          ... on SellingPlanRecurringDeliveryPolicy {
                            interval intervalCount
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
  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [properties, setProperties] = useState({});
  const [propKey, setPropKey] = useState("");
  const [propVal, setPropVal] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);

  const productNumericId = shopify.product.id;

  useEffect(() => {
    (async () => {
      try {
        const data = await gql(PRODUCT_QUERY, {
          id: `gid://shopify/Product/${productNumericId}`,
        });
        const p = data?.data?.product;
        if (!p) {
          shopify.toast.show("Failed to load product");
          return;
        }

        const variants = (p.variants?.edges ?? []).map(({ node: v }) => ({
          id: v.id,
          numericId: numericId(v.id),
          title: v.title,
          price: v.price,
          sku: v.sku ?? "",
          requiresSellingPlan: !!v.requiresSellingPlan,
          sellingPlans: (v.sellingPlanGroups?.edges ?? []).flatMap(
            ({ node: spg }) =>
              (spg.sellingPlans?.edges ?? []).map(({ node: sp }) => ({
                id: sp.id,
                numericId: numericId(sp.id),
                name: sp.name,
                deliveryInterval: sp.deliveryPolicy?.interval ?? "MONTH",
                deliveryIntervalCount: sp.deliveryPolicy?.intervalCount ?? 1,
              })),
          ),
        }));

        setProduct({ title: p.title, vendor: p.vendor, variants });
        setSelectedVariant(variants[0] ?? null);
      } finally {
        setLoadingProduct(false);
      }
    })();
  }, [productNumericId]);

  async function addToCart() {
    if (!selectedVariant) return;
    if (selectedVariant.requiresSellingPlan && !selectedPlan) {
      shopify.toast.show(
        "This product requires a selling plan. Please select one.",
      );
      return;
    }
    setAddingToCart(true);
    try {
      const uuid = await shopify.cart.addLineItem(selectedVariant.numericId, 1);
      if (!uuid) {
        shopify.toast.show("Item not added (oversell guard dismissed)");
        return;
      }

      if (Object.keys(properties).length > 0) {
        await shopify.cart.addLineItemProperties(uuid, properties);
      }
      if (selectedPlan) {
        await shopify.cart.addLineItemSellingPlan({
          lineItemUuid: uuid,
          sellingPlanId: selectedPlan.numericId,
          sellingPlanName: selectedPlan.name,
          deliveryInterval: selectedPlan.deliveryInterval,
          deliveryIntervalCount: selectedPlan.deliveryIntervalCount,
        });
      }
      shopify.toast.show(
        `Added${selectedPlan ? ` · ${selectedPlan.name}` : ""}`,
      );
      shopify.action.close();
    } catch (err) {
      shopify.toast.show(`Error: ${err?.message ?? "Failed to add to cart"}`);
    } finally {
      setAddingToCart(false);
    }
  }

  if (loadingProduct) {
    return (
      <s-page heading="Add to Cart">
        <s-section>
          <s-text>Loading product details…</s-text>
        </s-section>
      </s-page>
    );
  }

  if (!product || !selectedVariant) {
    return (
      <s-page heading="Add to Cart">
        <s-section>
          <s-text>Product not found or has no variants.</s-text>
        </s-section>
      </s-page>
    );
  }

  const hasPlans = selectedVariant.sellingPlans.length > 0;

  return (
    <s-page heading={product.title}>
      <s-scroll-view>
        <s-section heading="Product">
          <s-text  >title={product.title} subtitle={product.vendor}</s-text>
        </s-section>

        {product.variants.length > 1 && (
          <s-section heading="Select Variant">
            <s-choice-list
              values={[selectedVariant.id]}
              onChange={(e) => {
                const v = product.variants.find((v) => v.id === e.currentTarget.values[0]);
                if (v) {
                  setSelectedVariant(v);
                  setSelectedPlan(null);
                }
              }}
            >
              {product.variants.map((v) => (
                <s-choice
                  key={v.id}
                  value={v.id}
             
                >{`${v.title} — $${v.price}${v.sku ? ` (${v.sku})` : ""}`}</s-choice>
              ))}
            </s-choice-list>
          </s-section>
        )}

        <s-section heading="Variant">
          
          <s-text  >title={selectedVariant.title}
            subtitle={`$${selectedVariant.price}${selectedVariant.requiresSellingPlan ? " · Requires subscription" : ""}`}</s-text>

        </s-section>

        {hasPlans && (
          <s-section heading="Selling Plans (Subscriptions)">
            {!selectedVariant.requiresSellingPlan && (
              <s-list-item
                title="One-time purchase"
                subtitle="No recurring subscription"
                onClick={() => setSelectedPlan(null)}
                badge={!selectedPlan ? "✓ Selected" : undefined}
              />
            )}
            {selectedVariant.sellingPlans.map((sp) => (
              <s-list-item
                key={sp.id}
                title={sp.name}
                subtitle={`Every ${sp.deliveryIntervalCount} ${sp.deliveryInterval.toLowerCase()}(s)`}
                onClick={() => setSelectedPlan(sp)}
                badge={selectedPlan?.id === sp.id ? "✓ Selected" : undefined}
              />
            ))}
          </s-section>
        )}

        <s-section heading="Custom Properties">
          <s-text-field
            label="Key"
            value={propKey}
            onChange={(e) => setPropKey(e.detail.value)}
            placeholder="Gift message"
          />
          <s-text-field
            label="Value"
            value={propVal}
            onChange={(e) => setPropVal(e.detail.value)}
            placeholder="Happy Birthday!"
          />
          <s-button
            onClick={() => {
              if (!propKey.trim()) return;
              setProperties((prev) => ({ ...prev, [propKey.trim()]: propVal }));
              setPropKey("");
              setPropVal("");
            }}
          >
            + Add Property
          </s-button>
          {Object.entries(properties).map(([k, v]) => (
            <s-list-item
              key={k}
              title={k}
              subtitle={v}
              onClick={() => {
                const next = { ...properties };
                delete next[k];
                setProperties(next);
              }}
              badge="✕ Remove"
            />
          ))}
        </s-section>

        <s-section>
          <s-button
            kind="primary"
            onClick={addToCart}
            loading={addingToCart}
            disabled={selectedVariant.requiresSellingPlan && !selectedPlan}
          >
            Add to Cart{selectedPlan ? ` · ${selectedPlan.name}` : ""}
          </s-button>
        </s-section>
      </s-scroll-view>
    </s-page>
  );
}
