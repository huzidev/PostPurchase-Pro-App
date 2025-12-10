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

export function Analytics({ onNavigate, initialAnalytics = null, initialOffers = [], initialDateRange = 'last_30_days' }) {
  const [dateRange, setDateRange] = useState(initialDateRange);

  const dateRangeOptions = [
    { label: 'Last 7 days', value: 'last_7_days' },
    { label: 'Last 30 days', value: 'last_30_days' },
    { label: 'Last 90 days', value: 'last_90_days' },
    { label: 'Last 12 months', value: 'last_12_months' },
  ];

  // Handle date range change
  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
    // Redirect to update URL and trigger new data fetch
    window.location.href = `/app/analytics?dateRange=${newDateRange}`;
  };

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

  // Prepare top performing offers data from real data
  const topPerformingOffers = initialOffers
    .sort((a, b) => (b.analytics?.revenue || 0) - (a.analytics?.revenue || 0))
    .slice(0, 5)
    .map((offer) => [
      offer.name || 'Untitled Offer',
      (offer.analytics?.impressions || 0).toLocaleString(),
      (offer.analytics?.conversions || 0).toLocaleString(),
      formatPercentage(offer.conversionRate || 0),
      formatCurrency(offer.analytics?.revenue || 0),
      <Badge key={offer.id} tone={offer.status === 'active' ? 'success' : 'warning'}>
        {offer.status === 'active' ? 'Active' : 'Paused'}
      </Badge>
    ]);

  // Calculate conversion funnel from analytics data
  const totalImpressions = initialAnalytics?.impressions || 0;
  const totalViews = initialAnalytics?.views || 0;
  const totalConversions = initialAnalytics?.conversions || 0;
  const totalDeclines = initialAnalytics?.declines || 0;
  
  const conversionFunnel = [
    { 
      step: 'Offers Shown', 
      count: totalImpressions, 
      percentage: 100 
    },
    { 
      step: 'Offers Viewed', 
      count: totalViews, 
      percentage: totalImpressions > 0 ? (totalViews / totalImpressions) * 100 : 0
    },
    { 
      step: 'Customer Interaction', 
      count: totalConversions + totalDeclines, 
      percentage: totalImpressions > 0 ? ((totalConversions + totalDeclines) / totalImpressions) * 100 : 0
    },
    { 
      step: 'Offers Accepted', 
      count: totalConversions, 
      percentage: totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0
    },
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
              onChange={handleDateRangeChange}
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
                    {formatCurrency(initialAnalytics?.total_revenue || 0)}
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ArrowUpIcon} tone="success" />
                    <Text as="p" variant="bodySm" tone="success">
                      {totalConversions > 0 ? `${totalConversions} conversions` : 'No conversions yet'}
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
                    {(initialAnalytics?.impressions || 0).toLocaleString()}
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ArrowUpIcon} tone="success" />
                    <Text as="p" variant="bodySm" tone="success">
                      {totalViews > 0 ? `${totalViews.toLocaleString()} viewed` : 'No views yet'}
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
                    {formatPercentage(initialAnalytics?.conversion_rate || 0)}
                  </Text>
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={ArrowUpIcon} tone="success" />
                    <Text as="p" variant="bodySm" tone="success">
                      {totalDeclines > 0 ? `${totalDeclines.toLocaleString()} declined` : 'No declines yet'}
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
                    {totalConversions > 0 ? formatCurrency((initialAnalytics?.total_revenue || 0) / totalConversions) : '$0'}
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
                    'text',
                  ]}
                  headings={[
                    'Offer Name',
                    'Shown',
                    'Accepted',
                    'Conv. Rate',
                    'Revenue',
                    'Status',
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
                  <Banner tone={initialAnalytics?.conversion_rate > 20 ? "success" : "info"}>
                    <Text as="p" variant="bodyMd">
                      <strong>{initialAnalytics?.conversion_rate > 20 ? 'Great performance!' : 'Room for improvement!'}</strong> Your conversion rate is {formatPercentage(initialAnalytics?.conversion_rate || 0)}, {initialAnalytics?.conversion_rate > 20 ? 'which is above' : 'compared to'} the industry average of 20-25%.
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