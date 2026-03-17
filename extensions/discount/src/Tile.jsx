import {render} from 'preact';

export default async () => {
  render(<Extension />, document.body);
}

function Extension() {  
  return (
    <s-tile
      heading="Apply Discount"
      subheading='Apply Discount to your products'
      onClick={() => shopify.action.presentModal()}
    />
  );
}