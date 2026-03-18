

import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default async () => {
  render(<TileExtension />, document.body);
};

function TileExtension() {
  const [cartCount, setCartCount] = useState(
    shopify.cart.current.value.lineItems.length,
  );

  useEffect(() => {
    const unsubscribe = shopify.cart.current.subscribe((cart) => {
      setCartCount(cart.lineItems.length);
    });
    return unsubscribe;
  }, []);

  return (
    <s-tile
      heading="POS Manager"
      subheading={ cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''} in cart`: 'Customer·Products·Discounts'
      }
      onClick={() => shopify.action.presentModal()}
      
    />
  );
}
