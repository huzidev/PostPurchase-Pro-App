import React from 'react';
import { authenticate } from "../shopify.server";
import { useNavigate, useLoaderData } from 'react-router';
import { OfferForm } from './components/OfferForm';
import Offer from "../models/offer.server";
import Subscription from "../models/subscription.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  
  try {
    // Ensure subscription exists and check offer limits
    const subscriptionService = new Subscription(session.shop, admin.graphql);
    
    // Ensure a subscription exists without overriding paid plans
    await subscriptionService.ensureSubscriptionExists();
    
    const canCreateResult = await subscriptionService.canPerformAction('create_offer');
    
    // Get subscription details for display
    const subscriptionResult = await subscriptionService.getSubscriptionWithUsage();
    
    return {
      shopUrl: session.shop,
      canCreateOffer: true, // Always allow creating offers
      isLimitReached: !canCreateResult.allowed,
      offerLimitMessage: canCreateResult.message,
      subscription: subscriptionResult.subscription,
      usage: subscriptionResult.usage,
    };
  } catch (error) {
    console.error("Error in loader:", error);
    return {
      shopUrl: session.shop,
      canCreateOffer: false,
      offerLimitMessage: "Error checking subscription status",
      subscription: null,
      usage: null,
    };
  }
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  if (intent === "save-offer") {
    try {
      // Ensure subscription exists and check if user can create more offers
      const subscriptionService = new Subscription(session.shop, admin.graphql);
      
      // Ensure subscription exists without overriding paid plans
      await subscriptionService.ensureSubscriptionExists();
      
      const canCreateResult = await subscriptionService.canPerformAction('create_offer');
      
      const offerService = new Offer(session.shop);
      
      // Parse the form data
      const requestedStatus = formData.get("status");
      const finalStatus = !canCreateResult.allowed && requestedStatus === 'active' ? 'paused' : requestedStatus;
      
      const offerData = {
        name: formData.get("name"),
        description: formData.get("description"),
        status: finalStatus,
        discountType: formData.get("discountType"),
        discountValue: formData.get("discountValue"),
        offerTitle: formData.get("offerTitle"),
        offerDescription: formData.get("offerDescription"),
        buttonText: formData.get("buttonText"),
        limitPerCustomer: formData.get("limitPerCustomer"),
        totalLimit: formData.get("totalLimit"),
        expiryDate: formData.get("expiryDate"),
        scheduleStart: formData.get("scheduleStart"),
        enableABTest: formData.get("enableABTest") === "true",
        products: JSON.parse(formData.get("products") || "[]"),
        purchasedProducts: JSON.parse(formData.get("purchasedProducts") || "[]"),
      };
      
      const result = await offerService.createOffer(offerData);
      
      if (result.status === 200) {
        const toastMessage = !canCreateResult.allowed && requestedStatus === 'active' 
          ? "Offer created but set to paused due to plan limits. Upgrade to activate it."
          : "Offer created successfully!";
          
        return Response.json({
          ...result,
          showToast: true,
          toastMessage,
          isLimitReached: !canCreateResult.allowed
        });
      }
      
      return Response.json(result);
    } catch (error) {
      console.error("Error saving offer:", error);
      
      // Handle specific database constraint errors
      if (error.code === 'P2003') {
        return Response.json({
          status: 500,
          message: "Database constraint error. Please ensure you have a valid subscription.",
          error: error.message,
        });
      }
      
      return Response.json({
        status: 500,
        message: "Failed to save offer",
        error: error.message,
      });
    }
  }
  
  return Response.json({ status: 400, message: "Invalid intent" });
};

export default function CreateOfferRoute() {
  const navigate = useNavigate();
  const { 
    canCreateOffer, 
    isLimitReached,
    offerLimitMessage, 
    subscription, 
    usage 
  } = useLoaderData();

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

  return (
    <OfferForm 
      onSaved={onSaved} 
      onNavigate={onNavigate} 
      canSaveOffer={canCreateOffer}
      isLimitReached={isLimitReached}
      offerLimitMessage={offerLimitMessage}
      subscription={subscription}
      usage={usage}
    />
  );
}
