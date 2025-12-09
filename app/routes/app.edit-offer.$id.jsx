import React from 'react';
import { authenticate } from "../shopify.server";
import { useNavigate, useLoaderData, useParams } from 'react-router';
import { Page, Card, Text, Button } from '@shopify/polaris';
import { OfferForm } from './components/OfferForm';
import Offer from "../models/offer.server";
import Subscription from "../models/subscription.server";

export const loader = async ({ request, params }) => {
  const { session, admin } = await authenticate.admin(request);
  const offerId = params.id;
  
  // Validate that we have an offer ID
  if (!offerId) {
    return {
      offer: null,
      shopUrl: session.shop,
      canSaveOffer: true,
      subscription: null,
      usage: null,
      error: "No offer ID provided",
    };
  }
  
  try {
    // Ensure subscription exists and check subscription for upgrade prompts
    const subscriptionService = new Subscription(session.shop, admin.graphql);
    
    // Ensure subscription exists without overriding paid plans
    await subscriptionService.ensureSubscriptionExists();
    
    const subscriptionResult = await subscriptionService.getSubscriptionWithUsage();
    
    // Fetch the offer to edit
    const offerService = new Offer(session.shop);
    const offerResult = await offerService.getOffer(offerId);
    
    if (offerResult.status !== 200) {
      throw new Error(offerResult.message || 'Offer not found');
    }
    
    // Check if user can activate offers (for limit warning)
    const canCreateResult = await subscriptionService.canPerformAction('create_offer');
    
    return {
      offer: offerResult.offer,
      shopUrl: session.shop,
      canSaveOffer: true, // Editing existing offers is always allowed
      isLimitReached: !canCreateResult.allowed,
      offerLimitMessage: canCreateResult.message,
      subscription: subscriptionResult.subscription,
      usage: subscriptionResult.usage,
    };
  } catch (error) {
    console.error("Error in edit offer loader:", error);
    return {
      offer: null,
      shopUrl: session.shop,
      canSaveOffer: true,
      subscription: null,
      usage: null,
      error: error.message,
    };
  }
};

export const action = async ({ request, params }) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const offerId = params.id;
  
  // Validate that we have an offer ID
  if (!offerId) {
    return Response.json({
      status: 400,
      message: "No offer ID provided",
      error: "Missing offer ID",
    });
  }
  
  if (intent === "update-offer") {
    try {
      // Check if user can activate offers when trying to set status to active
      const subscriptionService = new Subscription(session.shop, admin.graphql);
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
      
      const result = await offerService.updateOffer(offerId, offerData);
      
      if (result.status === 200) {
        const toastMessage = !canCreateResult.allowed && requestedStatus === 'active' 
          ? "Offer updated but set to paused due to plan limits. Upgrade to activate it."
          : "Offer updated successfully!";
          
        return Response.json({
          ...result,
          showToast: true,
          toastMessage,
          isLimitReached: !canCreateResult.allowed
        });
      }
      
      return Response.json(result);
    } catch (error) {
      console.error("Error updating offer:", error);
      return Response.json({
        status: 500,
        message: "Failed to update offer",
        error: error.message,
      });
    }
  }
  
  return Response.json({ status: 400, message: "Invalid intent" });
};

export default function EditOfferRoute() {
  const navigate = useNavigate();
  const { 
    offer,
    canSaveOffer,
    isLimitReached,
    offerLimitMessage,
    subscription, 
    usage,
    error 
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

  if (error || !offer) {
    return (
      <Page title="Edit Offer">
        <Card>
          <Text>Error: {error || 'Offer not found'}</Text>
          <Button onClick={() => navigate('/app/offers')}>
            Back to Offers
          </Button>
        </Card>
      </Page>
    );
  }

  return (
    <OfferForm 
      mode="edit"
      offer={offer}
      onSaved={onSaved} 
      onNavigate={onNavigate} 
      canSaveOffer={canSaveOffer}
      isLimitReached={isLimitReached}
      offerLimitMessage={offerLimitMessage}
      subscription={subscription}
      usage={usage}
    />
  );
}