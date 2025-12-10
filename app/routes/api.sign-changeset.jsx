import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

import { authenticate } from "../shopify.server";
import { getSelectedOffer } from "../models/offer.server";
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
    JSON.stringify({ message: "Use POST method for signing changeset" }),
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
    console.log("SW Sign ChangeSet from the server has been called");
    // authenticate request but DO NOT use cors()
    await authenticate.public.checkout(request);

    const body = await request.json();
    console.log("SW what is body from the server side sign-changeset", body);
    
    // Use the offer data sent from the extension instead of hardcoded offers
    const selectedOffer = body.offer || getSelectedOffer(body.changes);

    console.log("SW what is selected Offer", selectedOffer);

    // Calculate revenue amount from offer
    const revenueAmount = selectedOffer?.changes?.reduce((total, change) => {
      if (change.type === 'add_variant' && change.discount) {
        const basePrice = parseFloat(selectedOffer.originalPrice) || 0;
        const discountValue = change.discount.value || 0;
        
        if (change.discount.valueType === 'percentage') {
          // For percentage discount, calculate actual revenue
          return total + (basePrice - (basePrice * discountValue / 100));
        } else {
          // For fixed amount discount
          return total + (basePrice - discountValue);
        }
      }
      return total;
    }, 0) || 0;

    // Record conversion analytics if we have shop domain and offer ID
    if (body.shopDomain && selectedOffer?.originalOffer?.id) {
      try {
        const analyticsService = new Analytics(body.shopDomain);
        await analyticsService.recordOfferEvent({
          offerId: selectedOffer.originalOffer.id,
          eventType: 'accept',
          customerId: body.customerId?.toString(),
          orderId: body.referenceId,
          productId: selectedOffer.changes?.[0]?.variantID?.toString(),
          revenueAmount: revenueAmount,
          discountAmount: selectedOffer.changes?.[0]?.discount?.value || 0,
          sessionId: body.sessionId,
          userAgent: body.userAgent,
          ipAddress: body.ipAddress,
          eventData: {
            offerTitle: selectedOffer.title,
            offerContext: 'post_purchase_accept',
            changes: selectedOffer.changes,
          },
        });
      } catch (error) {
        console.error("Error recording conversion analytics:", error);
        // Don't fail the changeset signing if analytics fails
      }
    }

    const payload = {
      iss: process.env.SHOPIFY_API_KEY,
      jti: uuidv4(),
      iat: Date.now(),
      sub: body.referenceId,
      changes: selectedOffer?.changes,
    };

    console.log('SW what is pyaload for sign changeset', payload);

    const token = jwt.sign(payload, process.env.SHOPIFY_API_SECRET);

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    });
  } catch (error) {
    console.error("Error in sign-changeset:", error);

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
