
// components/ProductList.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useFetcher } from "react-router";
import debounce from "lodash/debounce";

export default function ProductList({
  onSelectVariants,
  selectedVariantIds = new Set(),
  clearSelectedVariants,
  assignmentType,
  generationType,
  overwriteExisting,
  collections,
  productTypes,
  openGenerationModal,
  selectedVariants,
  setLoading,
  loading,
  setIsLoading,
  isLoading,
  filters,
  setFilters,
}) {
  const fetcher = useFetcher();

  // ── Local state ─────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [filterType, setFilterType] = useState("all");

  const [pageInfo, setPageInfo] = useState({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  });
  const [totalCount, setTotalCount] = useState(0);
  // const [isLoading, setIsLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState("ProductTitle");
  const [orderBy, setOrderBy] = useState("asc");

  // Track whether a barcode generation just completed so we can re-fetch
  const pendingRefetch = useRef(false);

  // ── Derived: displayed products based on filterType ──────────────────────────
  const displayedProducts = useMemo(() => {
    if (!products?.length) return [];
    if (filterType === "all") return products;

    return products
      .map((product) => {
        let variants = product.variants || [];
        if (filterType === "withoutBarcode") {
          variants = variants.filter((v) => !v.barcode);
        } else if (filterType === "withoutSKU") {
          variants = variants.filter((v) => !v.sku);
        } else if (filterType === "withoutBoth") {
          variants = variants.filter((v) => !v.sku && !v.barcode);
        }
        return { ...product, variants };
      })
      .filter((p) => p.variants.length > 0);
  }, [products, filterType]);

  // ── Build query string from filters ─────────────────────────────────────────
  const buildQueryString = useCallback(() => {
    const conditions = [];
    if (filters.search?.trim().length > 2)
      conditions.push(filters.search.trim());
    if (filters.status?.length)
      conditions.push(`status:${filters.status.join(",")}`);
    if (filters.collection?.length) {
      const q = filters.collection.map(
        (id) => `collection_id:${id.split("/").pop()}`,
      );
      conditions.push(`(${q.join(" OR ")})`);
    }
    if (filters.type) conditions.push(`product_type:'${filters.type}'`);
    if (filters.vendor?.length) {
      const q = filters.vendor.map((v) => `vendor:'${v}'`).join(" OR ");
      conditions.push(`(${q})`);
    }
    return conditions.join(" AND ");
  }, [filters]);

  // ── Submit a fetch_products request ─────────────────────────────────────────
  const fetchProducts = useCallback(
    (overrideFilters) => {
      const activeFilters = overrideFilters || filters;
      const queryString = buildQueryString();
      const formData = new FormData();
      formData.append("action", "fetch_products");
      formData.append(
        "data",
        JSON.stringify({
          first: 15,
          after:
            activeFilters.direction === "next" ? activeFilters.cursor : null,
          before:
            activeFilters.direction === "previous"
              ? activeFilters.cursor
              : null,
          query: queryString || "",
          direction: activeFilters.direction,
        }),
      );
      fetcher.submit(formData, { method: "post" });
    },
    [filters, buildQueryString],
  );

  // ── Initial fetch + re-fetch when filters change ─────────────────────────────
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.search,
    filters.status,
    filters.collection,
    filters.vendor,
    filters.type,
    filters.cursor,
    filters.direction,
  ]);

  // ── Handle fetcher responses ─────────────────────────────────────────────────
  useEffect(() => {
    if (fetcher.state === "submitting" || fetcher.state === "loading") {
      setIsLoading(true);
      return;
    }

    if (fetcher.state === "idle" && fetcher.data) {
      setIsLoading(false);

      // ── Barcode generation completed: re-fetch products to show updated values
      if (fetcher.data.action === "generate_barcode") {
        if (fetcher.data.status) {
          clearSelectedVariants?.();
          // Re-fetch the current page to refresh barcode/SKU values
          fetchProducts();
        }
        return;
      }

      // ── Products fetched
      if (fetcher.data.action === "fetch_products") {
        if (fetcher.data.error) {
          console.error("Fetch error:", fetcher.data.error);
          return;
        }
        setProducts(fetcher.data.products || []);
        setPageInfo(fetcher.data.pageInfo || {});
        setTotalCount(fetcher.data.totalCount || 0);
      }
    }
  }, [fetcher.state, fetcher.data]);

  // ── Debounced search ─────────────────────────────────────────────────────────
  const debouncedSetSearch = useMemo(
    () =>
      debounce((value) => {
        setFilters((prev) => ({
          ...prev,
          search: value,
          cursor: null,
          direction: "next",
        }));
      }, 300),
    [],
  );

  useEffect(() => () => debouncedSetSearch.cancel(), [debouncedSetSearch]);

  // ── Filter helpers ───────────────────────────────────────────────────────────
  const handleFilterChange = (key, value, checked) => {
    if (["status", "vendor", "collection"].includes(key)) {
      setFilters((prev) => ({
        ...prev,
        cursor: null,
        direction: "next",
        [key]: checked
          ? [...(prev[key] || []), value]
          : (prev[key] || []).filter((item) => item !== value),
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        cursor: null,
        direction: "next",
        [key]: value,
      }));
    }
  };

  const clearAllFilters = () => {
    setFilters({
      search: "",
      status: [],
      vendor: [],
      collection: [],
      type: "",
      cursor: null,
      direction: "next",
    });
  };

  const hasActiveFilters =
    filters.status?.length ||
    filters.collection?.length ||
    filters.vendor?.length ||
    filters.type;

  // ── Pagination ───────────────────────────────────────────────────────────────
  const handleNextPage = () =>
    setFilters((prev) => ({
      ...prev,
      cursor: pageInfo.endCursor,
      direction: "next",
    }));

  const handlePreviousPage = () =>
    setFilters((prev) => ({
      ...prev,
      cursor: pageInfo.startCursor,
      direction: "previous",
    }));

  // ── Selection helpers ────────────────────────────────────────────────────────
  const isProductFullySelected = useCallback(
    (product) => {
      const ids = product.variants?.map((v) => v.id) || [];
      return ids.length > 0 && ids.every((id) => selectedVariantIds.has(id));
    },
    [selectedVariantIds],
  );

  const isProductPartiallySelected = useCallback(
    (product) => {
      const ids = product.variants?.map((v) => v.id) || [];
      const count = ids.filter((id) => selectedVariantIds.has(id)).length;
      return count > 0 && count < ids.length;
    },
    [selectedVariantIds],
  );

  const handleSelectProduct = useCallback(
    (product, checked) => {
      const variants =
        product.variants?.map((v) => ({ ...v, productId: product.id })) || [];
      onSelectVariants?.(variants, checked ? "add" : "remove");
    },
    [onSelectVariants],
  );

  const handleSelectAll = useCallback(
    (checked) => {
      const allVariants = displayedProducts.flatMap(
        (product) =>
          product.variants?.map((v) => ({ ...v, productId: product.id })) || [],
      );
      onSelectVariants?.(allVariants, checked ? "add" : "remove");
    },
    [displayedProducts, onSelectVariants],
  );

  const allFullySelected =
    displayedProducts.length > 0 &&
    displayedProducts.every((p) => isProductFullySelected(p));

  const somePartiallyOrFullySelected =
    !allFullySelected &&
    displayedProducts.some(
      (p) => isProductPartiallySelected(p) || isProductFullySelected(p),
    );

  // ── Inline generate (no modal) — used by per-row/per-variant buttons ─────────
  const submitGenerate = useCallback(
    (variants) => {
      const formData = new FormData();
      formData.append("action", "generate_barcode");
      formData.append(
        "data",
        JSON.stringify({
          assignmentType,
          generationType,
          overwriteExisting,
          variants,
        }),
      );
      fetcher.submit(formData, { method: "post" });
    },
    [assignmentType, generationType, overwriteExisting, fetcher],
  );

  // ── Bulk generate for selected variants ─────────────────────────────────────

  return (
    <s-section padding="none">
      <s-stack gap="small-400" padding="none">
        {/* ── Toolbar ── */}
        <s-box paddingInline="small-200" paddingBlock="small-200">
          <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="large-200">
            <s-grid-item gridColumn="span 10" gridRow="span 1" key="1" >
              {showFilters ? (
                <s-search-field
                  value={filters.search}
                  label="Search"
                  labelAccessibilityVisibility="exclusive"
                  onInput={(e) => {
                    const value = e.target.value;
                    if (!value || value.trim().length >= 2) {
                      debouncedSetSearch(value);
                    }
                  }}
                  placeholder="Search by title, vendor, SKU..."
                />
              ) : (
                <s-stack direction="inline" gap="small">
                  {[
                    { key: "all", label: "All" },
                    { key: "withoutBarcode", label: "Without Barcode" },
                    { key: "withoutSKU", label: "Without SKU" },
                    { key: "withoutBoth", label: "Without SKU & Barcode" },
                  ].map(({ key, label }) => (
                    <s-clickable-chip
                      key={key}
                      color={filterType === key ? "base" : "subdued"}
                      onClick={() => setFilterType(key)}
                    >
                      {label}
                    </s-clickable-chip>
                  ))}
                </s-stack>
              )}
            </s-grid-item>

            <s-grid-item gridColumn="span 2" gridRow="span 1" key="2">
              <s-stack direction="inline" gap="small-400" justifyContent="end">
                <s-stack alignment="center" blockAlignment="center">
                  {(isLoading || loading) && <s-spinner size="base" />}
                </s-stack>

                {!showFilters ? (
                  <>
                    <s-tooltip id="search-filter-tooltip">
                      <s-text>Search and Filter</s-text>
                    </s-tooltip>
                    <s-button
                      icon="search"
                      onClick={() => setShowFilters(true)}
                      interestFor="search-filter-tooltip"
                    />
                  </>
                ) : (
                  <s-button
                    variant="tertiary"
                    onClick={() => {
                      clearAllFilters();
                      setShowFilters(false);
                    }}
                  >
                    Cancel
                  </s-button>
                )}

                <s-tooltip id="sort-tooltip">
                  <s-text>Sort</s-text>
                </s-tooltip>
                <s-button
                  icon="sort"
                  variant="secondary"
                  accessibilityLabel="Sort"
                  interestFor="sort-tooltip"
                  commandFor="sort-popover"
                />
                <s-popover id="sort-popover">
                  <s-stack gap="none">
                    <s-box padding="base">
                      <s-choice-list
                        label="Sort by"
                        name="Sort by"
                        values={[sortBy]}
                        onChange={(e) => setSortBy(e.currentTarget.values?.[0])}
                      >
                        <s-choice value="ProductTitle">Product</s-choice>
                        <s-choice value="CreatedAt">Created</s-choice>
                      </s-choice-list>
                    </s-box>
                    <s-divider />
                    <s-box paddingInline="base">
                      <s-choice-list
                        label="Order by"
                        labelAccessibilityVisibility="exclusive"
                        name="Order by"
                        values={[orderBy]}
                        onChange={(e) =>
                          setOrderBy(e.currentTarget.values?.[0])
                        }
                      >
                        {sortBy === "ProductTitle" ? (
                          <>
                            <s-choice value="asc">A-Z</s-choice>
                            <s-choice value="desc">Z-A</s-choice>
                          </>
                        ) : (
                          <>
                            <s-choice value="asc">Newest</s-choice>
                            <s-choice value="desc">Oldest</s-choice>
                          </>
                        )}
                      </s-choice-list>
                    </s-box>
                  </s-stack>
                </s-popover>
              </s-stack>
            </s-grid-item>
          </s-grid>
        </s-box>

        <s-divider />

        {/* ── Filter chips ── */}
        {showFilters && (
          <s-stack
            direction="inline"
            gap="small-200"
            paddingInline="small-100"
            paddingBlockEnd="small-200"
          >
            {/* Status */}
            <s-stack direction="inline" gap="base">
              <s-clickable-chip
                color="subdued"
                accessibilityLabel="Filter by status"
                commandFor="product-status-popover"
              >
                {filters.status?.length ? (
                  <s-stack direction="inline" gap="none" alignItems="center">
                    <s-text>Status: {filters.status.join(", ")}</s-text>
                    <s-icon
                      type="x"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilters((prev) => ({
                          ...prev,
                          cursor: null,
                          status: [],
                        }));
                      }}
                    />
                  </s-stack>
                ) : (
                  <s-stack direction="inline">
                    <s-text>Status</s-text>
                    <s-icon type="caret-down" size="small" />
                  </s-stack>
                )}
              </s-clickable-chip>
              <s-popover id="product-status-popover">
                <s-box padding="none base">
                  <s-stack gap="none">
                    {["Active", "Draft", "Archived", "Unlisted"].map((s) => (
                      <s-checkbox
                        key={s}
                        label={s}
                        value={s}
                        checked={filters.status?.includes(s)}
                        onChange={(e) =>
                          handleFilterChange(
                            "status",
                            e.currentTarget.value,
                            e.currentTarget.checked,
                          )
                        }
                      />
                    ))}
                  </s-stack>
                  <s-button
                    variant="tertiary"
                    commandFor="product-status-popover"
                    command="hide"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, status: [] }))
                    }
                  >
                    Clear
                  </s-button>
                </s-box>
              </s-popover>
            </s-stack>

            {/* Collection */}
            <s-stack direction="inline" gap="base">
              <s-clickable-chip
                color="subdued"
                accessibilityLabel="Filter by collection"
                commandFor="product-collection-popover"
              >
                {filters.collection?.length ? (
                  <s-stack direction="inline" gap="none" alignItems="center">
                    <s-text>
                      Collection:{" "}
                      {filters.collection
                        .map((id) => collections[id])
                        .filter(Boolean)
                        .join(", ")}
                    </s-text>
                    <s-icon
                      type="x"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilters((prev) => ({
                          ...prev,
                          cursor: null,
                          collection: [],
                        }));
                      }}
                    />
                  </s-stack>
                ) : (
                  <s-stack direction="inline">
                    <s-text>Collection</s-text>
                    <s-icon type="caret-down" size="small" />
                  </s-stack>
                )}
              </s-clickable-chip>
              <s-popover id="product-collection-popover">
                <s-box padding="none base">
                  <s-stack gap="none">
                    {Object.entries(collections || {}).map(([id, title]) => (
                      <s-checkbox
                        key={id}
                        label={title}
                        value={id}
                        checked={filters.collection?.includes(id)}
                        onChange={(e) =>
                          handleFilterChange(
                            "collection",
                            e.currentTarget.value,
                            e.currentTarget.checked,
                          )
                        }
                      />
                    ))}
                  </s-stack>
                  <s-button
                    variant="tertiary"
                    commandFor="product-collection-popover"
                    command="hide"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, collection: [] }))
                    }
                  >
                    Clear
                  </s-button>
                </s-box>
              </s-popover>
            </s-stack>

            {/* Product Type */}
            <s-stack direction="inline" gap="base">
              <s-clickable-chip
                color="subdued"
                accessibilityLabel="Filter by type"
                commandFor="product-type-popover"
              >
                {filters.type ? (
                  <s-stack direction="inline" gap="none" alignItems="center">
                    <s-text>Type: {filters.type}</s-text>
                    <s-icon
                      type="x"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilters((prev) => ({
                          ...prev,
                          cursor: null,
                          type: "",
                        }));
                      }}
                    />
                  </s-stack>
                ) : (
                  <s-stack direction="inline">
                    <s-text>Product Type</s-text>
                    <s-icon type="caret-down" size="small" />
                  </s-stack>
                )}
              </s-clickable-chip>
              <s-popover id="product-type-popover">
                <s-box padding="none base">
                  <s-stack gap="none">
                    {productTypes.map((elm, i) => (
                      <s-checkbox
                        key={i}
                        label={elm}
                        value={elm}
                        checked={filters.type === elm}
                        onChange={(e) =>
                          handleFilterChange(
                            "type",
                            e.currentTarget.checked
                              ? e.currentTarget.value
                              : "",
                            e.currentTarget.checked,
                          )
                        }
                      />
                    ))}
                  </s-stack>
                  <s-button
                    variant="tertiary"
                    commandFor="product-type-popover"
                    command="hide"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, type: "" }))
                    }
                  >
                    Clear
                  </s-button>
                </s-box>
              </s-popover>
            </s-stack>

            {hasActiveFilters && (
              <s-button variant="tertiary" onClick={clearAllFilters}>
                Clear all
              </s-button>
            )}
          </s-stack>
        )}

        {/* ── Table ── */}
        {displayedProducts.length > 0 ? (
          <s-box>
            <s-table
              variant="table"
              loading={isLoading || loading}
              paginate
              hasNextPage={pageInfo.hasNextPage}
              hasPreviousPage={pageInfo.hasPreviousPage}
              onNextPage={handleNextPage}
              onPreviousPage={handlePreviousPage}
            >
              {selectedVariants?.length ? (
                <s-table-header-row>
                  <s-table-header listSlot="primary">
                    <s-checkbox
                    label={`${selectedVariants?.length}`}
                      checked={allFullySelected}
                      indeterminate={somePartiallyOrFullySelected}
                      onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                    />
                  </s-table-header>
               
                </s-table-header-row>
              ) : (
                <s-table-header-row>
                  <s-table-header listSlot="primary">
                    <s-checkbox
                      checked={allFullySelected}
                      indeterminate={somePartiallyOrFullySelected}
                      onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                    />
                  </s-table-header>
                  <s-table-header listSlot="primary">
                    <s-heading>Product</s-heading>
                  </s-table-header>
                  <s-table-header />
                  <s-table-header listSlot="labeled" format="base">
                    Status
                  </s-table-header>
                  <s-table-header listSlot="labeled" format="numeric">
                    Actions
                  </s-table-header>
                </s-table-header-row>
              )}

              <s-table-body>
                {displayedProducts.map((product) => {
                  const isExpanded = expandedRow === product.id;
                  const isFullySelected = isProductFullySelected(product);
                  const isPartiallySelected =
                    isProductPartiallySelected(product);

                  return (
                    <React.Fragment key={product.id}>
                      {/* Product row */}
                      <s-table-row>
                        <s-table-cell>
                          <s-checkbox
                            id={product.id}
                            checked={isFullySelected}
                            indeterminate={isPartiallySelected}
                            onChange={(e) =>
                              handleSelectProduct(
                                product,
                                e.currentTarget.checked,
                              )
                            }
                          />
                        </s-table-cell>

                        <s-table-cell>
                          <s-stack
                            direction="inline"
                            gap="small-200"
                            alignItems="center"
                          >
                            <s-thumbnail
                              src={product.featuredImage}
                              alt="Product thumbnail"
                              size="small-100"
                            />
                            <s-stack gap="none">
                              <s-link
                                href={`https://admin.shopify.com/store/pos-app-store-2/products/${product.id?.split("/")?.pop()}`}
                              >
                                <s-heading>{product.title}</s-heading>
                              </s-link>
                              <s-text>
                                {product.variants?.length} variant
                                {product.variants?.length !== 1 ? "s" : ""}
                              </s-text>
                            </s-stack>
                          </s-stack>
                        </s-table-cell>

                        <s-table-cell />

                        <s-table-cell>
                          <s-badge
                            tone={
                              product.status === "ACTIVE"
                                ? "success"
                                : "warning"
                            }
                          >
                            {product.status?.toLowerCase()} 
                          </s-badge>
                        </s-table-cell>

                        <s-table-cell>
                          <s-stack
                            direction="inline"
                            gap="small"
                            justifyContent="end"
                          >
                            <s-button
                              variant="secondary"
                              loading={isLoading}
                              onClick={() => submitGenerate(product.variants)}
                            >
                              Generate
                            </s-button>
                            <s-button
                              accessibilityLabel="Expand variants"
                              variant="tertiary"
                              size="small"
                              icon={isExpanded ? "caret-up" : "caret-down"}
                              onClick={() =>
                                setExpandedRow(isExpanded ? null : product.id)
                              }
                            />
                          </s-stack>
                        </s-table-cell>
                      </s-table-row>

                      {/* Expanded variant rows */}
                      {isExpanded && (
                        <s-table-row>
                          <s-table-cell />
                          <s-table-cell colSpan={4}>
                            <s-table>
                              <s-table-body>
                                {product.variants?.map((variant) => (
                                  <s-table-row key={variant.id}>
                                    <s-table-cell>
                                      <s-checkbox
                                        id={variant.id}
                                        checked={selectedVariantIds.has(
                                          variant.id,
                                        )}
                                        onChange={(e) =>
                                          onSelectVariants?.(
                                            [
                                              {
                                                ...variant,
                                                productId: product.id,
                                              },
                                            ],
                                            e.currentTarget.checked
                                              ? "add"
                                              : "remove",
                                          )
                                        }
                                      />
                                    </s-table-cell>

                                    <s-table-cell>
                                      <s-thumbnail
                                        src={
                                          variant.featuredImage ||
                                          product.featuredImage
                                        }
                                        alt="Variant thumbnail"
                                        size="small-100"
                                      />
                                    </s-table-cell>

                                    <s-table-cell>
                                      <s-stack gap="none">
                                        <s-link
                                          href={`https://admin.shopify.com/store/pos-app-store-2/products/${product.id?.split("/")?.pop()}/variants/${variant.id?.split("/")?.pop()}`}
                                        >
                                          {product.title} — {variant.title}
                                        </s-link>
                                        <s-stack>
                                          {(assignmentType === "sku" ||
                                            assignmentType === "both") && (
                                            <s-stack
                                              direction="inline"
                                              alignItems="center"
                                              gap="small-400"
                                            >
                                              <s-icon type="hashtag" />
                                              <s-text
                                                tone={
                                                  variant.sku
                                                    ? "auto"
                                                    : "critical"
                                                }
                                              >
                                                {variant.sku || "Missing"}
                                              </s-text>
                                            </s-stack>
                                          )}
                                          {(assignmentType === "barcode" ||
                                            assignmentType === "both") && (
                                            <s-stack
                                              direction="inline"
                                              alignItems="center"
                                              gap="small-400"
                                            >
                                              <s-icon type="barcode" />
                                              <s-text
                                                tone={
                                                  variant.barcode
                                                    ? "auto"
                                                    : "critical"
                                                }
                                              >
                                                {variant.barcode || "Missing"}
                                              </s-text>
                                            </s-stack>
                                          )}
                                        </s-stack>
                                      </s-stack>
                                    </s-table-cell>

                                    <s-table-cell>
                                      <s-button
                                        variant="secondary"
                                        size="small"
                                        loading={isLoading}
                                        onClick={() =>
                                          submitGenerate([
                                            {
                                              ...variant,
                                              productId: product.id,
                                            },
                                          ])
                                        }
                                      >
                                        Generate 
                                      </s-button>
                                    </s-table-cell>
                                  </s-table-row>
                                ))}
                              </s-table-body>
                            </s-table>
                          </s-table-cell>
                        </s-table-row>
                      )}
                    </React.Fragment>
                  );
                })}
              </s-table-body>
            </s-table>

            {/* ── Bottom action bar ── */}
            {selectedVariants?.length > 0 && (
              <s-box
                paddingInline="base"
                paddingBlock="small-400"
                background="surface-secondary"
              >
                <s-stack
                  direction="inline"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <s-text>
                    <s-text fontWeight="bold">{selectedVariants.length}</s-text>{" "}
                    variant
                    {selectedVariants.length !== 1 ? "s" : ""} selected
                  </s-text>
                  <s-stack direction="inline" gap="small-400">
                    <s-button
                      variant="secondary"
                      onClick={clearSelectedVariants}
                    >
                      Clear selection
                    </s-button>
                    <s-button
                      variant="primary"
                      commandFor="generate-barcode-modal"
                      command="--show"
                    >
                      Generate for selected
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-box>
            )}
          </s-box>
        ) : (
          <s-box padding="large" paddingBlockEnd="large-400">
            <s-stack gap="small" alignItems="center">
              <s-icon name="products" size="large" />
              <s-heading level="3">No products found</s-heading>
              <s-text tone="subdued">
                Try changing the filters or search term
              </s-text>
              <s-button variant="primary" onClick={clearAllFilters}>
                Clear filters
              </s-button>
            </s-stack>
          </s-box>
        )}
      </s-stack>
    </s-section>
  );
}
