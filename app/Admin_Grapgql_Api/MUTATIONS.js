export const PRODUCT_VARIANTS_BULK_UPDATE = `#graphql 
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                  productVariants {
                    id
                    barcode
                    sku
                    title
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }`;
export const CREATE_CUSTOMER_MUTATION = `#graphql
mutation CreateCustomer($input: CustomerInput!) {
  customerCreate(input: $input) {
    customer { id firstName lastName email phone }
    userErrors { field message }
  }
}
`;
