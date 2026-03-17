import { render } from "preact";

export default async () => {
  render(<Extension />, document.body);
};

const Extension = () => {

  console.log("shopify",shopify);

  return (
    <s-tile
    heading="Scan Barcode"
    subheading="barcode Scanner extension"

      onClick={() => shopify.action.presentModal()}
      
    />
  );
};
