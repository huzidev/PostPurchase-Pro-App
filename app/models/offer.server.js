import db from "../db.server";

export default class Offer {
  constructor(shopify_url) {
    this.shopify_url = shopify_url;
  }

  // Create a new offer
  async createOffer(offerData) {
    try {
      const { products, purchasedProducts, ...offerInfo } = offerData;
      
      // First, create the basic offer without relationships
      const offer = await db.offer.create({
        data: {
          shopify_url: this.shopify_url,
          name: offerInfo.name,
          description: offerInfo.description,
          status: offerInfo.status || 'active',
          discount_type: offerInfo.discountType,
          discount_value: parseFloat(offerInfo.discountValue),
          offer_title: offerInfo.offerTitle,
          offer_description: offerInfo.offerDescription,
          button_text: offerInfo.buttonText || 'Add to Order',
          limit_per_customer: parseInt(offerInfo.limitPerCustomer) || 1,
          total_limit: offerInfo.totalLimit ? parseInt(offerInfo.totalLimit) : null,
          expiry_date: offerInfo.expiryDate ? new Date(offerInfo.expiryDate) : null,
          schedule_start: offerInfo.scheduleStart ? new Date(offerInfo.scheduleStart) : null,
          enable_ab_test: offerInfo.enableABTest || false,
        },
      });

      // Create products relationship
      if (products && products.length > 0) {
        await db.offerProduct.createMany({
          data: products.map(product => ({
            offer_id: offer.id,
            shopify_product_id: product.id,
            shopify_variant_id: product.variantId || null,
            product_title: product.title,
            variant_title: product.variantTitle || null,
            product_price: product.price || '0',
            variant_price: product.variantPrice || null,
            image_url: product.imageUrl,
            variants_count: product.variantsCount || 1,
          })),
        });
      }

      // Try to create purchasedProducts relationship if the table exists
      if (purchasedProducts && purchasedProducts.length > 0) {
        try {
          await db.purchasedProduct.createMany({
            data: purchasedProducts.map(product => ({
              offer_id: offer.id,
              shopify_product_id: product.id,
              shopify_variant_id: product.variantId || null,
              product_title: product.title,
              variant_title: product.variantTitle || null,
              product_price: product.price || '0',
              variant_price: product.variantPrice || null,
              image_url: product.imageUrl,
              variants_count: product.variantsCount || 1,
            })),
          });
        } catch (error) {
          console.warn("Could not create purchased products - table may not exist yet:", error.message);
          // Continue without purchased products for now
        }
      }

      // Return the offer with relationships if available
      const offerWithRelations = await db.offer.findUnique({
        where: { id: offer.id },
        include: {
          products: true,
          ...(await this.checkIfPurchasedProductsExists() ? { purchasedProducts: true } : {}),
        },
      });

      return {
        status: 200,
        message: "Offer created successfully",
        offer: offerWithRelations || offer,
      };
    } catch (error) {
      console.error("Error creating offer:", error);
      return {
        status: 500,
        message: "Failed to create offer",
        error: error.message,
      };
    }
  }

  // Get all offers for the shop
  async getOffers() {
    try {
      const offers = await db.offer.findMany({
        where: {
          shopify_url: this.shopify_url,
        },
        include: {
          products: true,
          purchasedProducts: true,
          analytics: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 200,
        message: "Offers fetched successfully",
        offers,
      };
    } catch (error) {
      console.error("Error fetching offers:", error);
      return {
        status: 500,
        message: "Failed to fetch offers",
        error: error.message,
      };
    }
  }

  // Get a single offer by ID
  async getOffer(offerId) {
    try {
      const offer = await db.offer.findFirst({
        where: {
          id: offerId,
          shopify_url: this.shopify_url,
        },
        include: {
          products: true,
          purchasedProducts: true,
          analytics: true,
        },
      });

      if (!offer) {
        return {
          status: 404,
          message: "Offer not found",
        };
      }

      return {
        status: 200,
        message: "Offer fetched successfully",
        offer,
      };
    } catch (error) {
      console.error("Error fetching offer:", error);
      return {
        status: 500,
        message: "Failed to fetch offer",
        error: error.message,
      };
    }
  }

  // Update an existing offer
  async updateOffer(offerId, offerData) {
    try {
      const { products, purchasedProducts, ...offerInfo } = offerData;

      // First, delete existing products
      await db.offerProduct.deleteMany({
        where: {
          offer_id: offerId,
        },
      });
      
      // Try to delete existing purchased products if the table exists
      try {
        await db.purchasedProduct.deleteMany({
          where: {
            offer_id: offerId,
          },
        });
      } catch (error) {
        console.warn("Could not delete purchased products - table may not exist yet:", error.message);
      }

      // Update the offer with new data
      const offer = await db.offer.update({
        where: {
          id: offerId,
        },
        data: {
          name: offerInfo.name,
          description: offerInfo.description,
          status: offerInfo.status,
          discount_type: offerInfo.discountType,
          discount_value: parseFloat(offerInfo.discountValue),
          offer_title: offerInfo.offerTitle,
          offer_description: offerInfo.offerDescription,
          button_text: offerInfo.buttonText,
          limit_per_customer: parseInt(offerInfo.limitPerCustomer) || 1,
          total_limit: offerInfo.totalLimit ? parseInt(offerInfo.totalLimit) : null,
          expiry_date: offerInfo.expiryDate ? new Date(offerInfo.expiryDate) : null,
          schedule_start: offerInfo.scheduleStart ? new Date(offerInfo.scheduleStart) : null,
          enable_ab_test: offerInfo.enableABTest || false,
        },
      });

      // Create new products
      if (products && products.length > 0) {
        await db.offerProduct.createMany({
          data: products.map(product => ({
            offer_id: offerId,
            shopify_product_id: product.id,
            shopify_variant_id: product.variantId || null,
            product_title: product.title,
            variant_title: product.variantTitle || null,
            product_price: product.price || '0',
            variant_price: product.variantPrice || null,
            image_url: product.imageUrl,
            variants_count: product.variantsCount || 1,
          })),
        });
      }

      // Try to create new purchased products if the table exists
      if (purchasedProducts && purchasedProducts.length > 0) {
        try {
          await db.purchasedProduct.createMany({
            data: purchasedProducts.map(product => ({
              offer_id: offerId,
              shopify_product_id: product.id,
              shopify_variant_id: product.variantId || null,
              product_title: product.title,
              variant_title: product.variantTitle || null,
              product_price: product.price || '0',
              variant_price: product.variantPrice || null,
              image_url: product.imageUrl,
              variants_count: product.variantsCount || 1,
            })),
          });
        } catch (error) {
          console.warn("Could not create purchased products - table may not exist yet:", error.message);
        }
      }

      // Return the offer with relationships if available
      const offerWithRelations = await db.offer.findUnique({
        where: { id: offerId },
        include: {
          products: true,
          ...(await this.checkIfPurchasedProductsExists() ? { purchasedProducts: true } : {}),
        },
      });

      return {
        status: 200,
        message: "Offer updated successfully",
        offer: offerWithRelations || offer,
      };
    } catch (error) {
      console.error("Error updating offer:", error);
      return {
        status: 500,
        message: "Failed to update offer",
        error: error.message,
      };
    }
  }

  // Delete an offer
  async deleteOffer(offerId) {
    try {
      await db.offer.delete({
        where: {
          id: offerId,
        },
      });

      return {
        status: 200,
        message: "Offer deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting offer:", error);
      return {
        status: 500,
        message: "Failed to delete offer",
        error: error.message,
      };
    }
  }

  // Check if user has offers (for dashboard)
  async hasOffers() {
    try {
      const count = await db.offer.count({
        where: {
          shopify_url: this.shopify_url,
        },
      });

      return count > 0;
    } catch (error) {
      console.error("Error checking offers:", error);
      return false;
    }
  }

  // Update offer status (active/paused)
  async updateOfferStatus(offerId, status) {
    try {
      // Validate status
      const validStatuses = ['active', 'paused', 'draft'];
      if (!validStatuses.includes(status)) {
        return {
          status: 400,
          message: "Invalid status. Must be 'active', 'paused', or 'draft'",
        };
      }

      const offer = await db.offer.update({
        where: {
          id: offerId,
          shopify_url: this.shopify_url,
        },
        data: {
          status: status,
          updatedAt: new Date(),
        },
      });

      return {
        status: 200,
        message: "Offer status updated successfully",
        offer,
      };
    } catch (error) {
      console.error("Error updating offer status:", error);
      
      if (error.code === 'P2025') {
        return {
          status: 404,
          message: "Offer not found",
        };
      }
      
      return {
        status: 500,
        message: "Failed to update offer status",
        error: error.message,
      };
    }
  }

  // Get offers by purchased product ID (for post-purchase extension)
  async getOffersByPurchasedProduct(productId, variantId = null) {
    try {
      const offers = await db.offer.findMany({
        where: {
          shopify_url: this.shopify_url,
          status: 'active', // Only return active offers
          AND: [
            {
              OR: [
                { expiry_date: null }, // No expiry date
                { expiry_date: { gte: new Date() } } // Not expired
              ]
            },
            {
              OR: [
                { schedule_start: null }, // No schedule
                { schedule_start: { lte: new Date() } } // Already started
              ]
            }
          ],
          purchasedProducts: {
            some: {
              OR: [
                // Try GID format
                {
                  shopify_product_id: String(productId),
                  ...(variantId && { shopify_variant_id: String(variantId) })
                },
                // Try numeric format (extract from GID if it's stored as GID)
                {
                  shopify_product_id: {
                    endsWith: `/${productId}`
                  },
                  ...(variantId && { 
                    shopify_variant_id: {
                      endsWith: `/${variantId}`
                    }
                  })
                }
              ]
            }
          }
        },
        include: {
          products: true,
          purchasedProducts: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 200,
        message: "Offers fetched successfully",
        offers,
      };
    } catch (error) {
      console.error("Error fetching offers by trigger product:", error);
      return {
        status: 500,
        message: "Failed to fetch offers",
        error: error.message,
      };
    }
  }

  // Helper method to check if purchasedProduct table exists
  async checkIfPurchasedProductsExists() {
    try {
      await db.purchasedProduct.findFirst();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get count of active offers for subscription limits checking
  async getActiveOfferCount() {
    try {
      const count = await db.offer.count({
        where: {
          shopify_url: this.shopify_url,
          status: 'active',
        },
      });

      return count;
    } catch (error) {
      console.error("Error getting active offer count:", error);
      return 0;
    }
  }

  // Get all offers for analytics
  async getAllOffers() {
    try {
      const offers = await db.offer.findMany({
        where: {
          shopify_url: this.shopify_url,
        },
        include: {
          products: true,
          purchasedProducts: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 200,
        message: "Offers fetched successfully",
        offers,
      };
    } catch (error) {
      console.error("Error fetching all offers:", error);
      return {
        status: 500,
        message: "Failed to fetch offers",
        error: error.message,
      };
    }
  }
}


// Post Purchase Extension Code
const OFFERS = [
  {
    id: 1,
    title: "One time offer",
    productTitle: "The S-Series Snowboard",
    productImageURL:
      "https://cdn.shopify.com/s/files/1/0", // Replace this with the product image's URL.
    productDescription: ["This PREMIUM snowboard is so SUPER DUPER awesome!"],
    originalPrice: "699.95",
    discountedPrice: "699.95",
    changes: [
      {
        type: "add_variant",
        variantID: 123456789, // Replace with the variant ID.
        quantity: 1,
        discount: {
          value: 15,
          valueType: "percentage",
          title: "15% off",
        },
      },
    ],
  },
];

/*
 * For testing purposes, product information is hardcoded.
 * In a production application, replace this function with logic to determine
 * what product to offer to the customer.
 */
export function getOffers() {
  return OFFERS;
}

/*
 * Retrieve discount information for the specific order on the backend instead of relying
 * on the discount information that is sent from the frontend.
 * This is to ensure that the discount information is not tampered with.
 */
export function getSelectedOffer(offerId) {
  return OFFERS.find((offer) => offer.id === offerId);
}

// Add to the Offer class - this method should be inside the class
// The following method should be added to the Offer class above