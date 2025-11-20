import React, { useEffect } from 'react';
import { authenticate } from "../shopify.server";
import { useNavigate, useSearchParams } from 'react-router';
import { Plans } from './components/Plans';
import Subscription from "../models/subscription.server";

import { getAllPlans } from "../utils/plans";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  
  // Check if this is a subscription success callback
  const plan = url.searchParams.get('plan');
  const planName = url.searchParams.get('planName');
  const price = url.searchParams.get('price');
  
  if (plan && planName && price) {
    try {
      const subscriptionService = new Subscription(session.shop, null);
      
      // Get active Shopify subscription to get the subscription ID
      const activeSubscription = await subscriptionService.getActiveSubscription(session.shop, session.accessToken);
      
      if (activeSubscription.status === 200 && activeSubscription.subscriptions.length > 0) {
        const shopifySubId = activeSubscription.subscriptions[0].id;
        
        // Update database with successful subscription
        await subscriptionService.createSubscription(plan, shopifySubId, null);
      }
    } catch (error) {
      console.error("Error handling subscription success:", error);
    }
  }
  
  return { plan, planName, price };
};

export async function action({ request }) {
  console.log("Subscription action called");
  
  const { session, admin } = await authenticate.admin(request);
  const subscription = new Subscription(session.shop, admin.graphql);
  const formData = await request.formData();
  const intent = formData.get("intent") || formData.get("action");

  console.log('Intent:', intent);
  
  if (intent === "subscribe") {
    const planId = formData.get("planId");
    const plans = getAllPlans();
    const selectedPlan = plans.find(plan => plan.id === planId);
    
    if (!selectedPlan) {
      return Response.json({
        error: "Invalid plan selected",
        success: false,
      });
    }

    // Handle free plan specially - cancel current subscription instead of creating new one
    if (selectedPlan.id === "free") {
      try {
        // First, cancel the active Shopify subscription via GraphQL
        const cancelResult = await subscription.cancelShopifySubscription(session.shop, session.accessToken);
        
        if (cancelResult.status !== 200) {
          console.error("Failed to cancel Shopify subscription:", cancelResult);
          return Response.json({
            success: false,
            message: cancelResult.message || "Failed to cancel current subscription",
          });
        }

        console.log("Successfully cancelled Shopify subscription:", cancelResult.message);

        // Create free plan subscription in database
        const dbResult = await subscription.createSubscription(selectedPlan.id, null);

        if (dbResult.status !== 200) {
          console.error("Failed to create free plan subscription in database:", dbResult);
          return Response.json({
            success: false,
            message: "Failed to create free plan subscription",
          });
        }

        console.log("Successfully created free plan subscription in database");

        // Redirect with query params for consistent UI update like paid plans
        const url = new URL(request.url);
        url.searchParams.set('status', 'deactivated');
        url.searchParams.set('message', 'Your subscription has been successfully deactivated');
        
        throw new Response(null, {
          status: 302,
          headers: {
            Location: url.toString(),
          },
        });

      } catch (error) {
        // Re-throw redirect responses (they're not actual errors)
        if (error instanceof Response) {
          throw error;
        }
        console.error("Error handling free plan subscription:", error);
        return Response.json({
          success: false,
          message: "Failed to process free plan subscription",
        });
      }
    }

    // For paid plans, proceed with normal Shopify subscription flow
    const storeURL = session.shop.replace('.myshopify.com', '');
    const baseReturnUrl = `https://admin.shopify.com/store/${storeURL}/apps/postpurchase-pro/app/plans`;
    const returnUrl = `${baseReturnUrl}?plan=${encodeURIComponent(selectedPlan.id)}&planName=${encodeURIComponent(selectedPlan.name)}&price=${selectedPlan.priceValue}`;
    console.log('Creating subscription for:', selectedPlan.name);
    
    const graphqlResult = await subscription.createGraphqlSubscription(
      session.shop,
      session.accessToken,
      selectedPlan.id,
      returnUrl
    );

    if (graphqlResult.status !== 200) {
      return Response.json({
        success: false,
        message: graphqlResult.message,
        errors: graphqlResult.errors,
      });
    }

    // Note: Database update will be handled when user returns with charge_id after payment confirmation
    const message = "Redirecting to Shopify for payment confirmation...";

    return Response.json({
      success: true,
      message: message,
      confirmationUrl: graphqlResult.confirmationUrl,
      planDetails: selectedPlan,
    });
  }

  if (intent === "cancel") {
    try {
      // First cancel the Shopify subscription via GraphQL
      const shopifyResult = await subscription.cancelShopifySubscription(session.shop, session.accessToken);
      
      if (shopifyResult.status !== 200) {
        return Response.json({
          success: false,
          message: shopifyResult.message || "Failed to cancel subscription",
          cancelled: false,
        });
      }

      // Then update the database to mark subscription as inactive
      const dbResult = await subscription.cancelSubscription();
      
      return Response.json({
        success: dbResult.status === 200,
        message: "Subscription cancelled successfully",
        cancelled: true,
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      return Response.json({
        success: false,
        message: "Failed to cancel subscription",
        cancelled: false,
      });
    }
  }

  if (intent === "getSubscription") {
    // Get plans data
    const plans = getAllPlans();
    
    // Get active subscription from Shopify (primary source)
    const activeShopifySubscription = await subscription.getActiveSubscription(
      session.shop, 
      session.accessToken
    );
    
    // Get current subscription from database (fallback)
    const currentSubscription = await subscription.getCurrentSubscription();

    console.log("getSubscription - currentSubscription:", JSON.stringify(currentSubscription, null, 2));
    console.log("getSubscription - activeShopifySubscription:", JSON.stringify(activeShopifySubscription, null, 2));

    // Prioritize Shopify GraphQL subscription over database
    let activeSubscription = null;
    
    if (activeShopifySubscription.subscriptions && activeShopifySubscription.subscriptions.length > 0) {
      const shopifySubscription = activeShopifySubscription.subscriptions[0];
      const matchingPlan = plans.find(plan => shopifySubscription.name.includes(plan.name)) || plans.find(plan => plan.id === "starter");
      
      activeSubscription = {
        status: shopifySubscription.status,
        plan_id: matchingPlan ? matchingPlan.id : "starter",
        plan_name: shopifySubscription.name,
        name: shopifySubscription.name,
        max_active_offers: matchingPlan ? matchingPlan.maxOffers : 5,
        max_impressions_monthly: matchingPlan ? matchingPlan.maxImpressions : 1000,
        is_active: shopifySubscription.status === 'ACTIVE',
        expires_at: null, // Shopify subscriptions don't have expiry dates
      };
    } else if (currentSubscription.subscription && currentSubscription.subscription.is_active) {
      activeSubscription = currentSubscription.subscription;
    }

    return Response.json({
      success: true,
      subscription: activeSubscription,
    });
  }

  return Response.json({ success: false, message: "Invalid intent" });
}

export default function PlansRoute() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Clear query params after handling subscription success
  useEffect(() => {
    const subscription = searchParams.get('subscription');
    if (subscription === 'success') {
      // Clear the query params to clean up the URL
      setTimeout(() => {
        setSearchParams({});
      }, 1000);
    }
  }, [searchParams, setSearchParams]);

  const onNavigate = (page) => {
    switch (page) {
      case 'dashboard':
        return navigate('/app');
      case 'offers':
        return navigate('/app/offers');
      case 'create-offer':
        return navigate('/app/create-offer');
      case 'plans':
        return navigate('/app/plans');
      case 'analytics':
        return navigate('/app/analytics');
      default:
        return navigate('/app');
    }
  };

  return <Plans onNavigate={onNavigate} />;
}
