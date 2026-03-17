// components/VariantList.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useFetcher } from "react-router";
import debounce from "lodash/debounce";
import PDFPrintButton from "./PDFPrintButton";
// import PDFPrintButton from "./Lableprint"

export default function VariantList({
  shop,
  onSelectVariants,
  selectedVariantIds,
  clearSelectedVariants,
  collections,
  productTypes,
  selectedVariants,
  setSelectedVariants,
  setSelectedVariantIds,
  setLoading,
  loading,
  setIsLoading,
  isLoading,
  filters,
  setFilters,
  selectedTemplate,
}) {
  const fetcher = useFetcher();

  // ── Local state ─────────────────────────────────────────────────────────────
  const [productVariants, setProductVariants] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [pageInfo, setPageInfo] = useState({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState("ProductTitle");
  const [orderBy, setOrderBy] = useState("asc");
  const [customQuantity, setCustomQuantity] = useState(0);
  const [quantityType, setQuantityType] = useState("");
  // console.log("productVariants", productVariants);

  // print confirmation modal state
  const [printModal, setPrintModal] = useState({
    open: false,
    variant: null,
    isBulk: false,
  });

  // ── Derived: displayed productVariants based on filterType ──────────────────
  const displayedVariants = useMemo(() => {
    if (!productVariants?.length) return [];
    if (filterType === "all") return productVariants;

    return productVariants.filter((variant) => {
      if (filterType === "withoutBarcode") return !variant.barcode;
      if (filterType === "withoutSKU") return !variant.sku;
      if (filterType === "withoutBoth") return !variant.sku && !variant.barcode;
      return true;
    });
  }, [productVariants, filterType]);

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

  // ── Submit a fetch_variants request ─────────────────────────────────────────
  const fetchProducts = useCallback(
    (overrideFilters) => {
      const activeFilters = overrideFilters || filters;
      const queryString = buildQueryString();
      const formData = new FormData();
      formData.append("action", "fetch_variants");
      formData.append(
        "data",
        JSON.stringify({
          first: 25,
          after:
            activeFilters.direction === "next" ? activeFilters.cursor : null,
          before:
            activeFilters.direction === "previous"
              ? activeFilters.cursor
              : null,
          query: queryString || "",
          direction: activeFilters.direction,
          sortBy,
          orderBy,
        }),
      );
      fetcher?.submit(formData, { method: "post" });
    },
    [filters, buildQueryString, sortBy, orderBy],
  );
  const handleApplyQuantity = () => {
    
    console.log(selectedVariantIds);
    setProductVariants((prev) =>
      prev.map((variant) => {
        return {
          ...variant,
          label_quantity:
            quantityType === "match_inventory"
              ? variant.inventoryQuantity
              : customQuantity,
        };
      }),
    );
  };
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
    sortBy,
    orderBy,
  ]);

  // ── Handle fetcher responses ─────────────────────────────────────────────────
  useEffect(() => {
    if (fetcher?.state === "submitting" || fetcher?.state === "loading") {
      setIsLoading(true);
      return;
    }

    if (fetcher?.state === "idle" && fetcher?.data) {
      setIsLoading(false);

      if (fetcher?.data?.action === "print_label") {
        if (fetcher?.data?.status) {
          clearSelectedVariants?.();
          setPrintModal({ open: false, variant: null, isBulk: false });
        }
        return;
      }

      if (fetcher?.data?.action === "fetch_variants") {
        if (fetcher?.data?.error) {
          console.error("Fetch error:", fetcher?.data?.error);
          return;
        }
        setProductVariants(fetcher?.data?.productVariants || []);
        setPageInfo(fetcher?.data?.pageInfo || {});
        setTotalCount(fetcher?.data?.totalCount || 0);
      }
    }
  }, [fetcher?.state, fetcher?.data]);

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
  const isVariantSelected = useCallback(
    (variant) => selectedVariantIds.has(variant.id),
    [selectedVariantIds],
  );

  const handleSelectVariant = useCallback(
    (variant, checked) => {
      onSelectVariants?.([variant], checked ? "add" : "remove");
    },
    [onSelectVariants],
  );

  const handleSelectAll = useCallback(
    (checked) => {
      onSelectVariants?.(displayedVariants, checked ? "add" : "remove");
    },
    [displayedVariants, onSelectVariants],
  );

  const allFullySelected =
    displayedVariants.length > 0 &&
    displayedVariants.every((v) => selectedVariantIds.has(v.id));

  const someSelected =
    !allFullySelected &&
    displayedVariants.some((v) => selectedVariantIds.has(v.id));

  // ── print helpers ────────────────────────────────────────────────────────────
  const submitPrint = useCallback(
    (variants) => {
      if (!selectedTemplate) {
        shopify.toast.show("Please select a label template before printing.");
        return;
      }
      const formData = new FormData();
      formData.append("action", "print_label");
      formData.append(
        "data",
        JSON.stringify({ variants, template: selectedTemplate }),
      );
      fetcher?.submit(formData, { method: "post" });
    },
    [fetcher, selectedTemplate],
  );

  const handlePrintVariant = useCallback(
    (variant) => {
      onSelectVariants?.([variant], "add");
      submitPrint([variant]);
    },
    [onSelectVariants, submitPrint],
  );

  const handleBulkPrint = useCallback(() => {
    if (!selectedVariants?.length) return;
    submitPrint(selectedVariants);
  }, [selectedVariants, submitPrint]);

  const handleLabelQuantity = useCallback((vId, value) => {
    setProductVariants((prevVariants) =>
      prevVariants.map((variant) =>
        variant.id === vId ? { ...variant, label_quantity: value } : variant,
      ),
    );

    setCustomQuantity(value);
  }, []);

  return (
    <s-section padding="none">
      <s-stack gap="small-400" padding="none">
        {/* ── Toolbar ── */}
        <s-box paddingInline="small-200" paddingBlock="small-200">
          <s-grid gridTemplateColumns="repeat(12, 1fr)" gap="large-200">
            <s-grid-item gridColumn="span 10" gridRow="span 1" key="1">
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
                  placeholder="Search by title, vendor, SKU, barcode..."
                />
              ) : (
                <s-stack direction="inline" gap="small" flexWrap="wrap">
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
                      setSelectedVariantIds(new Set());
                      setSelectedVariants([]);
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
                            <s-choice value="asc">A–Z</s-choice>
                            <s-choice value="desc">Z–A</s-choice>
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
        <s-stack
          direction="inline"
          justifyContent="space-between"
          paddingInline="small-100"
        >
          {showFilters && (
            <s-stack direction="inline" gap="small-200">
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

              {(hasActiveFilters || filterType !== "all") && (
                <s-button
                  variant="tertiary"
                  onClick={() => {
                    clearAllFilters();
                    setFilterType("all");
                  }}
                >
                  Clear all
                </s-button>
              )}
            </s-stack>
          )}
          <s-stack direction="inline" justifyContent="end">
            {selectedVariantIds?.size > 0 ? (
              <PDFPrintButton
                documentProps={{
                  variant: displayedVariants?.filter((elm) =>
                    selectedVariantIds.has(elm.id),
                  ),
                  selectedTemplate,
                  testPrint: false,
                  shop:shop
                }}
                buttonText={`Print label for selected`}
                setSelectedVariantIds={setSelectedVariantIds}
                setSelectedVariants={setSelectedVariants}
              />
            ) : (
              <PDFPrintButton
                documentProps={{
                  variant: productVariants,
                  selectedTemplate,
                  testPrint: false,
                  shop:shop
                }}
                buttonText={`Print label for All`}
                setSelectedVariantIds={setSelectedVariantIds}
                setSelectedVariants={setSelectedVariants}
              />
            )}
          </s-stack>
        </s-stack>

        {/* ── Table ── */}
        {displayedVariants.length > 0 ? (
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
              {/* Header */}

              <s-table-header-row>
                <s-table-header>
                  <s-stack direction="inline" gap="base" alignItems="center">
                    <s-checkbox
                      label={
                        selectedVariants?.length
                          ? `${selectedVariants?.length} Selected`
                          : ""
                      }
                      checked={allFullySelected}
                      indeterminate={someSelected}
                      onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                    />
                    <s-heading>Variant</s-heading>
                  </s-stack>
                </s-table-header>

                <s-table-header>Inventory</s-table-header>
                <s-table-header>
                  <s-stack
                    direction="inline"
                    alignItems="center"
                    gap="small-400"
                  >
                    Label count
                    <s-link
                      commandFor="label-count-popover"
                      // onClick={() => setQuantityType("")}
                    >
                      <s-icon type="info" />
                    </s-link>
                  </s-stack>
                  <s-popover id="label-count-popover">
                    <s-box padding="base" style={{ minWidth: "300px" }}>
                      <s-stack gap="small-200">
                        <s-heading>Set print quantity for selected</s-heading>
                        <s-choice-list
                          values={[quantityType]}
                          onChange={(e) => {
                            setQuantityType(e.currentTarget.values?.[0]);
                          }}
                        >
                          <s-choice value="match_inventory">
                            Match Inventory
                          </s-choice>
                          <s-choice value="custom">Custom Quantity</s-choice>
                        </s-choice-list>

                        {quantityType === "custom" && (
                          <s-number-field
                            placeholder="Enter quantity"
                            value={customQuantity}
                            onChange={(e) => {
                              setCustomQuantity(e.target.value);
                            }}
                            onInput={(e) => {
                              setCustomQuantity(e.target.value);
                            }}
                            min={0}
                            step={1}
                            inputMode="numeric"
                          />
                        )}

                        <s-stack justifyContent="end" gap="small-100">
                          <s-button
                            variant="primary"
                            onClick={handleApplyQuantity}
                            command="hide--"
                            commandFor="label-count-popover"
                          >
                            Apply
                          </s-button>
                        </s-stack>
                      </s-stack>
                    </s-box>
                  </s-popover>
                </s-table-header>
                <s-table-header>Actions</s-table-header>
              </s-table-header-row>

              <s-table-body>
                {displayedVariants.map((variant) => {
                  const isSelected = isVariantSelected(variant);
                  const missingBarcode = !variant.barcode;
                  const missingSku = !variant.sku;

                  return (
                    <s-table-row key={variant.id}>
                      {/* Checkbox */}
                      <s-table-cell>
                        <s-stack
                          direction="inline"
                          gap="small"
                          alignItems="center"
                        >
                          <s-checkbox
                            id={`chk-${variant.id}`}
                            checked={isSelected}
                            onChange={(e) =>
                              handleSelectVariant(
                                variant,
                                e.currentTarget.checked,
                              )
                            }
                          />
                          <s-stack
                            direction="inline"
                            gap="small-200"
                            alignItems="center"
                          >
                            <s-thumbnail
                              src={variant.featuredImage}
                              alt={variant.displayName}
                              size="small-100"
                            />
                            <s-stack gap="none">
                              <s-link
                                href={`https://admin.shopify.com/store/pos-app-store-2/products/${variant.productId
                                  ?.split("/")
                                  ?.pop()}/variants/${variant.id
                                  ?.split("/")
                                  ?.pop()}`}
                                target="_blank"
                              >
                                {variant.displayName}
                              </s-link>
                              <s-stack gap="small-100" direction="inline">
                                <s-stack
                                  direction="inline"
                                  alignItems="center"
                                  gap="small-200"
                                >
                                  <s-icon type="barcode" size="small" />
                                  <s-text
                                    tone={missingBarcode ? "critical" : "auto"}
                                  >
                                    {variant.barcode || "-"}
                                  </s-text>
                                </s-stack>
                                <s-stack
                                  direction="inline"
                                  alignItems="center"
                                  gap="small-200"
                                >
                                  <s-icon type="hashtag" size="small" />
                                  <s-text
                                    tone={missingSku ? "critical" : "auto"}
                                  >
                                    {variant.sku || "-"}
                                  </s-text>
                                </s-stack>
                              </s-stack>
                            </s-stack>
                          </s-stack>
                        </s-stack>
                      </s-table-cell>

                      {/* <s-table-cell>
                        <s-stack
                          direction="inline"
                          gap="small-200"
                          alignItems="center"
                        >
                          <s-thumbnail
                            src={variant.featuredImage}
                            alt={variant.displayName}
                            size="small-100"
                          />
                          <s-stack gap="none">
                            <s-link
                              href={`https://admin.shopify.com/store/pos-app-store-2/products/${variant.productId
                                ?.split("/")
                                ?.pop()}/variants/${variant.id
                                ?.split("/")
                                ?.pop()}`}
                              target="_blank"
                            >
                              {variant.displayName}
                            </s-link>
                            <s-stack gap="small-100" direction="inline">
                              <s-stack
                                direction="inline"
                                alignItems="center"
                                gap="small-200"
                              >
                                <s-icon type="barcode" size="small" />
                                <s-text
                                  tone={missingBarcode ? "critical" : "auto"}
                                >
                                  {variant.barcode || "-"}
                                </s-text>
                              </s-stack>
                              <s-stack
                                direction="inline"
                                alignItems="center"
                                gap="small-200"
                              >
                                <s-icon type="hashtag" size="small" />
                                <s-text tone={missingSku ? "critical" : "auto"}>
                                  {variant.sku || "-"}
                                </s-text>
                              </s-stack>
                            </s-stack>
                          </s-stack>
                        </s-stack>
                      </s-table-cell> */}

                      <s-table-cell>
                        <s-text>{variant?.inventoryQuantity}</s-text>
                      </s-table-cell>
                      <s-table-cell>
                        <div style={{ maxWidth: "80px" }}>
                          <s-number-field
                            value={variant.label_quantity}
                            min={0}
                            step={1}
                            inputMode="numeric"
                            onChange={(e) => {
                              handleLabelQuantity(variant.id, e.target.value);
                            }}
                            onInput={(e) => {
                              handleLabelQuantity(variant.id, e.target.value);
                            }}
                          />
                        </div>
                      </s-table-cell>

                      {/* Actions */}
                      <s-table-cell>
                        <s-stack justifyContent="end">
                          {/* <s-button
                            variant="secondary"
                            icon="print"
                            loading={isLoading && isSelected}
                            disabled={!selectedTemplate}
                            onClick={() => handlePrintVariant(variant)}
                          >
                            Print
                          </s-button> */}
                          <PDFPrintButton
                            documentProps={{
                              variant: [variant],
                              selectedTemplate,
                              testPrint: false,
                              shop:shop
                            }}
                            setSelectedVariantIds={setSelectedVariantIds}
                            setSelectedVariants={setSelectedVariants}
                          />
                        </s-stack>
                      </s-table-cell>
                    </s-table-row>
                  );
                })}
              </s-table-body>
            </s-table>
            {/* ── Summary bar ── */}
            {totalCount > 0 && (
              <s-stack alignItems="center" padding="small">
                <s-text tone="subdued">
                  Showing {displayedVariants.length} variant
                  {displayedVariants.length !== 1 ? "s" : ""}
                  {filterType !== "all"
                    ? ` (filtered from ${productVariants.length})`
                    : ""}
                </s-text>
              </s-stack>
            )}
            {/* ── Bottom bulk action bar ── */}
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
                    <s-text fontWeight="bold">{selectedVariantIds.size}</s-text>{" "}
                    variant{selectedVariantIds.size !== 1 ? "s" : ""} selected
                  </s-text>
                  <s-stack direction="inline" gap="small-400">
                    <s-button
                      variant="secondary"
                      onClick={clearSelectedVariants}
                    >
                      Clear selection
                    </s-button>
                    {/* <s-button
                      variant="primary"
                      icon="print"
                      disabled={isLoading}
                      loading={isLoading}
                      onClick={handleBulkPrint}
                    >
                      Print {selectedVariants.length} label
                      {selectedVariants.length !== 1 ? "s" : ""}
                    </s-button> */}
                    <PDFPrintButton
                      documentProps={{
                        variant: displayedVariants?.filter((elm) =>
                          selectedVariantIds.has(elm.id),
                        ),
                        selectedTemplate,
                        testPrint: false,
                        shop:shop
                      }}
                      buttonText={`Print label for selected`}
                      setSelectedVariantIds={setSelectedVariantIds}
                      setSelectedVariants={setSelectedVariants}
                    />
                  </s-stack>
                </s-stack>
              </s-box>
            )}
          </s-box>
        ) : (
          <s-box padding="large" paddingBlockEnd="large-400">
            <s-stack gap="small" alignItems="center">
              <s-icon name="products" size="large" />
              <s-heading>No variants found</s-heading>
              <s-text tone="subdued">
                {filterType !== "all"
                  ? `No variants match the "${filterType}" filter. Try changing or clearing the filter.`
                  : "Try changing the filters or search term."}
              </s-text>
              <s-button
                variant="primary"
                onClick={() => {
                  clearAllFilters();
                  setFilterType("all");
                }}
              >
                Clear filters
              </s-button>
            </s-stack>
          </s-box>
        )}
      </s-stack>
    </s-section>
  );
}
