/**
 * CartLineItemMenuItem.jsx
 * Target: pos.cart.line-item-details.action.menu-item.render
 *
 * Adds a button to the cart line item action menu.
 * Tapping opens CartLineItemModal for per-item controls.
 *
 * Reference:
 *   https://shopify.dev/docs/api/pos-ui-extensions/latest/targets/cart-details
 */

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
