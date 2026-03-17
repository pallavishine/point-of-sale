/**
 * ProductMenuItem.jsx
 * Target: pos.product-details.action.menu-item.render
 *
 * Adds a button to the product detail action menu.
 * Tapping opens ProductModal for the full add-to-cart workflow.
 *
 * Reference:
 *   https://shopify.dev/docs/api/pos-ui-extensions/latest/targets/product-details
 */

import { render } from 'preact';

export default async () => {
  render(<ProductMenuItem />, document.body);
};

function ProductMenuItem() {
  return (
    <s-button onPress={() => shopify.action.presentModal()}>
      Add to Cart with Options
    </s-button>
  );
}
