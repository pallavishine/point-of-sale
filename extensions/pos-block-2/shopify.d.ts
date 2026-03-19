import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/ProductMenuItem.jsx' {
  const shopify: import('@shopify/ui-extensions/pos.product-details.action.menu-item.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/ProductModal.jsx' {
  const shopify: import('@shopify/ui-extensions/pos.product-details.action.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/CartLineItemMenuItem.jsx' {
  const shopify: import('@shopify/ui-extensions/pos.cart.line-item-details.action.menu-item.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/CartLineItemModal.jsx' {
  const shopify: import('@shopify/ui-extensions/pos.cart.line-item-details.action.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/helpers.js' {
  const shopify: import('@shopify/ui-extensions/pos.cart.line-item-details.action.render').Api;
  const globalThis: { shopify: typeof shopify };
}
