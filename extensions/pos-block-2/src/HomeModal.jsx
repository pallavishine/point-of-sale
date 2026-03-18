import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

async function gql(query, variables = {}) {
  const res = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

function numericId(gid) {
  return parseInt(gid.split("/").pop() ?? "0", 10);
}

const CUSTOMER_SEARCH_QUERY = `#graphql
  query SearchCustomers($query: String!) {
    customers(first: 5, query: $query) {
      edges { node { id firstName lastName email phone } }
    }
  }
`;

const CREATE_CUSTOMER_MUTATION = `#graphql
  mutation CreateCustomer($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id firstName lastName email phone }
      userErrors { field message }
    }
  }
`;

const PRODUCT_SEARCH_QUERY = `#graphql
  query SearchProducts($query: String!) {
    products(first: 10, query: $query) {
      edges {
        node {
          id title vendor
          variants(first: 5) {
            edges {
              node {
                id title price sku
                sellingPlanGroups(first: 5) {
                  edges {
                    node {
                      name
                      sellingPlans(first: 10) {
                        edges {
                          node {
                            id name
                            deliveryPolicy {
                              ... on SellingPlanRecurringDeliveryPolicy {
                                interval intervalCount
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// ─── Root ─────────────────────────────────────────────────────────────────────

export default async () => {
  render(<HomeModal />, document.body);
};

function HomeModal() {
  const [activeTab, setActiveTab] = useState("");

  return (
    <s-page heading="POS Manager">
      <s-scroll-box padding="base">
        <s-stack gap="small">
          <s-stack alignContent="center">
            <s-box paddingBlock="large" paddingInline="small">
              <s-section heading="Full POS workflow: customer login/signup, product search, cart management, discounts, and selling plans">
                {!activeTab && (
                  <s-box padding="large">
                    <s-stack
                      direction="inline"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <s-stack gap="large">
                        {/* Row 1 */}
                        <s-stack direction="inline" gap="large">
                          <s-tile
                            heading="Customer"
                            onClick={() => setActiveTab("customer")}
                          />

                          <s-tile
                            heading="Products"
                            onClick={() => setActiveTab("products")}
                          />
                        </s-stack>

                        {/* Row 2 */}
                        <s-stack direction="inline" gap="large">
                          <s-tile
                            heading="Discounts"
                            onClick={() => setActiveTab("discounts")}
                          />

                          <s-tile
                            heading="Cart Page"
                            onClick={() => setActiveTab("cart")}
                          />
                        </s-stack>
                      </s-stack>
                    </s-stack>
                  </s-box>
                )}
              </s-section>

              {activeTab === "customer" && (
                <CustomerSection setActiveTab={setActiveTab} />
              )}
              {activeTab === "products" && (
                <ProductsSection setActiveTab={setActiveTab} />
              )}
              {activeTab === "discounts" && (
                <DiscountsSection setActiveTab={setActiveTab} />
              )}
              {activeTab === "cart" && (
                <CartSection setActiveTab={setActiveTab} />
              )}
            </s-box>
          </s-stack>
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
}

// ═════════════════════════════ CUSTOMER ══════════════════════════════════════

function CustomerSection({ setActiveTab }) {
  const [mode, setMode] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(
    shopify.cart.current.value.customer ?? null,
  );

  useEffect(() => {
    const unsub = shopify.cart.current.subscribe((cart) => {
      setCurrentCustomer(cart.customer ?? null);
    });
    return unsub;
  }, []);

  async function searchCustomers() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await gql(CUSTOMER_SEARCH_QUERY, { query });
      setResults(
        (data?.data?.customers?.edges ?? []).map(({ node }) => ({
          id: node.id,
          numericId: numericId(node.id),
          firstName: node.firstName ?? "",
          lastName: node.lastName ?? "",
          email: node.email ?? "",
        })),
      );
    } catch {
      shopify.toast.show("Customer search failed. Check API scopes.");
    } finally {
      setLoading(false);
    }
  }

  async function attachCustomer(c) {
    try {
      await shopify.cart.setCustomer({ id: c.numericId });
      shopify.toast.show(`${c.firstName} ${c.lastName} added to cart`);
    } catch {
      shopify.toast.show("Failed to set customer on cart");
    }
  }

  async function removeCurrentCustomer() {
    try {
      await shopify.cart.removeCustomer();
      shopify.toast.show("Customer removed from cart");
    } catch {
      shopify.toast.show("Failed to remove customer");
    }
  }

  return (
    <s-box paddingBlock="large" paddingInline="small">
      <s-box paddingBlock="small">
        <s-stack gap="large">
          <s-box paddingBlock="small">
            <s-button onClick={() => setActiveTab("")}>
              <s-icon type="arrow-left" /> Back
            </s-button>
          </s-box>

          {currentCustomer && (
            <s-section heading="Attached Customer">
              <s-text> {`Customer #${currentCustomer.id}`}</s-text>
              <s-text>Tap Remove to detach</s-text>
              <s-button onClick={removeCurrentCustomer}>
                Remove Customer
              </s-button>
            </s-section>
          )}
          <s-section>
            <s-switch
              label="Create New"
              checked={mode === "create"}
              onChange={(e) =>
                setMode(e.currentTarget.checked ? "create" : "search")
              }
            />
          </s-section>
          {mode === "search" ? (
            <s-section heading="Search Customer">
              <s-text-field
                label="Name or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onInput={(e) => setQuery(e.target.value)}
                placeholder="jane@example.com"
              />
              <s-button onClick={searchCustomers} loading={loading}>
                Search
              </s-button>
              {results.length > 0 && (
                <s-section heading="Results">
                  {results.map((c) => (
                    <s-clickable key={c.id} onClick={() => attachCustomer(c)}>
                      <s-text>title={`${c.firstName} ${c.lastName}`}</s-text>
                      <s-text>subtitle={c.email}</s-text>
                    </s-clickable>
                  ))}
                </s-section>
              )}
              {!loading && results.length === 0 && query && (
                <s-text>No customers found. Try creating one.</s-text>
              )}
            </s-section>
          ) : (
            <CustomerCreate />
          )}
        </s-stack>
      </s-box>
    </s-box>
  );
}

function CustomerCreate() {
  const [firstName, setFirstName] = useState("Abc");
  const [lastName, setLastName] = useState("xyzzz");
  const [email, setEmail] = useState("abcpallavi@gmail.com");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function createAndAttach() {
    if (!firstName || !email) {
      shopify.toast.show("First name and email are required");
      return;
    }
    setLoading(true);
    try {
      const data = await gql(CREATE_CUSTOMER_MUTATION, {
        input: { firstName, lastName, email, phone: phone || undefined },
      });
      const errors = data?.data?.customerCreate?.userErrors ?? [];
      if (errors.length) {
        shopify.toast.show(errors[0].message);
        return;
      }
      const node = data?.data?.customerCreate?.customer;
      if (node) {
        await shopify.cart.setCustomer({ id: numericId(node.id) });
        shopify.toast.show(`${node.firstName} created & attached`);
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
      }
    } catch (error) {
      shopify.toast.show(error);
      shopify.toast.show("Failed to create customer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <s-box paddingBlock="large" paddingInline="small">
      <s-section heading="New Customer">
        <s-text-field
          label="First Name *"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          onInput={(e) => setFirstName(e.target.value)}
        />
        <s-text-field
          label="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          onInput={(e) => setLastName(e.target.value)}
        />
        <s-email-field
          label="Email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onInput={(e) => setEmail(e.target.value)}
        />
        <s-text-field
          label="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onInput={(e) => setPhone(e.target.value)}
          placeholder="+1 555-000-0000"
        />
        <s-button onClick={createAndAttach} loading={loading}>
          Create &amp; Attach Customer
        </s-button>
      </s-section>
    </s-box>
  );
}

// ═════════════════════════════ PRODUCTS ══════════════════════════════════════

function ProductsSection({ setActiveTab }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  async function searchProducts() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await gql(PRODUCT_SEARCH_QUERY, { query });
      setProducts(
        (data?.data?.products?.edges ?? []).map(({ node }) => ({
          id: node.id,
          title: node.title,
          vendor: node.vendor,
          variants: (node.variants?.edges ?? []).map(({ node: variant }) => ({
            id: variant?.id,
            numericId: numericId(variant?.id),
            title: variant?.title,
            price: variant?.price,
            sku: variant?.sku ?? "",
            sellingPlanGroups: (variant?.sellingPlanGroups?.edges ?? []).map(
              ({ node: spg }) => ({
                name: spg.name,
                sellingPlans: (spg.sellingPlans?.edges ?? []).map(
                  ({ node: item }) => ({
                    id: item?.id,
                    numericId: numericId(item?.id),
                    name: item?.name,
                    deliveryInterval: item?.deliveryPolicy?.interval ?? "MONTH",
                    deliveryIntervalCount:
                      item?.deliveryPolicy?.intervalCount ?? 1,
                  }),
                ),
              }),
            ),
          })),
        })),
      );
    } catch {
      shopify.toast.show("Product search failed. Check read_products scope.");
    } finally {
      setLoading(false);
    }
  }

  if (selected) {
    return (
      <ProductDetail
        product={selected}
        onBack={() => setSelected(null)}
        setActiveTab={setActiveTab}
      />
    );
  }

  return (
    <s-box paddingBlock="large" paddingInline="small">
      <s-stack gap="small">
        <s-box paddingBlock="small">
          <s-button onClick={() => setActiveTab("")}>
            <s-icon type="arrow-left" /> Back
          </s-button>
        </s-box>
        <s-box paddingBlock="small">
          <s-section heading="Search Products">
            <s-text-field
              label="Product name or SKU"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Product name, sku,barcode value...…"
            />
            <s-button onClick={searchProducts} loading={loading}>
              Search
            </s-button>
          </s-section>
          {products.length > 0 && (
            <s-section heading="Results">
              <s-choice-list
                values={[selected]}
                onChange={(e) => setSelected(e.currentTarget.values?.[0])}
              >
                {products.map((p) => (
                  <s-choice key={p.id} value={p}>
                    {" "}
                    {p.title} : {p.vendor}
                  </s-choice>
                ))}
              </s-choice-list>
            </s-section>
          )}
          {!loading && products.length === 0 && query && (
            <s-text>No products found.</s-text>
          )}
        </s-box>
      </s-stack>
    </s-box>
  );
}

function ProductDetail({ product, onBack, setActiveTab }) {
  const [selectedVariant, setSelectedVariant] = useState(product?.variants[0]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [properties, setProperties] = useState({});
  const [propKey, setPropKey] = useState("");
  const [propValue, setPropValue] = useState("");
  const [loading, setLoading] = useState(false);

  const allPlans = (selectedVariant?.sellingPlanGroups ?? []).flatMap(
    (g) => g.sellingPlans,
  );
  const hasPlans = allPlans.length > 0;

  async function addToCart() {
    setLoading(true);
    try {
      const uuid = await shopify.cart.addLineItem(
        selectedVariant?.numericId,
        1,
      );
      if (!uuid) {
        shopify.toast.show("Item not added (oversell guard dismissed)");
        return;
      }
      if (Object.keys(properties).length > 0) {
        await shopify.cart.addLineItemProperties(uuid, properties);
      }
      if (selectedPlan) {
        await shopify.cart.addLineItemSellingPlan({
          lineItemUuid: uuid,
          sellingPlanId: selectedPlan?.numericId,
          sellingPlanName: selectedPlan?.name,
          deliveryInterval: selectedPlan?.deliveryInterval,
          deliveryIntervalCount: selectedPlan?.deliveryIntervalCount,
        });
      }
      shopify.toast.show(
        `${product?.title}${selectedPlan ? ` (${selectedPlan?.name})` : ""} added`,
      );
    } catch (err) {
      shopify.toast.show(`Failed: ${err?.message ?? "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <s-scroll-box paddingInline="large" paddingBlock="base">
      <s-section>
        <s-button onClick={onBack}> ← Back to results</s-button>
      </s-section>

      <s-section heading={product?.title}>
        <s-text>Vendor: {product?.vendor}</s-text>
      </s-section>

      {product?.variants?.length > 1 && (
        <s-section heading="Select Variant">
          <s-choice-list
            values={[selectedVariant?.id]}
            onChange={(e) => {
              const variant = product?.variants?.find(
                (variant) => variant?.id === e.currentTarget.values?.[0],
              );
              if (variant) {
                setSelectedVariant(variant);
                setSelectedPlan(null);
              }
            }}
          >
            {product?.variants?.map((variant) => (
              <s-choice
                key={variant?.id}
                value={variant?.id}
              >{`${variant?.title} — $${variant?.price}`}</s-choice>
            ))}
          </s-choice-list>
        </s-section>
      )}

      <s-section heading="Variant Details">
        <s-stack>
          {selectedVariant?.title} -{" "}
          {`$${selectedVariant?.price}${selectedVariant?.sku ? ` · SKU: ${selectedVariant?.sku}` : ""}`}
        </s-stack>
      </s-section>

      {hasPlans && (
        <s-section heading="Selling Plans (Subscriptions)">
          <s-switch
            label="One-time purchase"
            checked={selectedPlan == null}
            onChange={(event) => {
              console.log("Switch toggled:", event.currentTarget.checked);
              if (event.currentTarget.checked) {
                setSelectedPlan(null);
              }
            }}
          />

          {allPlans.map((item) => (
            <s-clickable key={item?.id} onClick={() => setSelectedPlan(item)}>
              <s-stack>
                {" "}
                {item?.name} :{" "}
                {`Every ${item?.deliveryIntervalCount} ${item?.deliveryInterval.toLowerCase()}(s)`}
                : {selectedPlan?.id === item?.id ? "Selected" : undefined}{" "}
              </s-stack>
            </s-clickable>
          ))}
        </s-section>
      )}

      <s-section heading="Custom Properties (optional)">
        <s-text-field
          label="Property name"
          value={propKey}
          onChange={(e) => setPropKey(e.target.value)}
          placeholder="Gift message"
        />
        <s-text-field
          label="Property value"
          value={propValue}
          onChange={(e) => setPropValue(e.target.value)}
          placeholder="Happy Birthday!"
        />
        <s-button
          onClick={() => {
            if (!propKey.trim()) return;
            setProperties((prev) => ({ ...prev, [propKey.trim()]: propValue }));
            setPropKey("");
            setPropValue("");
          }}
        >
          + Add Property
        </s-button>

        {Object.entries(properties).map(([k, variant]) => (
          <s-clickable
            key={k}
            onClick={() => {
              const next = { ...properties };
              delete next[k];
              setProperties(next);
            }}
          >
            <s-stack>
              {k} - {variant}
            </s-stack>
          </s-clickable>
        ))}
      </s-section>

      <s-section>
        <s-button variant="primary" onClick={addToCart} loading={loading}>
          Add to Cart{selectedPlan ? ` · ${selectedPlan?.name}` : ""}
        </s-button>
      </s-section>
    </s-scroll-box>
  );
}

// ═════════════════════════════ DISCOUNTS ═════════════════════════════════════

function DiscountsSection({ setActiveTab }) {
  const [discountType, setDiscountType] = useState("Percentage");
  const [discountTitle, setDiscountTitle] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [loading, setLoading] = useState(false);

  const cartDiscount = shopify.cart.current.value.cartDiscount;

  async function applyDiscount() {
    setLoading(true);
    try {
      if (discountType === "Code") {
        if (!discountCode.trim()) {
          shopify.toast.show("Enter a discount code");
          return;
        }
        await shopify.cart.addCartCodeDiscount(discountCode.trim());
        shopify.toast.show(`Code "${discountCode}" applied`);
        setDiscountCode("");
      } else {
        if (!discountTitle.trim() || !discountAmount) {
          shopify.toast.show("Title and amount are required");
          return;
        }
        await shopify.cart.applyCartDiscount(
          discountType,
          discountTitle.trim(),
          discountAmount,
        );
        shopify.toast.show(`${discountType} discount applied`);
        setDiscountTitle("");
        setDiscountAmount("");
      }
    } catch (err) {
      shopify.toast.show(`Discount error: ${err?.message ?? "Unknown"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <s-page>
      <s-scroll-box padding="base">
        <s-stack gap="small">
          {cartDiscount && (
            <s-section heading="Active Cart Discount">
              <s-tile
                heading={cartDiscount.discountDescription ?? "Custom Discount"}
                subheading={
                  cartDiscount.type === "Percentage"
                    ? `${cartDiscount.amount}% off`
                    : `$${cartDiscount.amount} off`
                }
              />
              <s-button
                onClick={async () => {
                  try {
                    await shopify.cart.removeCartDiscount();
                    shopify.toast.show("Cart discount removed");
                  } catch {
                    shopify.toast.show("Failed to remove discount");
                  }
                }}
              >
                Remove Discount
              </s-button>
            </s-section>
          )}

          <s-section heading="Apply Cart Discount">
            <s-choice-list
              values={[discountType]}
              onChange={(e) => setDiscountType(e.currentTarget.values[0])}
            >
              <s-choice value="Percentage">Percentage %</s-choice>
              <s-choice value="FixedAmount">Fixed Amount $</s-choice>
              <s-choice value="Code">Discount Code</s-choice>
            </s-choice-list>

            {discountType === "Code" ? (
              <s-text-field
                label="Discount Code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="SUMMER10"
              />
            ) : (
              <>
                <s-text-field
                  label="Discount Title"
                  value={discountTitle}
                  onChange={(e) => setDiscountTitle(e.target.value)}
                  placeholder="Staff discount"
                />
                <s-number-field
                  label={
                    discountType === "Percentage"
                      ? "Percentage (e.g. 10)"
                      : "Fixed Amount (e.g. 5.00)"
                  }
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </>
            )}
            <s-button onClick={applyDiscount} loading={loading}>
              Apply Discount
            </s-button>
          </s-section>

          <s-section heading="Clear Discounts">
            <s-button
              onClick={async () => {
                try {
                  await shopify.cart.removeAllDiscounts(true);
                  shopify.toast.show("All discounts removed");
                } catch {
                  shopify.toast.show("Failed to remove all discounts");
                }
              }}
            >
              Remove All Discounts
            </s-button>
          </s-section>
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
}

// ═════════════════════════════ CART ══════════════════════════════════════════

function CartSection({ setActiveTab }) {
  const [cart, setCart] = useState(shopify.cart.current.value);

  useEffect(() => {
    const unsub = shopify.cart.current.subscribe(setCart);
    return unsub;
  }, []);

  return (
    <s-page>
      <s-scroll-box padding="base">
        <s-stack gap="small">
          <s-stack>
            <s-button onClick={() => setActiveTab("")}>
              <s-icon type="arrow-left" /> Back
            </s-button>
          </s-stack>
          <s-section heading="Cart Summary">
            <s-tile heading="Subtotal" subheading={cart.subtotal} />
            <s-tile heading="Tax" subheading={cart.taxTotal} />
            <s-tile heading="Grand Total" subheading={cart.grandTotal} />
            {cart.customer && (
              <s-tile
                heading="Customer"
                subheading={`ID: ${cart.customer.id}`}
              />
            )}
            {cart.cartDiscount && (
              <s-tile
                heading={`Discount: ${cart.cartDiscount.discountDescription ?? "Applied"}`}
                subheading={
                  cart.cartDiscount.type === "Percentage"
                    ? `${cart.cartDiscount.amount}% off`
                    : `$${cart.cartDiscount.amount} off`
                }
              />
            )}
          </s-section>

          {cart.lineItems.length === 0 ? (
            <s-section>
              <s-text>Cart is empty.</s-text>
            </s-section>
          ) : (
            <s-section heading="Line Items">
              {cart.lineItems.map((item) => (
                <s-tile
                  key={item?.uuid}
                  heading={item?.title ?? `Variant #${item?.variantId}`}
                  subheading={[
                    `Qty: ${item?.quantity}`,
                    item?.price ? `$${item?.price}` : "",
                    item?.sellingPlan ? `📅 ${item?.sellingPlan.name}` : "",
                    item?.discounts?.length
                      ? `🏷 ${item?.discounts[0].discountDescription}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  onClick={async () => {
                    try {
                      await shopify.cart.removeLineItem(item?.uuid);
                      shopify.toast.show("Item removed");
                    } catch {
                      shopify.toast.show("Failed to remove item");
                    }
                  }}
                />
              ))}
            </s-section>
          )}

          {cart.lineItems.length > 0 && (
            <s-section>
              <s-button
                onClick={async () => {
                  try {
                    await shopify.cart.clearCart();
                    shopify.toast.show("Cart cleared");
                  } catch {
                    shopify.toast.show("Failed to clear cart");
                  }
                }}
              >
                Clear Cart
              </s-button>
            </s-section>
          )}
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
}
