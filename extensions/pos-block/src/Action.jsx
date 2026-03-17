import { render } from "preact";
import { useState } from "preact/hooks";
export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const { id, variantId } = shopify.product;
  const [data, setData] = useState({
    fname: "",
    email: "",
  });
  console.log(id, variantId, data, "dataaaa");
  async function addProductWithProperties(vId, quantity, properties) {
    console.log(vId, quantity, properties, "vId, quantity, properties");
    if(!properties?.fname || !properties?.email){
      shopify.toast.show("Name and email required!");
      return;
    }
    const lineItemUuid = await shopify.cart.addLineItem(vId, quantity);
    console.log(lineItemUuid, "lineItemUuid");
    setData({
      fname: "",
      email: "",
    });

    if (lineItemUuid) {
      await shopify.cart.addLineItemProperties(lineItemUuid, properties);
      
      console.log("addeddddd");
    }
  }
  return (
    <s-page heading="POS action">
      <s-scroll-box>
        <s-box padding="small">
          <s-text>Product ID: {id}</s-text>
          <s-text>variantId ID: {variantId}</s-text>
        </s-box>
        <s-box padding="small">
          <s-text-field
            required
            label="Name"
            value={data?.fname}
            onInput={(e) =>
              setData((prev) => ({ ...prev, fname: e.target.value }))}
            onChange={(e) =>
              setData((prev) => ({ ...prev, fname: e.target.value }))
            }
          />

          <s-text-field
          required
            label="Email"
            value={data?.email}
            onInput={(e) =>
              setData((prev) => ({ ...prev, email: e.target.value }))}
            onChange={(e) =>
              setData((prev) => ({ ...prev, email: e.target.value }))
            }
          />
          <s-button
            onClick={() => addProductWithProperties(variantId, 1, data)}
            disabled={!data?.fname || !data?.email}
          >
            Add
          </s-button>
        </s-box>
      </s-scroll-box>
    </s-page>
  );
}
