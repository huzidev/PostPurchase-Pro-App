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
  Modal,
  Toast,
  Frame,
} from '@shopify/polaris';
import { useFetcher } from 'react-router';

export function OffersList({ 
  offers = [], 
  onCreateOffer, 
  onEditOffer, 
  onNavigate, 
  error,
  subscription = null,
  usage = null,
  canActivateOffers = true,
  limitMessage = ''
}) {
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [selectedType, setSelectedType] = useState([]);
  const [queryValue, setQueryValue] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const fetcher = useFetcher();

  // Helper function to show toast
  const showToast = (message) => {
    setToastMessage(message);
    setToastActive(true);
  };

  // Handle fetcher response for status updates
  React.useEffect(() => {
    if (fetcher.data && fetcher.data.intent === 'update-status') {
      setIsUpdatingStatus(false);
      setShowStatusModal(false);
      
      if (fetcher.data.status === 200) {
        showToast(fetcher.data.message || 'Offer status updated successfully!');
      } else if (fetcher.data.limitReached) {
        // Don't show toast for limit errors, modal will handle it
        setShowLimitModal(true);
      } else {
        showToast(fetcher.data.message || 'Failed to update offer status');
      }
    }
  }, [fetcher.data]);

  // Helper function to determine offer type based on discount_type and products
  const getOfferType = (offer) => {
    if (offer.products && offer.products.length > 1) {
      return 'bundle';
    } else if (offer.products && offer.products.length === 1) {
      return 'product';
    } else {
      return 'discount';
    }
  };

  // Helper function to get analytics data with fallbacks
  const getOfferAnalytics = (offer) => {
    if (!offer.analytics || !Array.isArray(offer.analytics) || offer.analytics.length === 0) {
      return { impressions: 0, conversions: 0, revenue: 0 };
    }
    
    return offer.analytics.reduce((acc, curr) => ({
      impressions: acc.impressions + (curr.impressions || 0),
      conversions: acc.conversions + (curr.conversions || 0),
      revenue: acc.revenue + (parseFloat(curr.revenue) || 0)
    }), { impressions: 0, conversions: 0, revenue: 0 });
  };

  const getStatusBadge = (status) => {
    const toneMap = {
      active: 'success',
      paused: 'attention',
      scheduled: 'info',
    };
    return <Badge tone={toneMap[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const handleStatusChange = (offer) => {
    setSelectedOffer(offer);
    
    // If trying to activate an offer and limits are reached, show limit modal
    if (offer.status === 'paused' && !canActivateOffers) {
      setShowLimitModal(true);
    } else {
      setShowStatusModal(true);
    }
  };

  const handleConfirmStatusChange = () => {
    if (!selectedOffer) return;
    
    setIsUpdatingStatus(true);
    
    const newStatus = selectedOffer.status === 'active' ? 'paused' : 'active';
    
    const formData = new FormData();
    formData.append('intent', 'update-status');
    formData.append('offerId', selectedOffer.id);
    formData.append('status', newStatus);
    
    fetcher.submit(formData, { method: 'POST' });
    // Don't close modal here - wait for response
  };

  const handleCancelStatusChange = () => {
    if (isUpdatingStatus) return; // Don't allow cancel during update
    setShowStatusModal(false);
    setSelectedOffer(null);
  };



  const filteredOffers = offers.filter((offer) => {
    const offerType = getOfferType(offer);
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(offer.status);
    const matchesType = selectedType.length === 0 || selectedType.includes(offerType);
    const matchesQuery =
      queryValue === '' ||
      offer.name.toLowerCase().includes(queryValue.toLowerCase());
    return matchesStatus && matchesType && matchesQuery;
  });

  const rows = filteredOffers.map((offer) => {
    const analytics = getOfferAnalytics(offer);
    const offerType = getOfferType(offer);
    const conversionRate = analytics.impressions > 0 
      ? ((analytics.conversions / analytics.impressions) * 100).toFixed(1)
      : '0.0';
    
    return [
      offer.name,
      getStatusBadge(offer.status),
      offerType.charAt(0).toUpperCase() + offerType.slice(1),
      analytics.impressions.toLocaleString(),
      analytics.conversions.toLocaleString(),
      `${conversionRate}%`,
      `$${analytics.revenue.toLocaleString()}`,
      <ButtonGroup key={offer.id}>
        <Button variant="plain" size="slim" onClick={() => onEditOffer(offer.id)}>
          Edit
        </Button>
        <Button 
          size="slim" 
          variant='plain'
          onClick={() => handleStatusChange(offer)}
          loading={isUpdatingStatus && selectedOffer?.id === offer.id}
          disabled={isUpdatingStatus}
        >
          {offer.status === 'active' ? 'Pause' : 'Activate'}
        </Button>
      </ButtonGroup>,
    ];
  });

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

  const toastMarkup = toastActive && (
    <Toast
      content={toastMessage}
      onDismiss={() => setToastActive(false)}
    />
  );

  return (
    <Frame>
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
          {error ? (
            <div style={{ padding: '40px 16px' }}>
              <EmptyState
                heading="Error loading offers"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>There was an error loading your offers: {error}</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </EmptyState>
            </div>
          ) : offers.length === 0 ? (
            <div style={{ padding: '40px 16px' }}>
              <EmptyState
                heading="Create your first offer"
                action={{
                  content: 'Create Offer',
                  onAction: onCreateOffer,
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Get started by creating your first post-purchase offer to increase your average order value.</p>
              </EmptyState>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div style={{ padding: '40px 16px' }}>
              <EmptyState
                heading="No offers match your search"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Try changing your filters or search term to see more offers.</p>
                <Button onClick={handleClearAll}>Clear all filters</Button>
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

      {/* Status Change Confirmation Modal */}
      <Modal
        open={showStatusModal}
        onClose={handleCancelStatusChange}
        title={selectedOffer?.status === 'active' ? 'Pause Offer' : 'Activate Offer'}
        primaryAction={{
          content: selectedOffer?.status === 'active' ? 'Pause Offer' : 'Activate Offer',
          onAction: handleConfirmStatusChange,
          destructive: selectedOffer?.status === 'active',
          loading: isUpdatingStatus,
          disabled: isUpdatingStatus,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleCancelStatusChange,
            disabled: isUpdatingStatus,
          },
        ]}
      >
        <Modal.Section>
          {selectedOffer?.status === 'active' ? (
            <Text>
              Are you sure you want to pause "{selectedOffer?.name}"? This will hide the offer from customers and stop new impressions.
            </Text>
          ) : (
            <Text>
              Are you sure you want to activate "{selectedOffer?.name}"? This will make the offer visible to customers again.
            </Text>
          )}
        </Modal.Section>
      </Modal>

      {/* Limit Reached Modal */}
      <Modal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title="Plan Limit Reached"
        primaryAction={{
          content: 'Upgrade Plan',
          onAction: () => {
            setShowLimitModal(false);
            onNavigate('plans');
          },
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowLimitModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text>
              You've reached your plan limit for active offers. To activate "{selectedOffer?.name}", please upgrade your plan or pause other active offers first.
            </Text>
            {subscription && usage && (
              <Text variant="bodyMd" tone="subdued">
                You're currently on the <strong>{subscription.plan_name}</strong> plan 
                with {usage.active_offers_count} of {subscription.max_active_offers} offers active.
              </Text>
            )}
            {limitMessage && (
              <Text variant="bodyMd" tone="subdued">
                {limitMessage}
              </Text>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>

      </Page>
      {toastMarkup}
    </Frame>
  );
}