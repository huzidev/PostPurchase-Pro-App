import React, { useState } from 'react';
import {
  Page,
  Card,
  DataTable,
  Badge,
  Button,
  ButtonGroup,
  Filters,
  ChoiceList,
  Text,
  InlineStack,
  BlockStack,
  EmptyState,
} from '@shopify/polaris';

export function OffersList({ onCreateOffer, onEditOffer, onNavigate }) {
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [selectedType, setSelectedType] = useState([]);
  const [queryValue, setQueryValue] = useState('');

  const mockOffers = [
    {
      id: '1',
      name: 'Summer Sale Bundle',
      status: 'active',
      type: 'bundle',
      impressions: 1543,
      conversions: 528,
      revenue: 15840,
      createdAt: '2025-01-15',
    },
    {
      id: '2',
      name: 'Premium Accessories Upsell',
      status: 'active',
      type: 'product',
      impressions: 892,
      conversions: 251,
      revenue: 7530,
      createdAt: '2025-01-10',
    },
    {
      id: '3',
      name: '15% Off Next Purchase',
      status: 'paused',
      type: 'discount',
      impressions: 2341,
      conversions: 456,
      revenue: 9120,
      createdAt: '2025-01-05',
    },
    {
      id: '4',
      name: 'Winter Collection Bundle',
      status: 'active',
      type: 'bundle',
      impressions: 1876,
      conversions: 773,
      revenue: 23190,
      createdAt: '2024-12-20',
    },
    {
      id: '5',
      name: 'Free Shipping Offer',
      status: 'scheduled',
      type: 'discount',
      impressions: 0,
      conversions: 0,
      revenue: 0,
      createdAt: '2025-01-18',
    },
    {
      id: '6',
      name: 'Bestseller Add-on',
      status: 'active',
      type: 'product',
      impressions: 1234,
      conversions: 389,
      revenue: 11670,
      createdAt: '2024-12-15',
    },
  ];

  const getStatusBadge = (status) => {
    const toneMap = {
      active: 'success',
      paused: 'attention',
      scheduled: 'info',
    };
    return <Badge tone={toneMap[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const filteredOffers = mockOffers.filter((offer) => {
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(offer.status);
    const matchesType = selectedType.length === 0 || selectedType.includes(offer.type);
    const matchesQuery =
      queryValue === '' ||
      offer.name.toLowerCase().includes(queryValue.toLowerCase());
    return matchesStatus && matchesType && matchesQuery;
  });

  const rows = filteredOffers.map((offer) => [
    offer.name,
    getStatusBadge(offer.status),
    offer.type.charAt(0).toUpperCase() + offer.type.slice(1),
    offer.impressions.toLocaleString(),
    offer.conversions.toLocaleString(),
    `${((offer.conversions / (offer.impressions || 1)) * 100).toFixed(1)}%`,
    `$${offer.revenue.toLocaleString()}`,
    <ButtonGroup key={offer.id}>
      <Button size="slim" onClick={() => onEditOffer(offer.id)}>
        Edit
      </Button>
      <Button size="slim" variant="primary">
        {offer.status === 'active' ? 'Pause' : 'Activate'}
      </Button>
    </ButtonGroup>,
  ]);

  const filters = [
    {
      key: 'status',
      label: 'Status',
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: 'Active', value: 'active' },
            { label: 'Paused', value: 'paused' },
            { label: 'Scheduled', value: 'scheduled' },
          ]}
          selected={selectedStatus}
          onChange={setSelectedStatus}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: 'type',
      label: 'Offer Type',
      filter: (
        <ChoiceList
          title="Offer Type"
          titleHidden
          choices={[
            { label: 'Product', value: 'product' },
            { label: 'Discount', value: 'discount' },
            { label: 'Bundle', value: 'bundle' },
          ]}
          selected={selectedType}
          onChange={setSelectedType}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = [];
  if (selectedStatus.length > 0) {
    appliedFilters.push({
      key: 'status',
      label: `Status: ${selectedStatus.join(', ')}`,
      onRemove: () => setSelectedStatus([]),
    });
  }
  if (selectedType.length > 0) {
    appliedFilters.push({
      key: 'type',
      label: `Type: ${selectedType.join(', ')}`,
      onRemove: () => setSelectedType([]),
    });
  }

  const handleClearAll = () => {
    setSelectedStatus([]);
    setSelectedType([]);
    setQueryValue('');
  };

  return (
    <Page
      title="Post Purchase Offers"
      backAction={onNavigate ? { onAction: () => onNavigate('dashboard') } : undefined}
      primaryAction={{
        content: 'Create Offer',
        onAction: onCreateOffer,
      }}
    >
      <Card padding="0">
        <BlockStack gap="0">
          <div style={{ padding: '16px' }}>
            <Filters
              queryValue={queryValue}
              filters={filters}
              appliedFilters={appliedFilters}
              onQueryChange={setQueryValue}
              onQueryClear={() => setQueryValue('')}
              onClearAll={handleClearAll}
              queryPlaceholder="Search offers..."
            />
          </div>
          {filteredOffers.length === 0 ? (
            <div style={{ padding: '40px 16px' }}>
              <EmptyState
                heading="No offers found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Try changing the filters or search term</p>
              </EmptyState>
            </div>
          ) : (
            <DataTable
              columnContentTypes={[
                'text',
                'text',
                'text',
                'numeric',
                'numeric',
                'numeric',
                'numeric',
                'text',
              ]}
              headings={[
                'Offer Name',
                'Status',
                'Type',
                'Impressions',
                'Conversions',
                'Conv. Rate',
                'Revenue',
                'Actions',
              ]}
              rows={rows}
            />
          )}
        </BlockStack>
      </Card>
    </Page>
  );
}