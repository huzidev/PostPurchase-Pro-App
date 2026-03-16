// Direct fetcher function for Shopify API calls
async function fetcher(body) {
  const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
  const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
  
  const response = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch data from Shopify');
  }

  return response.json();
}

export async function createProductVariants({
  productId,
  variants
}) {
  try {
    // Validate input data
    if (!productId || !variants || variants.length === 0) {
      return { 
        success: false, 
        error: "Product ID and variants array are required" 
      };
    }

    const productVariantsMutation = `
      mutation ProductVariantsCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(productId: $productId, variants: $variants) {
          productVariants {
            id
            title
            selectedOptions {
              name
              value
            }
            price
            compareAtPrice
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variantVariables = {
      productId: productId,
      variants: variants
    };

    const variantsDataJSON = await fetcher({
      query: productVariantsMutation,
      variables: variantVariables,
    });

    console.log("SW what is variantsDataJSON", JSON.stringify(variantsDataJSON, null, 2));

    if (variantsDataJSON.errors) {
      return {
        success: false,
        error: variantsDataJSON.errors[0].message,
        userErrors: variantsDataJSON.errors
      };
    }

    const result = variantsDataJSON.data.productVariantsBulkCreate;

    if (result.userErrors?.length > 0) {
      return {
        success: false,
        error: result.userErrors[0].message,
        userErrors: result.userErrors
      };
    }

    const createdVariants = result.productVariants;

    return { 
      success: true, 
      variants: createdVariants,
      message: `Successfully created ${createdVariants.length} variant(s)`
    };

  } catch (error) {
    console.error("Error creating product variants:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

export async function getProductOptions(productId) {
  try {
    if (!productId) {
      return { 
        success: false, 
        error: "Product ID is required" 
      };
    }

    const getProductQuery = `
      query GetProductOptions($id: ID!) {
        product(id: $id) {
          id
          title
          options {
            id
            name
            values
          }
        }
        locations(first: 10) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;

    const productVariables = {
      id: productId
    };

    const productDataJSON = await fetcher({
      query: getProductQuery,
      variables: productVariables,
    });

    if (productDataJSON.errors) {
      return {
        success: false,
        error: productDataJSON.errors[0].message
      };
    }

    const product = productDataJSON.data.product;
    const locations = productDataJSON.data.locations;
    
    console.log("SW what is product", JSON.stringify(product, null, 2));
    console.log("SW what is locations", JSON.stringify(locations, null, 2));

    if (!product) {
      return {
        success: false,
        error: "Product not found"
      };
    }

    return { 
      success: true, 
      product: product,
      locations: locations,
      message: `Successfully fetched product: ${product.title}`
    };

  } catch (error) {
    console.error("Error fetching product:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

export async function getActiveProducts(cursor = null) {
  try {
    const getProductsQuery = `
      query GetActiveProducts($cursor: String) {
        products(
          first: 20
          after: $cursor
          query: "status:active"
        ) {
          edges {
            cursor
            node {
              id
              title
              status

              options {
                id
                name
                values
              }

              variants(first: 100) {
                nodes {
                  id
                  title
                  price
                  compareAtPrice
                  selectedOptions {
                    name
                    value
                  }
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const productsVariables = {
      cursor: cursor
    };

    const productsDataJSON = await fetcher({
      query: getProductsQuery,
      variables: productsVariables,
    });

    if (productsDataJSON.errors) {
      return {
        success: false,
        error: productsDataJSON.errors[0].message
      };
    }

    const productsData = productsDataJSON.data.products;
    
    console.log("SW fetched products", JSON.stringify(productsData, null, 2));

    return { 
      success: true, 
      products: productsData.edges.map(edge => edge.node),
      pageInfo: productsData.pageInfo,
      message: `Successfully fetched ${productsData.edges.length} product(s)`
    };

  } catch (error) {
    console.error("Error fetching products:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}
