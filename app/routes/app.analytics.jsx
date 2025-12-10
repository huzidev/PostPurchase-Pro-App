import React from 'react';
import { authenticate } from "../shopify.server";
import { useNavigate, useLoaderData } from 'react-router';
import { Analytics } from './components/Analytics';
import AnalyticsService from "../models/analytics.server";
import Offer from "../models/offer.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  try {
    // Get URL parameters for date range
    const url = new URL(request.url);
    const dateRange = url.searchParams.get('dateRange') || 'last_30_days';
    
    // Convert date range to days
    const daysMap = {
      'last_7_days': 7,
      'last_30_days': 30,
      'last_90_days': 90,
      'last_12_months': 365
    };
    const days = daysMap[dateRange] || 30;
    
    const analyticsService = new AnalyticsService(session.shop);
    const offerService = new Offer(session.shop);
    
    // Fetch dashboard analytics
    const dashboardResult = await analyticsService.getDashboardAnalytics(days);
    const dashboardAnalytics = dashboardResult.status === 200 ? dashboardResult.analytics : null;
    
    // Fetch all offers with their analytics
    const offersResult = await offerService.getAllOffers();
    const offers = offersResult.status === 200 ? offersResult.offers : [];
    
    // Get detailed analytics for each offer
    const offersWithAnalytics = await Promise.all(
      offers.map(async (offer) => {
        const offerAnalyticsResult = await analyticsService.getOfferAnalytics(offer.id, days);
        const analytics = offerAnalyticsResult.status === 200 ? offerAnalyticsResult.analytics : [];
        
        // Calculate totals for this offer
        const totals = analytics.reduce((acc, day) => {
          acc.impressions += day.impressions || 0;
          acc.views += day.views || 0;
          acc.conversions += day.conversions || 0;
          acc.declines += day.declines || 0;
          acc.revenue += day.revenue || 0;
          return acc;
        }, { impressions: 0, views: 0, conversions: 0, declines: 0, revenue: 0 });
        
        const conversionRate = totals.impressions > 0 ? (totals.conversions / totals.impressions) * 100 : 0;
        
        return {
          ...offer,
          analytics: totals,
          conversionRate: conversionRate
        };
      })
    );
    
    return {
      dashboardAnalytics,
      offers: offersWithAnalytics,
      dateRange
    };
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return {
      dashboardAnalytics: null,
      offers: [],
      dateRange: 'last_30_days'
    };
  }
};

export default function AnalyticsRoute() {
  const navigate = useNavigate();
  const { dashboardAnalytics, offers, dateRange } = useLoaderData();

  const onNavigate = (page) => {
    switch (page) {
      case 'dashboard':
        return navigate('/app');
      case 'plans':
        return navigate('/app/plans');
      case 'offers':
        return navigate('/app/offers');
      case 'create-offer':
        return navigate('/app/create-offer');
      default:
        return navigate('/app');
    }
  };

  return <Analytics onNavigate={onNavigate} initialAnalytics={dashboardAnalytics} initialOffers={offers} initialDateRange={dateRange} />;
}
