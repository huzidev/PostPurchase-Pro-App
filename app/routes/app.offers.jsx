import React from 'react';
import { authenticate } from "../shopify.server";
import { useNavigate, useLoaderData } from 'react-router';
import { OffersList } from './components/OffersList';
import Offer from "../models/offer.server";
import Subscription from "../models/subscription.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  
  try {
    // Ensure subscription exists for this shop
    const subscriptionService = new Subscription(session.shop, admin.graphql);
    await subscriptionService.ensureSubscriptionExists();
    
    // Get subscription details for limit checking
    const subscriptionResult = await subscriptionService.getSubscriptionWithUsage();
    const canCreateResult = await subscriptionService.canPerformAction('create_offer');
    
    const offerService = new Offer(session.shop);
    const result = await offerService.getOffers();
    
    return {
      offers: result.status === 200 ? result.offers : [],
      shopUrl: session.shop,
      subscription: subscriptionResult.subscription,
      usage: subscriptionResult.usage,
      canActivateOffers: canCreateResult.allowed,
      limitMessage: canCreateResult.message,
    };
  } catch (error) {
    console.error("Error fetching offers:", error);
    return {
      offers: [],
      shopUrl: session.shop,
      subscription: null,
      usage: null,
      canActivateOffers: true,
      limitMessage: '',
      error: error.message,
    };
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  if (intent === "update-status") {
    try {
      const offerId = formData.get("offerId");
      const status = formData.get("status");
      
      if (!offerId || !status) {
        return Response.json({
          status: 400,
          message: "Missing offer ID or status",
          intent: "update-status"
        });
      }
      
      // Check limits when trying to activate an offer
      if (status === 'active') {
        const subscriptionService = new Subscription(session.shop, null);
        const canCreateResult = await subscriptionService.canPerformAction('create_offer');
        
        if (!canCreateResult.allowed) {
          return Response.json({
            status: 403,
            message: canCreateResult.message,
            intent: "update-status",
            limitReached: true
          });
        }
      }
      
      const offerService = new Offer(session.shop);
      const result = await offerService.updateOfferStatus(offerId, status);
      
      return Response.json({
        ...result,
        intent: "update-status",
        message: result.status === 200 
          ? `Offer ${status === 'active' ? 'activated' : 'paused'} successfully!`
          : result.message
      });
    } catch (error) {
      console.error("Error updating offer status:", error);
      return Response.json({
        status: 500,
        message: "Failed to update offer status",
        error: error.message,
        intent: "update-status"
      });
    }
  }
  
  return Response.json({ 
    status: 400, 
    message: "Invalid intent",
    intent: intent 
  });
};

export default function OffersRoute() {
  const navigate = useNavigate();
  const { 
    offers, 
    error, 
    subscription, 
    usage, 
    canActivateOffers, 
    limitMessage 
  } = useLoaderData();

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

  return (
    <OffersList 
      offers={offers || []} 
      onCreateOffer={onCreateOffer} 
      onEditOffer={onEditOffer} 
      onNavigate={onNavigate}
      error={error}
      subscription={subscription}
      usage={usage}
      canActivateOffers={canActivateOffers}
      limitMessage={limitMessage}
    />
  );
}
