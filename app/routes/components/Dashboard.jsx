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
import { useSubscription } from '../../hooks/useSubscription';

export function Dashboard({ onNavigate, hasOffers = false }) {
  const { subscription } = useSubscription();
  
  const stats = [
    { label: 'Total Offers', value: hasOffers ? '3' : '0', change: hasOffers ? '+3 this month' : 'No offers yet' },
    { label: 'Active Offers', value: hasOffers ? '2' : '0', change: hasOffers ? '1 paused' : 'Create your first offer' },
    { label: 'Total Revenue', value: hasOffers ? '$24,567' : '$0', change: hasOffers ? '+12.5% vs last month' : 'Start earning revenue' },
    { label: 'Conversion Rate', value: hasOffers ? '23.4%' : '0%', change: hasOffers ? '+2.1% vs last month' : 'Track performance' },
  ];

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
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Total Revenue
                    </Text>
                    <Tooltip content="Total revenue generated from post-purchase offers">
                      <Icon source={QuestionCircleIcon} tone="subdued" />
                    </Tooltip>
                  </InlineStack>
                  <Text as="h2" variant="headingXl">
                    $12,458
                  </Text>
                  <Text as="p" variant="bodySm" tone="success">
                    +23.5% from last month
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Conversion Rate
                    </Text>
                    <Tooltip content="Percentage of customers who accepted offers">
                      <Icon source={QuestionCircleIcon} tone="subdued" />
                    </Tooltip>
                  </InlineStack>
                  <Text as="h2" variant="headingXl">
                    18.2%
                  </Text>
                  <Text as="p" variant="bodySm" tone="success">
                    +2.1% from last month
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Offers Shown
                    </Text>
                    <Tooltip content="Number of times offers were displayed to customers">
                      <Icon source={QuestionCircleIcon} tone="subdued" />
                    </Tooltip>
                  </InlineStack>
                  <Text as="h2" variant="headingXl">
                    1,847
                  </Text>
                  <Text as="p" variant="bodySm" tone="success">
                    +15.3% from last month
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Active Offers
                    </Text>
                    <Tooltip content="Number of currently active post-purchase offers">
                      <Icon source={QuestionCircleIcon} tone="subdued" />
                    </Tooltip>
                  </InlineStack>
                  <Text as="h2" variant="headingXl">
                    5
                  </Text>
                  <Text as="p" variant="bodySm">
                    3 offers paused
                  </Text>
                </BlockStack>
              </Card>
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