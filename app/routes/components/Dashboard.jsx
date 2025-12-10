import React from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineGrid,
  Button,
  DataTable,
  Badge,
  ButtonGroup,
  InlineStack,
  Icon,
  Tooltip,
} from '@shopify/polaris';
import { QuestionCircleIcon } from '@shopify/polaris-icons';
import { GettingStarted } from './GettingStarted';
import { useSubscription } from '../../hooks/useSubscription.jsx';

export function Dashboard({ onNavigate, hasOffers = false, initialSubscription = null, initialAnalytics = null }) {
  const { subscription: hookSubscription } = useSubscription();
  
  // Use loader data if available, fallback to hook data
  const subscription = initialSubscription || hookSubscription;
  const analytics = initialAnalytics;

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (rate) => {
    if (!rate || rate === 0) return '0%';
    return `${rate.toFixed(1)}%`;
  };

  // Get stats with SSR data
  const stats = [
    { 
      label: 'Total Offers', 
      value: analytics?.total_offers?.toString() || '0', 
      change: analytics?.total_offers > 0 ? `${analytics.total_offers} created` : 'No offers yet'
    },
    { 
      label: 'Active Offers', 
      value: analytics?.active_offers?.toString() || '0', 
      change: analytics?.active_offers > 0 ? `${analytics.active_offers} running` : 'Create your first offer'
    },
    { 
      label: 'Total Revenue', 
      value: formatCurrency(analytics?.total_revenue || 0), 
      change: analytics?.total_revenue > 0 ? `${analytics.conversions || 0} conversions` : 'Start earning revenue'
    },
    { 
      label: 'Conversion Rate', 
      value: formatPercentage(analytics?.conversion_rate || 0), 
      change: analytics?.impressions > 0 ? `${analytics.impressions} impressions` : 'Track performance'
    },
  ];

  // Sample data for recent offers (could be enhanced to fetch real offer data)
  const recentOffers = [
    ['Summer Sale Bundle', <Badge key="1" tone="success">Active</Badge>, '156', '34.2%', '$4,234'],
    ['Accessories Upsell', <Badge key="2" tone="success">Active</Badge>, '89', '28.1%', '$2,134'],
    ['Premium Upgrade', <Badge key="3" tone="attention">Paused</Badge>, '67', '19.4%', '$1,876'],
    ['Winter Collection', <Badge key="4" tone="success">Active</Badge>, '234', '41.2%', '$6,543'],
  ];

  return (
    <Page
      title="Dashboard"
      primaryAction={{
        content: 'Create Offer',
        onAction: () => onNavigate('create-offer'),
      }}
    >
      <BlockStack gap="500">
        {/* Getting Started Section */}
        <GettingStarted 
          onNavigate={onNavigate} 
          subscription={subscription}
          hasOffers={hasOffers}
        />

        {/* Stats Overview */}
        <Layout>
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {stat.label}
                      </Text>
                      <Tooltip content={`${stat.label} metrics for your post-purchase offers`}>
                        <Icon source={QuestionCircleIcon} tone="subdued" />
                      </Tooltip>
                    </InlineStack>
                    <Text as="h2" variant="headingXl">
                      {stat.value}
                    </Text>
                    <Text as="p" variant="bodySm" tone={analytics?.total_revenue > 0 ? "success" : "subdued"}>
                      {stat.change}
                    </Text>
                  </BlockStack>
                </Card>
              ))}

              {/* All stats now dynamically loaded above */}
            </InlineGrid>
          </Layout.Section>

          {/* Quick Actions */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Quick Actions
                </Text>
                <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="300">
                  <Button onClick={() => onNavigate('create-offer')} variant="primary">
                    Create New Offer
                  </Button>
                  <Button onClick={() => onNavigate('offers')}>
                    Manage Offers
                  </Button>
                  <Button onClick={() => onNavigate('analytics')}>
                    View Analytics
                  </Button>
                </InlineGrid>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Recent Offers Performance */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Top Performing Offers
                  </Text>
                  <Button onClick={() => onNavigate('offers')} variant="plain">
                    View All
                  </Button>
                </InlineStack>
                <DataTable
                  columnContentTypes={[
                    'text',
                    'text',
                    'numeric',
                    'numeric',
                    'numeric',
                  ]}
                  headings={[
                    'Offer Name',
                    'Status',
                    'Shown',
                    'Conversion Rate',
                    'Revenue',
                  ]}
                  rows={recentOffers}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}