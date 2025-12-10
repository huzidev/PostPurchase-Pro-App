import { authenticate } from "../shopify.server";
import Offer from "../models/offer.server";
import Analytics from "../models/analytics.server";
import Subscription from "../models/subscription.server";

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
      const subscriptionService = new Subscription(body.shopDomain);
      const analyticsService = new Analytics(body.shopDomain);
      
      // 1. Check if subscription is active
      const subscriptionResult = await subscriptionService.getCurrentSubscription();
      const subscription = subscriptionResult.subscription;
      
      if (!subscription || !subscription.is_active) {
        return new Response(
          JSON.stringify({
            status: 403,
            message: "Subscription not active",
            offers: [],
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

      // 2. Check impression limits
      const impressionCheck = await analyticsService.checkImpressionLimits();
      if (impressionCheck.limitReached) {
        return new Response(
          JSON.stringify({
            status: 429,
            message: "Monthly impression limit reached",
            offers: [],
            impressionLimit: impressionCheck.maxImpressions,
            currentImpressions: impressionCheck.totalImpressions,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

      // 3. Check active offer limits
      const activeOfferCount = await offerService.getActiveOfferCount();
      if (activeOfferCount >= subscription.max_active_offers) {
        return new Response(
          JSON.stringify({
            status: 429,
            message: "Active offer limit reached for current plan",
            offers: [],
            activeOfferLimit: subscription.max_active_offers,
            currentActiveOffers: activeOfferCount,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              ...CORS_HEADERS,
            },
          }
        );
      }

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

      // Record impression analytics for each unique offer
      for (const offer of uniqueOffers) {
        await analyticsService.recordOfferEvent({
          offerId: offer.id,
          eventType: 'impression',
          customerId: body.customerId,
          orderId: body.orderId,
          sessionId: body.sessionId,
          userAgent: body.userAgent,
          ipAddress: body.ipAddress,
          referrer: body.referrer,
          eventData: {
            purchasedProducts: body.purchasedProducts,
            offerContext: 'post_purchase',
          },
        });
      }

      return new Response(
        JSON.stringify({
          status: 200,
          message: "Offers fetched successfully",
          offers: uniqueOffers,
          remainingImpressions: impressionCheck.remainingImpressions,
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
