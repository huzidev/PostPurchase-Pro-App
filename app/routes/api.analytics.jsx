import { authenticate } from "../shopify.server";
import Analytics from "../models/analytics.server";

// --- LOADER ---
export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const url = new URL(request.url);
    const dateRange = parseInt(url.searchParams.get('dateRange')) || 30;
    const offerId = url.searchParams.get('offerId');

    const analyticsService = new Analytics(session.shop);

    if (offerId) {
      // Get specific offer analytics
      const result = await analyticsService.getOfferAnalytics(offerId, dateRange);
      return Response.json(result);
    } else {
      // Get dashboard analytics
      const result = await analyticsService.getDashboardAnalytics(dateRange);
      return Response.json(result);
    }
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return Response.json(
      {
        status: 500,
        message: "Failed to fetch analytics",
        error: error.message,
      },
      { status: 500 }
    );
  }
};

// --- ACTION ---
export const action = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const body = await request.json();

    const analyticsService = new Analytics(session.shop);

    // Record custom analytics event from admin interface
    const result = await analyticsService.recordOfferEvent({
      offerId: body.offerId,
      eventType: body.eventType,
      customerId: body.customerId,
      orderId: body.orderId,
      productId: body.productId,
      variantId: body.variantId,
      revenueAmount: body.revenueAmount,
      discountAmount: body.discountAmount,
      sessionId: body.sessionId,
      userAgent: body.userAgent,
      ipAddress: body.ipAddress,
      referrer: body.referrer,
      eventData: body.eventData,
    });

    return Response.json(result);
  } catch (error) {
    console.error("Error recording analytics event:", error);
    return Response.json(
      {
        status: 500,
        message: "Failed to record analytics event",
        error: error.message,
      },
      { status: 500 }
    );
  }
};