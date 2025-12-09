import { authenticate } from "../shopify.server";
import Offer from "../models/offer.server";

// Shared CORS headers
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// --- LOADER ---
export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  return new Response(
    JSON.stringify({ message: "Use POST method for fetching offers" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    }
  );
};

// --- ACTION ---
export const action = async ({ request }) => {
  try {
    // still authenticate, but DO NOT use cors()
    await authenticate.public.checkout(request);

    const body = await request.json();

    // 1. Legacy: referenceId
    if (body.referenceId) {
      const { getOffers } = await import("../models/offer.server");
      const offers = getOffers();

      return new Response(JSON.stringify({ offers }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      });
    }

    // 2. New behavior: purchased products
    if (body.purchasedProducts && body.shopDomain) {
      const offerService = new Offer(body.shopDomain);
      let allOffers = [];

      for (const product of body.purchasedProducts) {
        // Pass the numeric ID directly - the server will handle both GID and numeric formats
        const result = await offerService.getOffersByPurchasedProduct(
          product.productId,
          product.variantId
        );

        if (result?.offers?.length) {
          allOffers = allOffers.concat(result.offers);
        }
      }

      const uniqueOffers = allOffers.filter(
        (offer, index, self) =>
          index === self.findIndex((o) => o.id === offer.id)
      );

      return new Response(
        JSON.stringify({
          status: 200,
          message: "Offers fetched successfully",
          offers: uniqueOffers,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        }
      );
    }

    // 3. Invalid request
    return new Response(
      JSON.stringify({
        status: 400,
        message: "Invalid request body - need purchasedProducts and shopDomain",
        offers: [],
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
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
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      }
    );
  }
};
