export const VERIFY_PRODUCT_VARIANT = `#graphql
query productVariantById($id: ID!) {
  productVariant(id: $id) {
    id
    title
    price
    sku
    barcode
    media(first: 1) {
      nodes {
        preview {
          image {
            url
          }
        }
      }
    }
    compareAtPrice
    createdAt
    availableForSale
    displayName
    updatedAt
    showUnitPrice
    sellableOnlineQuantity
    sellingPlanGroupsCount {
      count
      precision
    }
    taxable
    requiresComponents
    inventoryQuantity
    inventoryPolicy
    legacyResourceId
    inventoryItem {
      sku
      tracked
      updatedAt
      id
      countryCodeOfOrigin
      createdAt
      requiresShipping
    }
    product {
      id
      title
      media(first: 1) {
        nodes {
          preview {
            image {
              url
            }
          }
        }
      }
      descriptionHtml
    }
  }
}
`;

export const GET_PRODUCTS_QUERY = `#graphql
query GetProducts($first: Int, $last:Int, $query: String,
 $after: String, $before: String,  
# $sortKey: ProductSortKeys!, $reverse: Boolean!
) {
  products(first: $first,last:$last, query: $query,
   after: $after, before: $before,  
  # sortKey: $sortKey, reverse: $reverse
  ) {
    edges {
      node {
        id
        title
        handle
        status
        productType
        vendor
        priceRangeV2 {
            minVariantPrice {
              currencyCode
               amount
                  }
        }
        media(first: 1) {
            nodes {
              preview {
                image {
                  url
                }
              }
            }
          }
        variants(first: 100) {
          edges {
            node {
              id
              title
              displayName
              sku
              barcode
              price
              inventoryQuantity
              media(first: 1) {
      nodes {
        preview {
          image {
            url
          }
        }
      }
    }
            }
          }
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    
  }
}`;
export const GET_PRODUCT_VARIANTS_QUERY = `#graphql
query productVariants($first: Int, $last: Int, $query: String, $after: String, $before: String) {
  productVariants(first: $first,last:$last, query: $query,
   after: $after, before: $before, ) {
    nodes {
      id
      title
      sku
      barcode
      price
      compareAtPrice
      inventoryQuantity
      product{
        id
        status
        title
        handle
        descriptionHtml
        tags
        vendor
      }
      media(first: 1) {
        nodes {
          preview {
            image {
              url
            }
          }
        }
      }
      displayName
    }
    pageInfo {
      hasNextPage
      endCursor
      hasPreviousPage
      startCursor
    }
  }
}`;

export const GET_COLLECTIONS_QUERY = `#graphql 
query getCollections {
  collections(first:200){
    nodes{
      id
      title
      handle
    }
  }
  }`;
export const GET_PRODUCTTYPES_QUERY = `#graphql 
query productTypes {
  productTypes(first: 200) {
    edges {
      node
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;


export const CUSTOMER_SEARCH_QUERY = `#graphql
  query SearchCustomers($query: String!) {
    customers(first: 5, query: $query) {
      edges { node { id firstName lastName email phone } }
    }
  }
`;



export const PRODUCT_SEARCH_QUERY = `#graphql
  query SearchProducts($query: String!) {
    products(first: 10, query: $query) {
      edges {
        node {
          id title vendor
          variants(first: 5) {
            edges {
              node {
                id title price sku
                
              }
            }
          }
        }
      }
    }
  }
`;
