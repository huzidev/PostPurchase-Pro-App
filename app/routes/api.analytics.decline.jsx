import { authenticate } from "../shopify.server";
import Analytics from "../models/analytics.server";

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
    JSON.stringify({ message: "Use POST method for recording decline events" }),
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
    // Authenticate request but DO NOT use cors()
    await authenticate.public.checkout(request);

    const body = await request.json();
    console.log("Decline analytics request:", body);

    if (!body.shopDomain || !body.offerId) {
      return new Response(
        JSON.stringify({
          status: 400,
          message: "Missing required fields: shopDomain and offerId",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
          },
        }
      );
    }

    const analyticsService = new Analytics(body.shopDomain);

    // Record the decline event
    const result = await analyticsService.recordOfferEvent({
      offerId: body.offerId,
      eventType: 'decline',
      customerId: body.customerId,
      orderId: body.orderId,
      productId: body.productId,
      variantId: body.variantId,
      sessionId: body.sessionId,
      userAgent: body.userAgent,
      ipAddress: body.ipAddress,
      referrer: body.referrer,
      eventData: body.eventData,
    });

    return new Response(
      JSON.stringify({
        status: 200,
        message: "Decline event recorded successfully",
        result,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...CORS_HEADERS,
        },
      }
    );
  } catch (error) {
    console.error("Error recording decline event:", error);

    return new Response(
      JSON.stringify({
        status: 500,
        message: "Internal server error",
        error: error.message,
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