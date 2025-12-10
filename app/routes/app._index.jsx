import React from 'react';
import { useNavigate, useLoaderData } from 'react-router';
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { Dashboard } from './components/Dashboard';
import Subscription from "../models/subscription.server";
import Offer from "../models/offer.server";
import Analytics from "../models/analytics.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  
  try {
    // Ensure subscription exists for this shop
    const subscriptionService = new Subscription(session.shop, admin.graphql);
    await subscriptionService.ensureSubscriptionExists();
    
    // Check if shop has any offers
    const offerService = new Offer(session.shop);
    const hasOffers = await offerService.hasOffers();
    
    // Fetch analytics data
    const analyticsService = new Analytics(session.shop);
    const analyticsResult = await analyticsService.getDashboardAnalytics();
    const analytics = analyticsResult.status === 200 ? analyticsResult.analytics : null;
    
    // Fetch current subscription for immediate use
    const activeShopifySubscription = await subscriptionService.getActiveSubscription(
      session.shop, 
      session.accessToken
    );
    
    const currentSubscription = await subscriptionService.getCurrentSubscription();
    
    let subscription = null;
    
    // Prioritize Shopify GraphQL subscription over database
    if (activeShopifySubscription.subscriptions && activeShopifySubscription.subscriptions.length > 0) {
      const shopifySubscription = activeShopifySubscription.subscriptions[0];
      const { getAllPlans } = await import("../utils/plans");
      const plans = getAllPlans();
      const matchingPlan = plans.find(plan => shopifySubscription.name.includes(plan.name)) || plans.find(plan => plan.id === "starter");
      
      subscription = {
        status: shopifySubscription.status,
        plan_id: matchingPlan ? matchingPlan.id : "starter",
        plan_name: shopifySubscription.name,
        name: shopifySubscription.name,
        max_active_offers: matchingPlan ? matchingPlan.maxOffers : 5,
        max_impressions_monthly: matchingPlan ? matchingPlan.maxImpressions : 1000,
        is_active: shopifySubscription.status === 'ACTIVE',
        expires_at: null,
      };
    } else if (currentSubscription.subscription && currentSubscription.subscription.is_active) {
      subscription = currentSubscription.subscription;
    }
    
    return { hasOffers, subscription, analytics };
  } catch (error) {
    console.error("Error in dashboard loader:", error);
    return { hasOffers: false, subscription: null, analytics: null };
  }
};

export default function Index() {
  const navigate = useNavigate();
  const { hasOffers, subscription: loaderSubscription, analytics } = useLoaderData();

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
      case 'analytics':
        return navigate('/app/analytics');
      default:
        return navigate('/app');
    }
  };

  return <Dashboard onNavigate={onNavigate} hasOffers={hasOffers} initialSubscription={loaderSubscription} initialAnalytics={analytics} />;
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
