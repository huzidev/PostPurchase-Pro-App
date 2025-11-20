import React from 'react';
import { authenticate } from "../shopify.server";
import { useNavigate } from 'react-router';
import { OffersList } from './components/OffersList';

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function OffersRoute() {
  const navigate = useNavigate();

  const onNavigate = (page) => {
    switch (page) {
      case 'dashboard':
        return navigate('/app');
      case 'plans':
        return navigate('/app/plans');
      case 'create-offer':
        return navigate('/app/create-offer');
      case 'offers':
        return navigate('/app/offers');
      case 'analytics':
        return navigate('/app/analytics');
      default:
        return navigate('/app');
    }
  };

  const onCreateOffer = () => navigate('/app/create-offer');
  const onEditOffer = (id) => navigate(`/app/edit-offer/${id}`);

  return <OffersList onCreateOffer={onCreateOffer} onEditOffer={onEditOffer} onNavigate={onNavigate} />;
}
