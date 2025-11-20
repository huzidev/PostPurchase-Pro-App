import React from 'react';
import { authenticate } from "../shopify.server";
import { useNavigate } from 'react-router';
import { Analytics } from './components/Analytics';

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function AnalyticsRoute() {
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
      default:
        return navigate('/app');
    }
  };

  return <Analytics onNavigate={onNavigate} />;
}
