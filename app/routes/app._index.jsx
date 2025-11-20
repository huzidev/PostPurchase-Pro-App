import React from 'react';
import { useNavigate } from 'react-router';
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { Dashboard } from './components/Dashboard';

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const navigate = useNavigate();

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

  return <Dashboard onNavigate={onNavigate} />;
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
