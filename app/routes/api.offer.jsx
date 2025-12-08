import { authenticate } from "../shopify.server";
import Offer from "../models/offer.server";

// The loader responds to preflight requests from Shopify
export const loader = async ({ request }) => {
  try {
    const { cors } = await authenticate.public.checkout(request);
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    const variantId = url.searchParams.get("variantId");
    const shopDomain = url.searchParams.get("shop");

    if (!productId || !shopDomain) {
      return cors({
        status: 400,
        message: "Product ID and shop domain are required",
        offers: [],
      });
    }

      const offerService = new Offer(shopDomain);
      const result = await offerService.getOffersByProduct(productId, variantId);    return cors({
      status: result.status,
      message: result.message,
      offers: result.offers || [],
    });
  } catch (error) {
    console.error("Error in offer API loader:", error);
    const { cors } = await authenticate.public.checkout(request);
    return cors({
      status: 500,
      message: "Internal server error",
      error: error.message,
      offers: [],
    });
  }
};

// The action responds to the POST request from the extension. Make sure to use the cors helper for the request to work.
export const action = async ({ request }) => {
  try {
    const { cors } = await authenticate.public.checkout(request);
    const body = await request.json();
    
    // Handle different types of requests based on the body content
    if (body.referenceId) {
      // Legacy support for hardcoded offers or custom logic based on referenceId
      const { getOffers } = await import("../models/offer.server");
      const offers = getOffers();
      return cors({ offers });
    } else if (body.productId && body.shopDomain) {
      // New functionality: get offers by product
      const offerService = new Offer(body.shopDomain);
      const result = await offerService.getOffersByProduct(body.productId, body.variantId);
      
      return cors({
        status: result.status,
        message: result.message,
        offers: result.offers || [],
      });
    } else {
      return cors({
        status: 400,
        message: "Invalid request body",
        offers: [],
      });
    }
  } catch (error) {
    console.error("Error in offer API action:", error);
    const { cors } = await authenticate.public.checkout(request);
    return cors({
      status: 500,
      message: "Internal server error",
      error: error.message,
      offers: [],
    });
  }
};