import { authenticate } from "../shopify.server";
import Offer from "../models/offer.server";

// The loader responds to preflight requests from Shopify
// export const loader = async ({ request }) => {
//   try {
//     const { cors } = await authenticate.public.checkout(request);
//     const url = new URL(request.url);
//     const productId = url.searchParams.get("productId");
//     const variantId = url.searchParams.get("variantId");
//     const shopDomain = url.searchParams.get("shop");

//     if (!productId || !shopDomain) {
//       return cors({
//         status: 400,
//         message: "Product ID and shop domain are required",
//         offers: [],
//       });
//     }

//       const offerService = new Offer(shopDomain);
//       const result = await offerService.getOffersByProduct(productId, variantId);    return cors({
//       status: result.status,
//       message: result.message,
//       offers: result.offers || [],
//     });
//   } catch (error) {
//     console.error("Error in offer API loader:", error);
//     const { cors } = await authenticate.public.checkout(request);
//     return cors({
//       status: 500,
//       message: "Internal server error",
//       error: error.message,
//       offers: [],
//     });
//   }
// };

// // The action responds to the POST request from the extension. Make sure to use the cors helper for the request to work.
// export const action = async ({ request }) => {
//   try {
//     const { cors } = await authenticate.public.checkout(request);
//     const body = await request.json();
    
//     // Handle different types of requests based on the body content
//     if (body.referenceId) {
//       // Legacy support for hardcoded offers or custom logic based on referenceId
//       const { getOffers } = await import("../models/offer.server");
//       const offers = getOffers();
//       return cors({ offers });
//     } else if (body.productId && body.shopDomain) {
//       // New functionality: get offers by product
//       const offerService = new Offer(body.shopDomain);
//       const result = await offerService.getOffersByProduct(body.productId, body.variantId);
      
//       return cors({
//         status: result.status,
//         message: result.message,
//         offers: result.offers || [],
//       });
//     } else {
//       return cors({
//         status: 400,
//         message: "Invalid request body",
//         offers: [],
//       });
//     }
//   } catch (error) {
//     console.error("Error in offer API action:", error);
//     const { cors } = await authenticate.public.checkout(request);
//     return cors({
//       status: 500,
//       message: "Internal server error",
//       error: error.message,
//       offers: [],
//     });
//   }
// };


export const loader = async ({ request }) => {
  try {
    // ---------------------------
    // 1. Handle CORS PREFLIGHT
    // ---------------------------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "https://cdn.shopify.com",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
      });
    }

    // ---------------------------
    // 2. Validate checkout token
    // ---------------------------
    await authenticate.public.checkout(request);

    // ---------------------------
    // 3. Parse URL params
    // ---------------------------
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    const variantId = url.searchParams.get("variantId");
    const shopDomain = url.searchParams.get("shop");

    if (!productId || !shopDomain) {
      return new Response(
        JSON.stringify({
          status: 400,
          message: "Product ID and shop domain are required",
          offers: [],
        }),
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "https://cdn.shopify.com",
            "Content-Type": "application/json",
          },
        }
      );
    }

    // ---------------------------
    // 4. Fetch offers
    // ---------------------------
    const offerService = new Offer(shopDomain);
    const result = await offerService.getOffersByProduct(productId, variantId);

    return new Response(
      JSON.stringify({
        status: result.status,
        message: result.message,
        offers: result.offers || [],
      }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "https://cdn.shopify.com",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in offer API loader:", error);

    return new Response(
      JSON.stringify({
        status: 500,
        message: "Internal server error",
        error: error.message,
        offers: [],
      }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "https://cdn.shopify.com",
          "Content-Type": "application/json",
        },
      }
    );
  }
};

export const action = async ({ request }) => {
  try {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "https://cdn.shopify.com",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      });
    }

    // Validate checkout token
    await authenticate.public.checkout(request);

    // Parse body
    const body = await request.json();
    const { shopDomain, products, referenceId } = body;

    // Legacy support
    if (referenceId) {
      const { getOffers } = await import("../models/offer.server");
      const offers = getOffers();
      return new Response(JSON.stringify({ offers }), {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "https://cdn.shopify.com",
          "Content-Type": "application/json",
        },
      });
    }

    if (!shopDomain || !products || !Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({
          status: 400,
          message: "shopDomain and products array are required",
          offers: [],
        }),
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "https://cdn.shopify.com",
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch offers for each product
    let allOffers = [];
    const offerService = new Offer(shopDomain);

    for (const p of products) {
      const result = await offerService.getOffersByProduct(p.productId, p.variantId);
      if (result.offers && result.offers.length > 0) {
        allOffers = allOffers.concat(result.offers);
      }
    }

    // Remove duplicates
    const uniqueOffers = allOffers.filter(
      (offer, index, self) => index === self.findIndex((o) => o.id === offer.id)
    );

    return new Response(
      JSON.stringify({ status: 200, message: "Offers fetched", offers: uniqueOffers }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "https://cdn.shopify.com",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in offer API action:", error);
    return new Response(
      JSON.stringify({
        status: 500,
        message: "Internal server error",
        error: error.message,
        offers: [],
      }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "https://cdn.shopify.com",
          "Content-Type": "application/json",
        },
      }
    );
  }
};
