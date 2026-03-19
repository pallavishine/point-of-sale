import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { gql, numericId } from "./helpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VARIANT_SELLING_PLANS_QUERY = `#graphql
  query GetVariantPlans($id: ID!) {
    productVariant(id: $id) {
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
`;

// ─── Root ─────────────────────────────────────────────────────────────────────

export default async () => {
  render(<CartLineItemModal />, document.body);
};

function CartLineItemModal() {
  const lineItem = shopify.cartLineItem;
  console.log("lineItemlineItem", lineItem);

  const uuid = lineItem?.uuid;
  const title = lineItem?.title ?? `Item #${lineItem?.variantId}`;
  const price = lineItem?.price;
  const quantity = lineItem?.quantity;
  const sku = lineItem?.sku;
  const sellingPlan = lineItem?.sellingPlan;
  const requiresSellingPlan = lineItem?.requiresSellingPlan;
  const hasSellingPlanGroups = lineItem?.hasSellingPlanGroups ?? false;
  const existingProperties = lineItem?.properties ?? {};
  const existingDiscounts = lineItem?.discounts ?? [];

  // ── Discount state ──────────────────────────────────────────────────────────
  const [discountType, setDiscountType] = useState("Percentage");
  const [discountTitle, setDiscountTitle] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  // ── Properties state ────────────────────────────────────────────────────────
  const [propKey, setPropKey] = useState("");
  const [propVal, setPropVal] = useState("");
  const [addingProp, setAddingProp] = useState(false);

  // ── Selling plan state ──────────────────────────────────────────────────────
  const [availablePlans, setAvailablePlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(
    sellingPlan ? String(sellingPlan.id) : "__one_time__",
  );
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    if (!hasSellingPlanGroups || !lineItem?.variantId) return;
    (async () => {
      setLoadingPlans(true);
      try {
        const data = await gql(VARIANT_SELLING_PLANS_QUERY, {
          id: `gid://shopify/ProductVariant/${lineItem?.variantId}`,
        });
        const plans = (
          data?.data?.productVariant?.sellingPlanGroups?.edges ?? []
        ).flatMap(({ node: spg }) =>
          (spg.sellingPlans?.edges ?? []).map(({ node: sp }) => ({
            id: sp.id,
            numericId: numericId(sp.id),
            name: sp.name,
            deliveryInterval: sp.deliveryPolicy?.interval ?? "MONTH",
            deliveryIntervalCount: sp.deliveryPolicy?.intervalCount ?? 1,
          })),
        );
        setAvailablePlans(plans);
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, [hasSellingPlanGroups, lineItem?.variantId]);

  // ── Discount handlers ───────────────────────────────────────────────────────

  async function applyDiscount() {
    if (!discountTitle.trim() || !discountAmount) {
      shopify.toast.show("Title and amount required");
      return;
    }
    setApplyingDiscount(true);
    try {
      console.log(
        " uuid,asgvaga",
        uuid,
        discountType,
        discountTitle.trim(),
        discountAmount,
      );
      await shopify.cart.setLineItemDiscount(
        uuid,
        discountType,
        discountTitle.trim(),
        discountAmount,
      );
      shopify.toast.show("Discount applied");
      setDiscountTitle("");
      setDiscountAmount("");
    } catch (err) {
      shopify.toast.show(`Failed: ${err?.message ?? "Unknown error"}`);
    } finally {
      setApplyingDiscount(false);
    }
  }

  async function removeDiscount() {
    try {
      await shopify.cart.removeLineItemDiscount(uuid);
      shopify.toast.show("Discount removed");
    } catch {
      shopify.toast.show("Failed to remove discount");
    }
  }

  // ── Property handlers ───────────────────────────────────────────────────────

  async function addProperty() {
    if (!propKey.trim()) return;
    setAddingProp(true);
    try {
      await shopify.cart.addLineItemProperties(uuid, {
        [propKey.trim()]: propVal,
      });
      shopify.toast.show("Property added");
      setPropKey("");
      setPropVal("");
    } catch {
      shopify.toast.show("Failed to add property");
    } finally {
      setAddingProp(false);
    }
  }

  async function removeProperty(key) {
    try {
      await shopify.cart.removeLineItemProperties(uuid, [key]);
      shopify.toast.show("Property removed");
    } catch {
      shopify.toast.show("Failed to remove property");
    }
  }

  // ── Selling plan handler ────────────────────────────────────────────────────

  async function onPlanChange(e) {
    const chosenId = e.currentTarget.values?.[0] ?? "__one_time__";
    setSelectedPlanId(chosenId);

    if (chosenId === "__one_time__") {
      // Switch to one-time purchase
      try {
        await shopify.cart.removeLineItemSellingPlan(uuid);
        shopify.toast.show("Subscription removed");
      } catch (err) {
        shopify.toast.show(`Failed: ${err?.message}`);
      }
    } else {
      const sp = availablePlans.find((p) => p.id === chosenId);
      if (!sp) return;
      try {
        await shopify.cart.addLineItemSellingPlan({
          lineItemUuid: uuid,
          sellingPlanId: sp.numericId,
          sellingPlanName: sp.name,
          deliveryInterval: sp.deliveryInterval,
          deliveryIntervalCount: sp.deliveryIntervalCount,
        });
        shopify.toast.show(`Selling plan set: ${sp.name}`);
      } catch (err) {
        shopify.toast.show(`Failed: ${err?.message}`);
      }
    }
  }

  async function removeItem() {
    try {
      await shopify.cart.removeLineItem(uuid);
      shopify.toast.show("Item removed from cart");
      // shopify.action.close();
    } catch {
      shopify.toast.show("Failed to remove item");
    }
  }

  return (
    <s-page heading="Edit Line Item">
      <s-scroll-box padding="large" paddingBlock="small">
        <s-section heading="Item Details">
          <s-stack gap="small-200">
            <s-text type="strong">{title}</s-text>
            <s-text>
              Qty: {quantity}
              {price ? `  ·  $${price}` : ""}
              {sku ? `  ·  SKU: ${sku}` : ""}
            </s-text>
            {sellingPlan && (
              <s-text color="subdued">
                📅 {sellingPlan.name} — Every{" "}
                {sellingPlan.deliveryIntervalCount}{" "}
                {(sellingPlan.deliveryInterval ?? "").toLowerCase()}(s)
              </s-text>
            )}
          </s-stack>
        </s-section>

        {existingDiscounts.length > 0 && (
          <s-section heading="Current Discounts">
            <s-stack gap="small-200">
              {existingDiscounts.map((d, i) => (
                <s-box key={i} padding="small">
                  <s-stack
                    direction="inline"
                    gap="small-200"
                    alignItems="center"
                  >
                    <s-text type="strong">
                      {d.discountDescription ?? "Discount"}
                    </s-text>
                    <s-text color="subdued">
                      {d.type === "Percentage"
                        ? `${d.amount}% off`
                        : `$${d.amount} off`}
                    </s-text>
                  </s-stack>
                </s-box>
              ))}
              <s-button onClick={removeDiscount}>Remove Discount</s-button>
            </s-stack>
          </s-section>
        )}

        <s-section heading="Apply Line Item Discount">
          <s-stack gap="small">
            {/* Discount type — radio choice list (single-select) */}
            <s-choice-list
              values={[discountType]}
              onChange={(e) => setDiscountType(e.currentTarget.values?.[0])}
            >
              <s-choice value="Percentage">
                <s-text>Percentage %</s-text>
              </s-choice>
              <s-choice value="FixedAmount">
                <s-text>Fixed Amount $</s-text>
              </s-choice>
            </s-choice-list>

            <s-text-field
              label="Discount Title"
              value={discountTitle}
              onChange={(e) => setDiscountTitle(e.target?.value)}
              placeholder="Loyalty discount"
            />
            <s-number-field
              label={
                discountType === "Percentage"
                  ? "Percentage (e.g. 10)"
                  : "Fixed Amount (e.g. 5.00)"
              }
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target?.value)}
            />

            <s-button onClick={applyDiscount} loading={applyingDiscount}>
              Apply Discount
            </s-button>
          </s-stack>{" "}
        </s-section>

        <s-section heading="Custom Properties">
          <s-stack gap="small">
            {/* Existing properties as rows with inline Remove button */}
            {Object.keys(existingProperties).length > 0 && (
              <s-stack gap="base">
                {Object.entries(existingProperties).map(([k, v]) => (
                  <s-box key={k} padding="small-100">
                    <s-stack gap="small">
                      <s-stack
                        direction="inline"
                        gap="large"
                        alignItems="center"
                      >
                        <s-stack gap="small">
                          <s-text type="strong">{k}</s-text>
                          <s-text color="subdued">{String(v)}</s-text>
                        </s-stack>
                        <s-button onClick={() => removeProperty(k)}>
                          Remove
                        </s-button>
                      </s-stack>
                    </s-stack>
                  </s-box>
                ))}
              </s-stack>
            )}

            {/* Add new property */}
            <s-text-field
              label="Key"
              value={propKey}
              onChange={(e) => setPropKey(e.target?.value)}
              placeholder="Gift message"
            />
            <s-text-field
              label="Value"
              value={propVal}
              onChange={(e) => setPropVal(e.target?.value)}
              placeholder="Happy Birthday!"
            />

            <s-button onClick={addProperty} loading={addingProp}>
              Add Property
            </s-button>
          </s-stack>
        </s-section>

        {(hasSellingPlanGroups || sellingPlan) && (
          <s-section heading="Selling Plans">
            {loadingPlans ? (
              
                <s-box padding="small">
                  <s-stack
                    direction="inline"
                    justifyContent="center"
                    alignItems="center"
                  >
                    <s-text>Loading subscription options…</s-text>
                  </s-stack>
                </s-box>
              
            ) : (
              <s-choice-list values={[selectedPlanId]} onChange={onPlanChange}>
                {/* One-time option — only shown when not required */}
                <s-choice value="__one_time__">
                  <s-stack gap="small">
                    <s-text type="strong">One-time purchase</s-text>
                    <s-text color="subdued">No recurring subscription</s-text>
                  </s-stack>
                </s-choice>

                {/* Available selling plans */}
                {availablePlans.map((sp) => (
                  <s-choice key={sp.id} value={sp.id}>
                    <s-stack gap="small">
                      <s-text type="strong">{sp.name}</s-text>
                      <s-text color="subdued">
                        Every {sp.deliveryIntervalCount}{" "}
                        {sp.deliveryInterval.toLowerCase()}(s)
                      </s-text>
                    </s-stack>
                  </s-choice>
                ))}
              </s-choice-list>
            )}
          </s-section>
        )}

        <s-stack paddingBlock="small">
          <s-button onClick={removeItem}>Remove from Cart</s-button>
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
}
