export default class Product {
  constructor(shopify_url, graphql) {
    this.shopify_url = shopify_url;
    this.graphql = graphql;
  }

  // Get products using GraphQL
  async getProducts(first = 50, after = null) {
    try {
      const query = `
        query getProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                title
                handle
                status
                totalInventory
                vendor
                productType
                tags
                createdAt
                updatedAt
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      id
                      url
                      altText
                    }
                  }
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
                      title
                      price
                      compareAtPrice
                      inventoryQuantity
                      availableForSale
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
        }
      `;

      const variables = {
        first,
        after,
      };

      const response = await this.graphql(query, { variables });
      const result = await response.json();

      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        return {
          status: 400,
          message: "Failed to fetch products",
          errors: result.errors,
        };
      }

      // Transform the data to a more usable format
      const products = result.data.products.edges.map(({ node }) => ({
        id: node.id,
        title: node.title,
        handle: node.handle,
        status: node.status,
        vendor: node.vendor,
        productType: node.productType,
        tags: node.tags,
        totalInventory: node.totalInventory,
        price: {
          min: node.priceRangeV2.minVariantPrice.amount,
          max: node.priceRangeV2.maxVariantPrice.amount,
          currency: node.priceRangeV2.minVariantPrice.currencyCode,
        },
        imageUrl: node.images.edges.length > 0 ? node.images.edges[0].node.url : null,
        imageAlt: node.images.edges.length > 0 ? node.images.edges[0].node.altText : null,
        variants: node.variants.edges.map(({ node: variant }) => ({
          id: variant.id,
          title: variant.title,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          inventoryQuantity: variant.inventoryQuantity,
          availableForSale: variant.availableForSale,
        })),
        variantsCount: node.variants.edges.length,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      }));

      return {
        status: 200,
        message: "Products fetched successfully",
        products,
        pageInfo: result.data.products.pageInfo,
      };

    } catch (error) {
      console.error("Error fetching products:", error);
      return {
        status: 500,
        message: "Failed to fetch products",
        error: error.message,
      };
    }
  }

  // Get a single product by ID
  async getProduct(productId) {
    try {
      const query = `
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            handle
            status
            totalInventory
            vendor
            productType
            tags
            description
            descriptionHtml
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 10) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  price
                  compareAtPrice
                  inventoryQuantity
                  availableForSale
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      `;

      const variables = { id: productId };

      const response = await this.graphql(query, { variables });
      const result = await response.json();

      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        return {
          status: 400,
          message: "Failed to fetch product",
          errors: result.errors,
        };
      }

      if (!result.data.product) {
        return {
          status: 404,
          message: "Product not found",
        };
      }

      const product = result.data.product;
      
      return {
        status: 200,
        message: "Product fetched successfully",
        product: {
          id: product.id,
          title: product.title,
          handle: product.handle,
          status: product.status,
          vendor: product.vendor,
          productType: product.productType,
          tags: product.tags,
          description: product.description,
          descriptionHtml: product.descriptionHtml,
          totalInventory: product.totalInventory,
          price: {
            min: product.priceRangeV2.minVariantPrice.amount,
            max: product.priceRangeV2.maxVariantPrice.amount,
            currency: product.priceRangeV2.minVariantPrice.currencyCode,
          },
          images: product.images.edges.map(({ node }) => ({
            id: node.id,
            url: node.url,
            altText: node.altText,
          })),
          variants: product.variants.edges.map(({ node }) => ({
            id: node.id,
            title: node.title,
            price: node.price,
            compareAtPrice: node.compareAtPrice,
            inventoryQuantity: node.inventoryQuantity,
            availableForSale: node.availableForSale,
            selectedOptions: node.selectedOptions,
          })),
        },
      };

    } catch (error) {
      console.error("Error fetching product:", error);
      return {
        status: 500,
        message: "Failed to fetch product",
        error: error.message,
      };
    }
  }

  // Search products
  async searchProducts(query, first = 20, after = null) {
    try {
      const searchQuery = `
        query searchProducts($query: String!, $first: Int!, $after: String) {
          products(query: $query, first: $first, after: $after) {
            edges {
              node {
                id
                title
                handle
                status
                vendor
                productType
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      url
                      altText
                    }
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      id
                      price
                      inventoryQuantity
                      availableForSale
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

      const variables = {
        query,
        first,
        after,
      };

      const response = await this.graphql(searchQuery, { variables });
      const result = await response.json();

      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        return {
          status: 400,
          message: "Failed to search products",
          errors: result.errors,
        };
      }

      const products = result.data.products.edges.map(({ node }) => ({
        id: node.id,
        title: node.title,
        handle: node.handle,
        status: node.status,
        vendor: node.vendor,
        productType: node.productType,
        price: {
          amount: node.priceRangeV2.minVariantPrice.amount,
          currency: node.priceRangeV2.minVariantPrice.currencyCode,
        },
        imageUrl: node.images.edges.length > 0 ? node.images.edges[0].node.url : null,
        inventoryQuantity: node.variants.edges.length > 0 ? node.variants.edges[0].node.inventoryQuantity : 0,
        availableForSale: node.variants.edges.length > 0 ? node.variants.edges[0].node.availableForSale : false,
      }));

      return {
        status: 200,
        message: "Products searched successfully",
        products,
        pageInfo: result.data.products.pageInfo,
      };

    } catch (error) {
      console.error("Error searching products:", error);
      return {
        status: 500,
        message: "Failed to search products",
        error: error.message,
      };
    }
  }
}