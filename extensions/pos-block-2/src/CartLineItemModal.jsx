import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { gql, numericId } from "./helpers";

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
  const existingProperties = lineItem?.properties ?? {};
  const existingDiscounts = lineItem?.discounts ?? [];

  const [discountType, setDiscountType] = useState("Percentage");
  const [discountTitle, setDiscountTitle] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const [propKey, setPropKey] = useState("");
  const [propVal, setPropVal] = useState("");
  const [addingProp, setAddingProp] = useState(false);
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
              <s-choice value="code">
                <s-text>Coupon Code</s-text>
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

     

        <s-stack paddingBlock="small">
          <s-button onClick={removeItem}>Remove from Cart</s-button>
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
}
