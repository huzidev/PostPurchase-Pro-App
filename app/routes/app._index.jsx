import React from 'react';
import { useNavigate, useLoaderData } from 'react-router';
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { Dashboard } from './components/Dashboard';
import Subscription from "../models/subscription.server";
import Offer from "../models/offer.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  
  try {
    // Ensure subscription exists for this shop
    const subscriptionService = new Subscription(session.shop, admin.graphql);
    await subscriptionService.ensureSubscriptionExists();
    
    // Check if shop has any offers
    const offerService = new Offer(session.shop);
    const hasOffers = await offerService.hasOffers();
    
    return { hasOffers };
  } catch (error) {
    console.error("Error in dashboard loader:", error);
    return { hasOffers: false };
  }
};

export default function Index() {
  const navigate = useNavigate();
  const { hasOffers } = useLoaderData();

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

  return <Dashboard onNavigate={onNavigate} hasOffers={hasOffers} />;
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
