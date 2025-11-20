import React from 'react';
import { authenticate } from "../shopify.server";
import { useNavigate } from 'react-router';
import { OfferForm } from './components/OfferForm';

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function CreateOfferRoute() {
  const navigate = useNavigate();

  const onNavigate = (page) => {
    switch (page) {
      case 'dashboard':
        return navigate('/app');
      case 'plans':
        return navigate('/app/plans');
      case 'offers':
        return navigate('/app/offers');
      case 'analytics':
        return navigate('/app/analytics');
      default:
        return navigate('/app/offers');
    }
  };

  const onSaved = () => navigate('/app/offers');

  return <OfferForm onSaved={onSaved} onNavigate={onNavigate} />;
}
