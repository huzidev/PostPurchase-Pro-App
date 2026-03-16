async function executeAdminGraphql(admin, query, variables) {
  if (!admin) {
    throw new Error("Shopify admin client is required");
  }

  const response = await admin.graphql(query, { variables });

  return response.json();
}

export async function createProductVariants(admin, {
  productId,
  variants
}) {
  try {
    if (!productId || !variants?.length) {
      return {
        success: false,
        error: "Product ID and variants are required"
      };
    }

    const mutation = `
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

    const data = await executeAdminGraphql(admin, mutation, {
      productId,
      variants
    });

    console.log("Variants response:", JSON.stringify(data, null, 2));

    if (data.errors) {
      return {
        success: false,
        error: data.errors[0].message,
        userErrors: data.errors
      };
    }

    const result = data.data.productVariantsBulkCreate;

    if (result.userErrors?.length) {
      return {
        success: false,
        error: result.userErrors[0].message,
        userErrors: result.userErrors
      };
    }

    return {
      success: true,
      variants: result.productVariants,
      message: `Created ${result.productVariants.length} variants`
    };

  } catch (error) {
    console.error("Variant creation error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getProductOptions(admin, productId) {
  try {
    if (!productId) {
      return {
        success: false,
        error: "Product ID is required"
      };
    }

    const query = `
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

    const data = await executeAdminGraphql(admin, query, {
      id: productId
    });

    if (data.errors) {
      return {
        success: false,
        error: data.errors[0].message
      };
    }

    const product = data.data.product;
    const locations = data.data.locations;
    
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
      product,
      locations,
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

export async function getActiveProducts(admin, cursor = null) {
  try {
    const query = `
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

    const data = await executeAdminGraphql(admin, query, {
      cursor: cursor
    });

    if (data.errors) {
      return {
        success: false,
        error: data.errors[0].message
      };
    }

    const productsData = data.data.products;
    
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
