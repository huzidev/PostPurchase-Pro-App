import React from 'react';
import { useNavigate, useLoaderData } from 'react-router';
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { Dashboard } from './components/Dashboard';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  
  // For now, return basic data - in a real app, you'd query the database for offers
  // Since we removed the Offer model, we'll simulate this data
  const hasOffers = false; // This would be checked from your offers storage/state
  
  return { hasOffers };
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
