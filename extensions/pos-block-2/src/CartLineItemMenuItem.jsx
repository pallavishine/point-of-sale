

import { render } from 'preact';

export default async () => {
  render(<CartLineItemMenuItem />, document.body);
};

function CartLineItemMenuItem() {
  return (
    <s-button onClick={() => shopify.action.presentModal()}>
      Edit Item Options
    </s-button>
  );
}
