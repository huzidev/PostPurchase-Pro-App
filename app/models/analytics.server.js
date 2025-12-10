import db from "../db.server";

export default class Analytics {
  constructor(shopify_url) {
    this.shopify_url = shopify_url;
  }

  // Record an offer event (impression, view, accept, decline)
  async recordOfferEvent({
    offerId,
    eventType,
    customerId = null,
    orderId = null,
    productId = null,
    variantId = null,
    revenueAmount = 0,
    discountAmount = 0,
    sessionId = null,
    userAgent = null,
    ipAddress = null,
    referrer = null,
    eventData = null,
  }) {
    try {
      const event = await db.offerEvent.create({
        data: {
          shopify_url: this.shopify_url,
          offer_id: offerId,
          event_type: eventType,
          customer_id: customerId,
          order_id: orderId,
          product_id: productId,
          variant_id: variantId,
          revenue_amount: revenueAmount || 0,
          discount_amount: discountAmount || 0,
          session_id: sessionId,
          user_agent: userAgent,
          ip_address: ipAddress,
          referrer: referrer,
          event_data: eventData,
        },
      });

      // Update daily analytics
      await this.updateDailyAnalytics(offerId, eventType, revenueAmount || 0);

      return {
        status: 200,
        message: "Event recorded successfully",
        event,
      };
    } catch (error) {
      console.error("Error recording offer event:", error);
      return {
        status: 500,
        message: "Failed to record event",
        error: error.message,
      };
    }
  }

  // Update daily analytics aggregates
  async updateDailyAnalytics(offerId, eventType, revenueAmount = 0) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingAnalytics = await db.analytics.findFirst({
        where: {
          shopify_url: this.shopify_url,
          offer_id: offerId,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      const updateData = this.getAnalyticsUpdateData(eventType, revenueAmount);

      if (existingAnalytics) {
        // Update existing analytics
        const updated = await db.analytics.update({
          where: { id: existingAnalytics.id },
          data: updateData,
        });
        
        // Recalculate conversion rate
        await this.updateConversionRate(updated.id);
        return updated;
      } else {
        // Create new analytics record
        const newAnalytics = await db.analytics.create({
          data: {
            shopify_url: this.shopify_url,
            offer_id: offerId,
            date: today,
            ...this.getInitialAnalyticsData(eventType, revenueAmount),
          },
        });
        
        return newAnalytics;
      }
    } catch (error) {
      console.error("Error updating daily analytics:", error);
      throw error;
    }
  }

  // Get analytics update data based on event type
  getAnalyticsUpdateData(eventType, revenueAmount = 0) {
    const updateData = { updatedAt: new Date() };

    switch (eventType) {
      case 'impression':
        updateData.impressions = { increment: 1 };
        break;
      case 'view':
        updateData.views = { increment: 1 };
        break;
      case 'accept':
        updateData.conversions = { increment: 1 };
        updateData.revenue = { increment: revenueAmount };
        break;
      case 'decline':
        updateData.declines = { increment: 1 };
        break;
      default:
        break;
    }

    return updateData;
  }

  // Get initial analytics data for new records
  getInitialAnalyticsData(eventType, revenueAmount = 0) {
    const data = {
      impressions: 0,
      views: 0,
      conversions: 0,
      declines: 0,
      revenue: 0,
      conversion_rate: 0,
    };

    switch (eventType) {
      case 'impression':
        data.impressions = 1;
        break;
      case 'view':
        data.views = 1;
        break;
      case 'accept':
        data.conversions = 1;
        data.revenue = revenueAmount;
        break;
      case 'decline':
        data.declines = 1;
        break;
      default:
        break;
    }

    return data;
  }

  // Update conversion rate for analytics record
  async updateConversionRate(analyticsId) {
    try {
      const analytics = await db.analytics.findUnique({
        where: { id: analyticsId },
      });

      if (analytics) {
        const totalInteractions = analytics.views + analytics.declines + analytics.conversions;
        const conversionRate = totalInteractions > 0 ? (analytics.conversions / totalInteractions) * 100 : 0;

        await db.analytics.update({
          where: { id: analyticsId },
          data: { conversion_rate: conversionRate },
        });
      }
    } catch (error) {
      console.error("Error updating conversion rate:", error);
    }
  }

  // Get analytics summary for dashboard
  async getDashboardAnalytics(dateRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      // Get aggregated analytics
      const analytics = await db.analytics.aggregate({
        where: {
          shopify_url: this.shopify_url,
          date: { gte: startDate },
        },
        _sum: {
          impressions: true,
          views: true,
          conversions: true,
          declines: true,
          revenue: true,
        },
        _avg: {
          conversion_rate: true,
        },
      });

      // Get total offers count
      const totalOffers = await db.offer.count({
        where: { 
          shopify_url: this.shopify_url,
          status: 'active'
        },
      });

      // Get active offers count
      const activeOffers = await db.offer.count({
        where: { 
          shopify_url: this.shopify_url,
          status: 'active'
        },
      });

      return {
        status: 200,
        analytics: {
          total_offers: totalOffers,
          active_offers: activeOffers,
          total_revenue: analytics._sum.revenue || 0,
          conversion_rate: analytics._avg.conversion_rate || 0,
          impressions: analytics._sum.impressions || 0,
          views: analytics._sum.views || 0,
          conversions: analytics._sum.conversions || 0,
          declines: analytics._sum.declines || 0,
        },
      };
    } catch (error) {
      console.error("Error getting dashboard analytics:", error);
      return {
        status: 500,
        message: "Failed to get dashboard analytics",
        error: error.message,
      };
    }
  }

  // Get detailed analytics for specific offer
  async getOfferAnalytics(offerId, dateRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const analytics = await db.analytics.findMany({
        where: {
          shopify_url: this.shopify_url,
          offer_id: offerId,
          date: { gte: startDate },
        },
        orderBy: { date: 'desc' },
      });

      const events = await db.offerEvent.findMany({
        where: {
          shopify_url: this.shopify_url,
          offer_id: offerId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        status: 200,
        analytics,
        events,
      };
    } catch (error) {
      console.error("Error getting offer analytics:", error);
      return {
        status: 500,
        message: "Failed to get offer analytics",
        error: error.message,
      };
    }
  }

  // Check if shop has reached impression limits
  async checkImpressionLimits() {
    try {
      // Get current month's impressions
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyImpressions = await db.analytics.aggregate({
        where: {
          shopify_url: this.shopify_url,
          date: { gte: startOfMonth },
        },
        _sum: {
          impressions: true,
        },
      });

      // Get subscription limits
      const subscription = await db.subscription.findUnique({
        where: { shopify_url: this.shopify_url },
      });

      const totalImpressions = monthlyImpressions._sum.impressions || 0;
      const maxImpressions = subscription?.max_impressions_monthly || 100;
      const limitReached = totalImpressions >= maxImpressions;

      return {
        status: 200,
        totalImpressions,
        maxImpressions,
        limitReached,
        remainingImpressions: Math.max(0, maxImpressions - totalImpressions),
      };
    } catch (error) {
      console.error("Error checking impression limits:", error);
      return {
        status: 500,
        message: "Failed to check impression limits",
        error: error.message,
      };
    }
  }
}