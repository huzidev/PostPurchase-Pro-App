import React from 'react';
import {
  Card,
  Text,
  BlockStack,
  Button,
  Badge,
  List,
} from '@shopify/polaris';

export function PlanCard({ plan, currentPlan, onPlanAction, getPlanPriority, loading = false, disabled = false }) {
  const isCurrentPlan = currentPlan === plan.id;
  const currentPriority = getPlanPriority ? getPlanPriority(currentPlan) : 0;
  const planPriority = getPlanPriority ? getPlanPriority(plan.id) : 0;
  const isDowngrade = planPriority < currentPriority;
  
  return (
    <Card key={plan.id}>
      <BlockStack gap="400">
        <div style={{ textAlign: 'center' }}>
          {plan.popular && (
            <div style={{ marginBottom: '12px' }}>
              <Badge tone="success">Most Popular</Badge>
            </div>
          )}
          <Text as="h2" variant="headingLg">
            {plan.name}
          </Text>
          <div style={{ margin: '16px 0' }}>
            <Text as="p" variant="heading2xl">
              {plan.price}
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              {plan.period}
            </Text>
          </div>
        </div>

        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">
            Features:
          </Text>
          <List type="bullet">
            {plan.features.map((feature, index) => (
              <List.Item key={index}>{feature}</List.Item>
            ))}
          </List>
        </BlockStack>

        {plan.limitations.length > 0 && (
          <BlockStack gap="300">
            <Text as="h3" variant="headingSm" tone="subdued">
              Limitations:
            </Text>
            <List type="bullet">
              {plan.limitations.map((limitation, index) => (
                <List.Item key={index}>
                  <Text as="span" tone="subdued">
                    {limitation}
                  </Text>
                </List.Item>
              ))}
            </List>
          </BlockStack>
        )}

        <div style={{ marginTop: 'auto' }}>
          {isCurrentPlan ? (
            <Button fullWidth disabled>
              Current Plan
            </Button>
          ) : (
            <Button
              fullWidth
              variant={plan.popular && !isDowngrade ? 'primary' : 'secondary'}
              tone={isDowngrade ? 'critical' : undefined}
              onClick={() => onPlanAction(plan)}
              loading={loading}
              disabled={disabled}
            >
              {plan.id === 'enterprise' 
                ? 'Contact Sales' 
                : isDowngrade 
                  ? 'Downgrade' 
                  : 'Upgrade'}
            </Button>
          )}
        </div>
      </BlockStack>
    </Card>
  );
}