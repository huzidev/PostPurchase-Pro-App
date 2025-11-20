import React, { useState } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineGrid,
  Button,
  Select,
  DataTable,
  Badge,
  InlineStack,
  Icon,
  Tooltip,
  ProgressBar,
  Banner,
} from '@shopify/polaris';
import { QuestionCircleIcon, ArrowUpIcon } from '@shopify/polaris-icons';

export function Analytics({ onNavigate }) {
  const [dateRange, setDateRange] = useState('last_30_days');

  const dateRangeOptions = [
    { label: 'Last 7 days', value: 'last_7_days' },
    { label: 'Last 30 days', value: 'last_30_days' },
    { label: 'Last 90 days', value: 'last_90_days' },
    { label: 'Last 12 months', value: 'last_12_months' },
  ];

  const topPerformingOffers = [
    ['Summer Sale Bundle', '1,543', '528', '34.2%', '$15,840'],
    ['Winter Collection Bundle', '1,876', '773', '41.2%', '$23,190'],
    ['Premium Accessories Upsell', '892', '251', '28.1%', '$7,530'],
    ['Bestseller Add-on', '1,234', '389', '31.5%', '$11,670'],
    ['15% Off Next Purchase', '2,341', '456', '19.5%', '$9,120'],
  ];

  const conversionFunnel = [
    { step: 'Offers Shown', count: 8756, percentage: 100 },
    { step: 'Offers Viewed', count: 6842, percentage: 78.1 },
    { step: 'Add to Cart Clicked', count: 2891, percentage: 33.0 },
    { step: 'Offers Accepted', count: 2397, percentage: 27.4 },
  ];

  return (
    <Page
      title="Analytics & Reports"
      backAction={onNavigate ? { onAction: () => onNavigate('dashboard') } : undefined}
    >
      <BlockStack gap="500">
        {/* Date Range Filter */}
        <Card>
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Performance Overview
            </Text>
            <Select
              label="Date Range"
              labelHidden
              options={dateRangeOptions}
              value={dateRange}
              onChange={setDateRange}
            />
          </InlineStack>
        </Card>

        <Layout>
          {/* Key Metrics */}
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Total Revenue
                    </Text>
                    <Tooltip content="Revenue generated from all post-purchase offers">
                      <Icon source={QuestionCircleIcon} tone="subdued" />
                    </Tooltip>
                  </InlineStack>
                  <Text as="h2" variant="headingXl">
                    $67,350
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ArrowUpIcon} tone="success" />
                    <Text as="p" variant="bodySm" tone="success">
                      +18.5% vs previous period
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Offers Shown
                    </Text>
                    <Tooltip content="Total number of times offers were displayed">
                      <Icon source={QuestionCircleIcon} tone="subdued" />
                    </Tooltip>
                  </InlineStack>
                  <Text as="h2" variant="headingXl">
                    8,756
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ArrowUpIcon} tone="success" />
                    <Text as="p" variant="bodySm" tone="success">
                      +12.3% vs previous period
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Conversion Rate
                    </Text>
                    <Tooltip content="Percentage of shown offers that were accepted">
                      <Icon source={QuestionCircleIcon} tone="subdued" />
                    </Tooltip>
                  </InlineStack>
                  <Text as="h2" variant="headingXl">
                    27.4%
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ArrowUpIcon} tone="success" />
                    <Text as="p" variant="bodySm" tone="success">
                      +3.2% vs previous period
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Average Order Value
                    </Text>
                    <Tooltip content="Average value of orders with accepted offers">
                      <Icon source={QuestionCircleIcon} tone="subdued" />
                    </Tooltip>
                  </InlineStack>
                  <Text as="h2" variant="headingXl">
                    $28.10
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ArrowUpIcon} tone="success" />
                    <Text as="p" variant="bodySm" tone="success">
                      +5.7% vs previous period
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>
            </InlineGrid>
          </Layout.Section>

          {/* Conversion Funnel */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Conversion Funnel
                </Text>
                <BlockStack gap="300">
                  {conversionFunnel.map((step, index) => (
                    <div key={step.step}>
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="p" variant="bodyMd">
                          {step.step}
                        </Text>
                        <InlineStack gap="400" blockAlign="center">
                          <Text as="p" variant="bodyMd" fontWeight="semibold">
                            {step.count.toLocaleString()}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            ({step.percentage}%)
                          </Text>
                        </InlineStack>
                      </InlineStack>
                      <div style={{ marginTop: '8px' }}>
                        <ProgressBar progress={step.percentage} />
                      </div>
                      {index < conversionFunnel.length - 1 && (
                        <div style={{ 
                          margin: '12px 0',
                          textAlign: 'center',
                          color: '#6d7175',
                          fontSize: '12px'
                        }}>
                          ↓
                        </div>
                      )}
                    </div>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Top Performing Offers */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Top Performing Offers
                  </Text>
                  <Button onClick={() => onNavigate && onNavigate('offers')} variant="plain">
                    View All Offers
                  </Button>
                </InlineStack>
                <DataTable
                  columnContentTypes={[
                    'text',
                    'numeric',
                    'numeric',
                    'numeric',
                    'numeric',
                  ]}
                  headings={[
                    'Offer Name',
                    'Shown',
                    'Accepted',
                    'Conv. Rate',
                    'Revenue',
                  ]}
                  rows={topPerformingOffers}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Insights & Recommendations */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Insights & Recommendations
                </Text>
                <BlockStack gap="300">
                  <Banner tone="success">
                    <Text as="p" variant="bodyMd">
                      <strong>Great performance!</strong> Your conversion rate is 27.4%, which is above the industry average of 20-25%.
                    </Text>
                  </Banner>
                  <Banner tone="info">
                    <Text as="p" variant="bodyMd">
                      <strong>Optimization opportunity:</strong> The "Winter Collection Bundle" has a 41.2% conversion rate. Consider creating similar bundle offers.
                    </Text>
                  </Banner>
                  <Banner tone="attention">
                    <Text as="p" variant="bodyMd">
                      <strong>Low performer:</strong> The "15% Off Next Purchase" offer has only a 19.5% conversion rate. Consider testing different discount amounts or offer types.
                    </Text>
                  </Banner>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Quick Actions */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Quick Actions
                </Text>
                <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="300">
                  <Button onClick={() => onNavigate && onNavigate('create-offer')} variant="primary">
                    Create New Offer
                  </Button>
                  <Button onClick={() => onNavigate && onNavigate('offers')}>
                    Optimize Existing Offers
                  </Button>
                  <Button>
                    Export Report
                  </Button>
                </InlineGrid>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}