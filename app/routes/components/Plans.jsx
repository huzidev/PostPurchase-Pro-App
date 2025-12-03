import React, { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineGrid,
  Banner,
  Toast,
  Frame,
  Modal,
  Button,
} from '@shopify/polaris';
import { getAllPlans } from '../../utils/plans';
import { PlanCard } from './PlanCard';
import { useSubscription } from '../../hooks/useSubscription.jsx';
import { useFetcher, useLoaderData, useSearchParams } from 'react-router';

export function Plans({ onNavigate, initialSubscription = null }) {
  const { subscription: hookSubscription, loading, error, refreshSubscription } = useSubscription();
  
  // Use loader subscription if available, fallback to hook subscription
  const subscription = initialSubscription || hookSubscription;
  
  // Only show loading if we don't have initial subscription and hook is loading
  const shouldShowLoading = !initialSubscription && loading && !hookSubscription;
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [targetPlan, setTargetPlan] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const loaderData = useLoaderData();
  const plans = getAllPlans();
  const fetcher = useFetcher();

  const currentPlan = subscription?.plan_id || 'free';
  
  // Check for subscription success/deactivation from URL params
  const urlPlan = searchParams.get('plan');
  const urlPlanName = searchParams.get('planName');
  const urlStatus = searchParams.get('status');
  const urlMessage = searchParams.get('message');

  // Helper function to show toast
  const showToast = (message) => {
    setToastMessage(message);
    setToastActive(true);
  };

  // Helper function to get plan priority for comparison
  const getPlanPriority = (planId) => {
    const priorities = { free: 0, starter: 1, professional: 2, enterprise: 3 };
    return priorities[planId] || 0;
  };

  const handlePlanAction = async (plan) => {
    if (plan.id === 'enterprise') {
      // Open email for enterprise plan
      window.open(`mailto:${plan.contactEmail}?subject=Enterprise Plan Inquiry&body=Hi, I'm interested in learning more about the Enterprise plan for Post Purchase Pro.`, '_blank');
      return;
    }
    
    if (currentPlan !== plan.id) {
      const currentPriority = getPlanPriority(currentPlan);
      const targetPriority = getPlanPriority(plan.id);
      
      if (targetPriority > currentPriority) {
        // Upgrading
        setLoadingPlanId(plan.id);
        showToast('Redirecting for payment...');
        
        // Create subscription and redirect for payment
        fetcher.submit(
          { intent: 'subscribe', planId: plan.id },
          { method: 'POST', action: '/app/plans' }
        );
      } else if (plan.id === 'free' && subscription?.is_active) {
        // Downgrading to free from active subscription - show modal
        setTargetPlan(plan);
        setShowDowngradeModal(true);
      } else {
        // Other downgrades
        setLoadingPlanId(plan.id);
        showToast('Processing downgrade...');
        
        // Handle downgrade logic
        fetcher.submit(
          { intent: 'subscribe', planId: plan.id },
          { method: 'POST', action: '/app/plans' }
        );
      }
    }
  };

  const handleDowngradeConfirm = () => {
    if (targetPlan) {
      setModalLoading(true);
      
      fetcher.submit(
        { intent: 'subscribe', planId: targetPlan.id },
        { method: 'POST', action: '/app/plans' }
      );
    }
  };

  const handleDowngradeCancel = () => {
    setShowDowngradeModal(false);
    setTargetPlan(null);
  };

  // Handle fetcher response
  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.confirmationUrl) {
        // Don't clear loading state - keep button loading until redirect
        // Use parent window location for Shopify embedded app
        if (window.parent) {
          window.parent.location.href = fetcher.data.confirmationUrl;
        } else {
          window.top.location.href = fetcher.data.confirmationUrl;
        }
      } else if (fetcher.data.success) {
        // Free plan completed (no redirect) — update UI and refresh subscription context
        if (fetcher.data.type === "free") {
          setModalLoading(false);
          setShowDowngradeModal(false);
          setTargetPlan(null);
          setLoadingPlanId(null);
          
          // Update subscription data if provided
          if (fetcher.data.subscription) {
            // Could store this in a state if needed for immediate UI updates
            console.log("Free plan subscription data:", fetcher.data.subscription);
          }
          
          // Refresh subscription context so UI updates immediately
          if (typeof refreshSubscription === 'function') {
            refreshSubscription();
          }
          
          // Hide any currently visible banner and remove query params from URL
          setBannerDismissed(true);
          try {
            window.history.replaceState({}, '', '/app/plans');
          } catch (err) {
            console.error('Failed to replace state in history after free downgrade', err);
          }
          
          showToast(fetcher.data.message || 'Successfully downgraded to free plan');
        } else {
          // Other successful actions
          setLoadingPlanId(null);
          showToast(fetcher.data.message || 'Subscription updated successfully');
          refreshSubscription();
        }
      } else {
        // Clear loading state only on errors
        setModalLoading(false);
        setLoadingPlanId(null);
        showToast(fetcher.data.message || 'Failed to update subscription');
      }
    }
  }, [fetcher.data, targetPlan, refreshSubscription]);

  const toastMarkup = toastActive && (
    <Toast
      content={toastMessage}
      onDismiss={() => setToastActive(false)}
    />
  );

  return (
    <Frame>
      <Page 
        title="Plans & Pricing"
        backAction={onNavigate ? { onAction: () => onNavigate('dashboard') } : undefined}
      >
        <Layout>
          {/* Success Banner for Subscription Activation */}
          {urlPlan && urlPlanName && !bannerDismissed && (
            <Layout.Section>
              <Banner
                title="Subscription Activated!"
                tone="success"
                onDismiss={() => {
                  setBannerDismissed(true);
                  try {
                    window.history.replaceState({}, '', '/app/plans');
                  } catch (err) {
                    console.error('Failed to replace state in history', err);
                    setSearchParams({});
                  }
                }}
              >
                <p>Your {urlPlanName} subscription has been successfully activated and is now ready to use!</p>
              </Banner>
            </Layout.Section>
          )}

          {/* Deactivation Banner */}
          {(urlStatus === 'deactivated' || (fetcher.data?.status === 'deactivated' && fetcher.data?.type === 'free')) && !bannerDismissed && (
            <Layout.Section>
              <Banner
                title="Subscription Deactivated"
                tone="info"
                onDismiss={() => {
                  setBannerDismissed(true);
                  try {
                    window.history.replaceState({}, '', '/app/plans');
                  } catch (err) {
                    console.error('Failed to replace state in history', err);
                    setSearchParams({});
                  }
                }}
              >
                <p>{urlMessage || fetcher.data?.message || "Your subscription has been successfully deactivated"}</p>
              </Banner>
            </Layout.Section>
          )}

          {error && (
            <Layout.Section>
              <Banner tone="critical">
                <p>{error}</p>
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlan={currentPlan}
                  onPlanAction={handlePlanAction}
                  getPlanPriority={getPlanPriority}
                  loading={loadingPlanId === plan.id}
                  disabled={loadingPlanId && loadingPlanId !== plan.id}
                />
              ))}
            </InlineGrid>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg">
                  Frequently Asked Questions
                </Text>
                <BlockStack gap="300">
                  <div>
                    <Text as="h3" variant="headingSm">
                      Can I change my plan at any time?
                    </Text>
                    <Text as="p" tone="subdued">
                      Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                    </Text>
                  </div>
                  <div>
                    <Text as="h3" variant="headingSm">
                      What happens if I exceed my impression limit?
                    </Text>
                    <Text as="p" tone="subdued">
                      Your offers will continue to work, but you'll be charged $0.01 per additional impression above your plan limit.
                    </Text>
                  </div>
                  <div>
                    <Text as="h3" variant="headingSm">
                      Do you offer a free trial?
                    </Text>
                    <Text as="p" tone="subdued">
                      All paid plans come with a 14-day free trial. No credit card required.
                    </Text>
                  </div>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
      
      {/* Downgrade Confirmation Modal */}
      <Modal
        open={showDowngradeModal}
        onClose={modalLoading ? undefined : handleDowngradeCancel}
        title="Confirm Downgrade to Free Plan"
        primaryAction={{
          content: modalLoading ? 'Processing...' : 'Yes, Downgrade',
          onAction: handleDowngradeConfirm,
          destructive: true,
          loading: modalLoading,
          disabled: modalLoading,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleDowngradeCancel,
            disabled: modalLoading,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p">
              Are you sure you want to downgrade to the Free plan? This will cancel your current active subscription.
            </Text>
            <Text as="p" variant="headingSm">
              Free plan features:
            </Text>
            <Card>
              <BlockStack gap="200">
                {plans.find(p => p.id === 'free')?.features.map((feature, index) => (
                  <Text key={index} as="p" tone="subdued">
                    • {feature}
                  </Text>
                ))}
              </BlockStack>
            </Card>
          </BlockStack>
        </Modal.Section>
      </Modal>
      
      {toastMarkup}
    </Frame>
  );
}