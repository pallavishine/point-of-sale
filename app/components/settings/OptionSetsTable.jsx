import { PRODUCT_SELECTION_TYPES } from "../../utils/optionSetHelpers";
import { useEffect, useState } from "react";

export function OptionSetsTable({ optionSets, onEdit, handleDelete, handleBulkDelete, onCreateNew }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  useEffect(() => {
    setSelectedIds([]);
  }, [optionSets, searchTerm]);
  
  const filtered = optionSets.filter((o) =>
    o.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const allSelected = filtered.length > 0 && selectedIds.length > 0 && selectedIds.length === filtered.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filtered.length;
  
  const toggleAll = () =>
    setSelectedIds(allSelected ? [] : filtered.map((o) => o._id));
  
  const toggleRow = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  const confirmBulkDelete = () => {
    handleBulkDelete(selectedIds);
    setSelectedIds([]);
    shopify.modal.hide("bulk-delete-modal");
  };
  
  const confirmDelete = () => {
    handleDelete(deleteId);
    setDeleteId(null);
    shopify.modal.hide("delete-modal");
  };

  const getSelectionLabel = (type) =>
    PRODUCT_SELECTION_TYPES.find((t) => t.value === type)?.label ?? "All Products";

  if (!filtered.length && !searchTerm) {
    return (
      <s-section>
        <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
          <s-box maxInlineSize="200px">
            <s-image
              aspectRatio="1/0.5"
              src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
            />
          </s-box>
          <s-grid justifyItems="center" maxInlineSize="450px" gap="base">
            <s-stack alignItems="center">
              <s-heading>No option sets yet</s-heading>
              <s-paragraph>
                Create your first option set to get started.
              </s-paragraph>
            </s-stack>
            <s-button variant="primary" onClick={onCreateNew}>
              + Create Option Set
            </s-button>
          </s-grid>
        </s-grid>
      </s-section>
    );
  }

  return (
    <s-section padding="none">
      <s-table>
        {selectedIds.length === 0 ? (
          <s-grid slot="filters" gap="small-200" gridTemplateColumns="1fr auto">
            <s-text-field
              label="Search"
              labelAccessibilityVisibility="exclusive"
              icon="search"
              placeholder="Search by name..."
              value={searchTerm}
              onInput={(e) => setSearchTerm(e.target.value)}
            />
          </s-grid>
        ) : (
          <s-box slot="filters" padding="small" background="strong">
            <s-stack
              direction="inline"
              gap="base"
              alignItems="center"
              justifyContent="space-between"
            >
              <s-text fontWeight="semibold">
                {selectedIds.length} of {filtered.length} selected
              </s-text>
              <s-button
                variant="secondary"
                commandFor="bulk-delete-modal"
                command="--show"
              >
                Delete Selected
              </s-button>
            </s-stack>
          </s-box>
        )}

        <s-table-header-row>
          <s-table-header listSlot="primary">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={toggleAll}
              />
              <s-text>Name</s-text>
            </s-stack>
          </s-table-header>
          <s-table-header>Target</s-table-header>
          <s-table-header>Products</s-table-header>
          <s-table-header>Status</s-table-header>
          <s-table-header>Actions</s-table-header>
        </s-table-header-row>

        <s-table-body>
          {filtered.map((o) => (
            <s-table-row key={o._id} selected={selectedIds.includes(o._id)}>
              <s-table-cell>
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-checkbox
                    checked={selectedIds.includes(o._id)}
                    onChange={() => toggleRow(o._id)}
                  />
                  <s-link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onEdit(o);
                    }}
                  >
                    {o.name}
                  </s-link>
                </s-stack>
              </s-table-cell>
              <s-table-cell>
                <s-badge>{o.target === "cart" ? "Cart" : "Product"}</s-badge>
              </s-table-cell>
              <s-table-cell>
                <s-text size="small">
                  {getSelectionLabel(o.products?.type)}
                </s-text>
              </s-table-cell>
              <s-table-cell>
                <s-badge tone={o.status === "active" ? "success" : "neutral"}>
                  {o.status === "active" ? "Active" : "Inactive"}
                </s-badge>
              </s-table-cell>
              <s-table-cell>
                <s-stack direction="inline" gap="small">
                  <s-button
                    variant="tertiary"
                    icon="edit"
                    accessibilityLabel="icon"
                    onClick={() => onEdit(o)}
                  />
                  <s-button
                    accessibilityLabel="delete"
                    tone="critical"
                    variant="tertiary"
                    icon="delete"
                    commandFor="delete-modal"
                    command="--show"
                    onClick={() => setDeleteId(o._id)}
                  />
                </s-stack>
              </s-table-cell>
            </s-table-row>
          ))}
        </s-table-body>
      </s-table>

      <s-modal
        id="bulk-delete-modal"
        heading={`Delete ${selectedIds.length} option set(s)?`}
        accessibilityLabel="Modal"
      >
        <s-text>This action cannot be undone.</s-text>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          commandFor="bulk-delete-modal"
          command="--hide"
          onClick={confirmBulkDelete}
        >
          Delete
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="bulk-delete-modal"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>

      <s-modal
        id="delete-modal"
        heading="Delete option set?"
        accessibilityLabel="modal"
      >
        <s-text>This action cannot be undone.</s-text>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          commandFor="delete-modal"
          command="--hide"
          onClick={confirmDelete}
        >
          Delete
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="delete-modal"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
    </s-section>
  );
}