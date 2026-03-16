export default class VariantCreate {
  constructor(graphql) {
    this.graphql = graphql;
  }

  async createProductVariants({ productId, variants }) {
    try {
      if (!productId || !variants || variants.length === 0) {
        return {
          success: false,
          error: "Product ID and variants array are required",
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

      const response = await this.graphql(productVariantsMutation, {
        variables: { productId, variants },
      });
      const variantsDataJSON = await response.json();

      console.log("SW what is variantsDataJSON", JSON.stringify(variantsDataJSON, null, 2));

      if (variantsDataJSON.errors) {
        return {
          success: false,
          error: variantsDataJSON.errors[0].message,
          userErrors: variantsDataJSON.errors,
        };
      }

      const result = variantsDataJSON.data.productVariantsBulkCreate;

      if (result.userErrors?.length > 0) {
        return {
          success: false,
          error: result.userErrors[0].message,
          userErrors: result.userErrors,
        };
      }

      const createdVariants = result.productVariants;

      return {
        success: true,
        variants: createdVariants,
        message: `Successfully created ${createdVariants.length} variant(s)`,
      };
    } catch (error) {
      console.error("Error creating product variants:", error);
      return { success: false, error: error.message };
    }
  }

  async getProductOptions(productId) {
    try {
      if (!productId) {
        return { success: false, error: "Product ID is required" };
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

      const response = await this.graphql(getProductQuery, {
        variables: { id: productId },
      });
      const productDataJSON = await response.json();

      if (productDataJSON.errors) {
        return {
          success: false,
          error: productDataJSON.errors[0].message,
        };
      }

      const product = productDataJSON.data.product;
      const locations = productDataJSON.data.locations;

      console.log("SW what is product", JSON.stringify(product, null, 2));
      console.log("SW what is locations", JSON.stringify(locations, null, 2));

      if (!product) {
        return { success: false, error: "Product not found" };
      }

      return {
        success: true,
        product,
        locations,
        message: `Successfully fetched product: ${product.title}`,
      };
    } catch (error) {
      console.error("Error fetching product:", error);
      return { success: false, error: error.message };
    }
  }

  async getActiveProducts(cursor = null) {
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

      const response = await this.graphql(getProductsQuery, {
        variables: { cursor },
      });
      const productsDataJSON = await response.json();

      if (productsDataJSON.errors) {
        return {
          success: false,
          error: productsDataJSON.errors[0].message,
        };
      }

      const productsData = productsDataJSON.data.products;

      console.log("SW fetched products", JSON.stringify(productsData, null, 2));

      return {
        success: true,
        products: productsData.edges.map((edge) => edge.node),
        pageInfo: productsData.pageInfo,
        message: `Successfully fetched ${productsData.edges.length} product(s)`,
      };
    } catch (error) {
      console.error("Error fetching products:", error);
      return { success: false, error: error.message };
    }
  }
}
