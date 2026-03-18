

import { render } from 'preact';

export default async () => {
  render(<ProductMenuItem />, document.body);
};

function ProductMenuItem() {
  return (
    <s-button onClick={() => shopify.action.presentModal()}>
      Add to Cart with Options
    </s-button>
  );
}
