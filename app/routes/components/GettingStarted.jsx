import React from 'react';
import { Card, BlockStack, InlineStack, Text, Button, Icon, ProgressBar } from '@shopify/polaris';
import { CheckCircleIcon } from '@shopify/polaris-icons';

export function GettingStarted({ onNavigate, subscription, hasOffers = false }) {
  // Check if user has selected a plan (not on free or has active subscription)
  const hasPlan = subscription && (subscription.plan_id !== 'free' || subscription.is_active);
  const planName = subscription?.plan_name || 'Free';
  
  const steps = [
    {
      title: hasPlan ? `Current Plan (${planName})` : 'Choose your plan',
      description: 'Select a plan that fits your business needs',
      completed: hasPlan,
      action: () => onNavigate('plans'),
      actionLabel: hasPlan ? 'View Plans' : 'View Plans',
    },
    {
      title: hasOffers ? 'View your offers' : 'Create your first offer',
      description: 'Set up a post-purchase offer to boost your revenue',
      completed: hasOffers,
      action: () => onNavigate(hasOffers ? 'offers' : 'create-offer'),
      actionLabel: hasOffers ? 'View Offers' : 'Create Offer',
    },
    {
      title: 'Configure targeting rules',
      description: 'Define when and to whom your offers will be shown',
      completed: false,
      action: () => onNavigate('create-offer'),
      actionLabel: 'Set Rules',
    },
    {
      title: 'Monitor performance',
      description: 'Track your offers and optimize for better results',
      completed: false,
      action: () => onNavigate('analytics'),
      actionLabel: 'View Analytics',
    },
  ];

  const completedSteps = steps.filter((step) => step.completed).length;
  const percentage = (completedSteps / steps.length) * 100;
  const isNearLimit = percentage >= 75;

  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <Text as="h2" variant="headingMd">
            Getting Started
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Complete these steps to start maximizing your revenue with post-purchase offers
          </Text>
        </BlockStack>

        <ProgressBar
          progress={percentage}
          tone={isNearLimit ? "critical" : "primary"}
          size="small"
        />

        <Text as="p" variant="bodySm" tone="subdued">
          {completedSteps} of {steps.length} steps completed
        </Text>

        <BlockStack gap="300">
          {steps.map((step, index) => (
            <div
              key={index}
              style={{
                padding: '12px',
                border: '1px solid #e4e5e7',
                borderRadius: '8px',
                backgroundColor: step.completed ? '#f6f6f7' : '#ffffff',
              }}
            >
              <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="300" blockAlign="center">
                  {step.completed ? (
                    <div style={{ color: '#008060' }}>
                      <Icon source={CheckCircleIcon} />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid #c4cdd5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#637381',
                        fontSize: '12px',
                      }}
                    >
                      {index + 1}
                    </div>
                  )}
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      {step.title}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {step.description}
                    </Text>
                  </BlockStack>
                </InlineStack>
                {!step.completed && step.action && (
                  <Button size="slim" onClick={step.action}>
                    {step.actionLabel}
                  </Button>
                )}
              </InlineStack>
            </div>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}