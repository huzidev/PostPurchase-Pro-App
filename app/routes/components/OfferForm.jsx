import React, { useState, useCallback, useEffect } from 'react';
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  InlineGrid,
  Text,
  ButtonGroup,
  Badge,
  Banner,
  InlineStack,
  Icon,
  Tooltip,
  Divider,
  Layout,
  Checkbox,
  Thumbnail,
  Toast,
  Frame,
} from '@shopify/polaris';
import { PlusIcon, QuestionCircleIcon, ImageIcon } from '@shopify/polaris-icons';
import { useFetcher } from 'react-router';
import { useAppBridge } from '@shopify/app-bridge-react';

export function OfferForm({ 
  offerId, 
  offer, 
  mode = 'create',
  onSaved, 
  onNavigate, 
  canSaveOffer = true,
  isLimitReached = false,
  offerLimitMessage = '',
  subscription = null,
  usage = null
}) {
  const isEditing = mode === 'edit' || !!offerId;
  const fetcher = useFetcher();
  const app = useAppBridge();

  // Helper function to safely parse dates
  const safeDateParse = (dateValue) => {
    if (!dateValue) return '';
    if (typeof dateValue !== 'string') return '';
    try {
      return dateValue.split('T')[0];
    } catch (error) {
      console.warn('Error parsing date:', dateValue, error);
      return '';
    }
  };

  // Form state
  const [formData, setFormData] = useState(() => {
    if (isEditing && offer) {
      // Normalize product data from database to match ResourcePicker format
      const normalizedProducts = (offer.products || []).map(product => ({
        ...product,
        // Ensure all expected fields are available
        id: product.shopify_product_id,
        title: product.product_title,
        variantId: product.shopify_variant_id,
        variantTitle: product.variant_title,
        price: product.variant_price || product.product_price,
        displayTitle: product.variant_title 
          ? `${product.product_title} - ${product.variant_title}`
          : product.product_title,
        imageUrl: product.image_url,
        variantsCount: product.variants_count || 1,
      }));

      // Normalize purchased product data from database to match ResourcePicker format
      const normalizedPurchasedProducts = (offer.purchasedProducts || []).map(product => ({
        ...product,
        // Ensure all expected fields are available
        id: product.shopify_product_id,
        title: product.product_title,
        variantId: product.shopify_variant_id,
        variantTitle: product.variant_title,
        price: product.variant_price || product.product_price,
        displayTitle: product.variant_title 
          ? `${product.product_title} - ${product.variant_title}`
          : product.product_title,
        imageUrl: product.image_url,
        variantsCount: product.variants_count || 1,
      }));

      return {
        name: offer.name || '',
        description: offer.description || '',
        status: offer.status || 'active',
        selectedProducts: normalizedProducts,
        selectedPurchasedProducts: normalizedPurchasedProducts,
        discountType: offer.discount_type || 'percentage',
        discountValue: offer.discount_value?.toString() || '10',
        offerTitle: offer.offer_title || 'Special Offer Just For You!',
        offerDescription: offer.offer_description || 'Get this amazing deal on your next purchase',
        buttonText: offer.button_text || 'Add to Order',
        targetingRules: [],
        limitPerCustomer: offer.limit_per_customer?.toString() || '1',
        totalLimit: offer.total_limit?.toString() || '',
        expiryDate: safeDateParse(offer.expiry_date),
        scheduleStart: safeDateParse(offer.schedule_start),
        enableABTest: offer.enable_ab_test || false,
      };
    }
    
    return {
      name: '',
      description: '',
      status: 'active',
      selectedProducts: [],
      selectedPurchasedProducts: [],
      discountType: 'percentage',
      discountValue: '10',
      offerTitle: 'Special Offer Just For You!',
      offerDescription: 'Get this amazing deal on your next purchase',
      buttonText: 'Add to Order',
      targetingRules: [],
      limitPerCustomer: '1',
      totalLimit: '',
      expiryDate: '',
      scheduleStart: '',
      enableABTest: false,
    };
  });

  const [originalFormData, setOriginalFormData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);

  // Initialize original form data
  useEffect(() => {
    setOriginalFormData({ ...formData });
  }, []);

  // Check for changes
  useEffect(() => {
    const hasFormChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);
    setHasChanges(hasFormChanges);
  }, [formData, originalFormData]);

  // Handle fetcher response
  useEffect(() => {
    if (fetcher.data) {
      setIsLoading(false);
      
      if (fetcher.data.status === 200) {
        // Show success toast
        if (fetcher.data.showToast) {
          setToastMessage(fetcher.data.toastMessage || 'Operation completed successfully!');
          setToastError(false);
          setShowToast(true);
        }
        
        // Reset form state to disable buttons
        if (!isEditing) {
          // For create mode, reset hasChanges to disable save/cancel buttons
          setHasChanges(false);
          setOriginalFormData({ ...formData });
        }
        
        // Call onSaved after a brief delay to let user see the toast
        setTimeout(() => {
          onSaved && onSaved();
        }, 2000);
      } else {
        // Show error toast
        setToastMessage(fetcher.data.message || 'An error occurred while saving');
        setToastError(true);
        setShowToast(true);
        console.error("Error saving offer:", fetcher.data.message);
      }
    }
  }, [fetcher.data, onSaved, formData, isEditing]);

  const handleSelectProducts = useCallback(async () => {
    if (!app) {
      console.error('App Bridge not available');
      return;
    }

    try {
      const selected = await app.resourcePicker({
        type: 'product',
        multiple: true,
      });
      console.log("SW what is selected PRODUCT", selected);

      if (selected && selected.length > 0) {
        // Create entries for each variant of each selected product
        const selectedProductVariants = [];
        
        selected.forEach(product => {
          if (product.variants && product.variants.length > 0) {
            // Create an entry for each variant
            product.variants.forEach(variant => {
              const productVariantEntry = {
                // Product info
                id: product.id,
                title: product.title,
                vendor: product.vendor || '',
                
                // Variant info
                variantId: variant.id,
                variantTitle: variant.title,
                variantDisplayName: variant.displayName,
                variantPrice: `$${variant.price}`,
                
                // Image (use product image)
                imageUrl: product.images && product.images.length > 0 ? 
                  product.images[0].originalSrc : null,
                
                // Combined display info
                displayTitle: `${product.title} - ${variant.title}`,
                price: `$${variant.price}`,
                variantsCount: product.variants.length,
              };
              selectedProductVariants.push(productVariantEntry);
            });
          } else {
            // Fallback: product without variants
            const productEntry = {
              id: product.id,
              title: product.title,
              variantId: null,
              variantTitle: null,
              variantDisplayName: null,
              variantPrice: null,
              imageUrl: product.images && product.images.length > 0 ? 
                product.images[0].originalSrc : null,
              displayTitle: product.title,
              price: 'Price not available',
              variantsCount: 0,
              vendor: product.vendor || '',
            };
            selectedProductVariants.push(productEntry);
          }
        });

        // Add selected product variants to form data, avoiding duplicates
        const updatedProducts = [...formData.selectedProducts];
        selectedProductVariants.forEach(newProductVariant => {
          // Check for duplicates based on product ID + variant ID combination
          const isDuplicate = updatedProducts.some(existingProduct => 
            existingProduct.id === newProductVariant.id && 
            existingProduct.variantId === newProductVariant.variantId
          );
          
          if (!isDuplicate) {
            updatedProducts.push(newProductVariant);
          }
        });

        setFormData({ ...formData, selectedProducts: updatedProducts });
      }

    } catch (error) {
      console.error('Error opening resource picker:', error);
      // Handle cancellation or other errors gracefully
      if (error.message !== 'User cancelled resource selection') {
        setToastMessage('Unable to open product picker. Please try again.');
        setToastError(true);
        setShowToast(true);
      }
    }
  }, [app, formData]);

  const handleSelectPurchasedProducts = useCallback(async () => {
    if (!app) {
      console.error('App Bridge not available');
      return;
    }

    try {
      const selected = await app.resourcePicker({
        type: 'product',
        multiple: true,
      });
      console.log("SW what is selected PURCHASED PRODUCT", selected);

      if (selected && selected.length > 0) {
        // Create entries for each variant of each selected product
        const selectedProductVariants = [];
        
        selected.forEach(product => {
          if (product.variants && product.variants.length > 0) {
            // Create an entry for each variant
            product.variants.forEach(variant => {
              const productVariantEntry = {
                // Product info
                id: product.id,
                title: product.title,
                vendor: product.vendor || '',
                
                // Variant info
                variantId: variant.id,
                variantTitle: variant.title,
                variantDisplayName: variant.displayName,
                variantPrice: `$${variant.price}`,
                
                // Image (use product image)
                imageUrl: product.images && product.images.length > 0 ? 
                  product.images[0].originalSrc : null,
                
                // Combined display info
                displayTitle: `${product.title} - ${variant.title}`,
                price: `$${variant.price}`,
                variantsCount: product.variants.length,
              };
              selectedProductVariants.push(productVariantEntry);
            });
          } else {
            // Fallback: product without variants
            const productEntry = {
              id: product.id,
              title: product.title,
              variantId: null,
              variantTitle: null,
              variantDisplayName: null,
              variantPrice: null,
              imageUrl: product.images && product.images.length > 0 ? 
                product.images[0].originalSrc : null,
              displayTitle: product.title,
              price: 'Price not available',
              variantsCount: 0,
              vendor: product.vendor || '',
            };
            selectedProductVariants.push(productEntry);
          }
        });

        // Add selected product variants to form data, avoiding duplicates
        const updatedProducts = [...formData.selectedPurchasedProducts];
        selectedProductVariants.forEach(newProductVariant => {
          // Check for duplicates based on product ID + variant ID combination
          const isDuplicate = updatedProducts.some(existingProduct => 
            existingProduct.id === newProductVariant.id && 
            existingProduct.variantId === newProductVariant.variantId
          );
          
          if (!isDuplicate) {
            updatedProducts.push(newProductVariant);
          }
        });

        setFormData({ ...formData, selectedPurchasedProducts: updatedProducts });
      }

    } catch (error) {
      console.error('Error opening resource picker for purchased products:', error);
      // Handle cancellation or other errors gracefully
      if (error.message !== 'User cancelled resource selection') {
        setToastMessage('Unable to open product picker. Please try again.');
        setToastError(true);
        setShowToast(true);
      }
    }
  }, [app, formData]);

  const handleRemoveProduct = useCallback((productId, variantId = null) => {
    setFormData({ 
      ...formData, 
      selectedProducts: formData.selectedProducts.filter(p => 
        !(p.id === productId && p.variantId === variantId)
      ) 
    });
  }, [formData]);

  const handleRemovePurchasedProduct = useCallback((productId, variantId = null) => {
    setFormData({ 
      ...formData, 
      selectedPurchasedProducts: formData.selectedPurchasedProducts.filter(p => 
        !(p.id === productId && p.variantId === variantId)
      ) 
    });
  }, [formData]);

  const handleAddTargetingRule = useCallback(() => {
    const newRule = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'cart_value',
      condition: 'minimum',
      minValue: '0',
    };
    setFormData({ ...formData, targetingRules: [...formData.targetingRules, newRule] });
  }, [formData]);

  const handleUpdateTargetingRule = useCallback((ruleId, updates) => {
    setFormData({ ...formData, targetingRules: formData.targetingRules.map(rule => rule.id === ruleId ? { ...rule, ...updates } : rule) });
  }, [formData]);

  const handleRemoveTargetingRule = useCallback((ruleId) => {
    setFormData({ ...formData, targetingRules: formData.targetingRules.filter(rule => rule.id !== ruleId) });
  }, [formData]);

  const handleSubmit = useCallback(() => {
    if (!hasChanges || !canSaveOffer) return;
    
    setIsLoading(true);
    
    // Prepare form data for submission
    const submitData = new FormData();
    submitData.append("intent", isEditing ? "update-offer" : "save-offer");
    
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'selectedProducts') {
        submitData.append("products", JSON.stringify(value));
      } else if (key === 'selectedPurchasedProducts') {
        submitData.append("purchasedProducts", JSON.stringify(value));
      } else if (typeof value === 'boolean') {
        submitData.append(key, value.toString());
      } else if (value !== null && value !== undefined) {
        submitData.append(key, value);
      }
    });
    
    fetcher.submit(submitData, { method: "POST" });
  }, [formData, hasChanges, fetcher]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      // Revert changes
      setFormData({ ...originalFormData });
      setHasChanges(false);
    } else {
      // Navigate back
      onNavigate && onNavigate('offers');
    }
  }, [hasChanges, originalFormData, onNavigate]);

  const handleToastDismiss = useCallback(() => {
    setShowToast(false);
  }, []);



  return (
  <Frame>
    <Page
      title={isEditing ? 'Edit Offer' : 'Create New Offer'}
      backAction={{ onAction: handleCancel }}
      primaryAction={{
        content: 'Save Offer',
        onAction: handleSubmit,
        loading: isLoading,
        disabled: !hasChanges || !canSaveOffer,
      }}
      secondaryActions={[
        {
          content: hasChanges ? 'Cancel Changes' : 'Cancel',
          onAction: handleCancel,
          disabled: isLoading,
        },
      ]}
    >
    {/* Offer Limit Banner - Show when limit is reached */}
    {isLimitReached && (
      <Layout.Section>
        <Banner
          title={isEditing ? "Plan Limit Reached" : "Offer Will Be Created as Paused"}
          status="warning"
          action={{
            content: 'Upgrade Plan',
            onAction: () => onNavigate('plans'),
          }}
        >
          {!isEditing ? (
            <>
              <p>You've reached your plan limit for active offers. This offer will be created but set to <strong>paused</strong> status.</p>
              <p>To activate this offer, please upgrade your plan or pause other active offers.</p>
            </>
          ) : (
            <>
              <p>You've reached your plan limit for active offers. Setting this offer to active will not work until you upgrade your plan.</p>
              <p>The offer will be automatically set to paused if you try to activate it.</p>
            </>
          )}
          {subscription && usage && (
            <p style={{ marginTop: '8px' }}>
              You're currently on the <strong>{subscription.plan_name}</strong> plan 
              with {usage.active_offers_count} of {subscription.max_active_offers} offers used.
            </p>
          )}
        </Banner>
      </Layout.Section>
    )}
      <Layout>
        {/* Left Column - Form */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            {/* Basic Information Section */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Basic Information
                  </Text>
                  <Tooltip content="Set up the basic details of your post-purchase offer">
                    <Icon source={QuestionCircleIcon} tone="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Configure the essential details that will identify and control this offer
                </Text>
                <Divider />
                <FormLayout>
                  <TextField
                    label="Offer Name"
                    value={formData.name}
                    onChange={(value) => setFormData({ ...formData, name: value })}
                    autoComplete="off"
                    placeholder="e.g., Summer Sale Upsell"
                    helpText="Internal name to help you identify this offer"
                  />
                  <TextField
                    label="Description"
                    value={formData.description}
                    onChange={(value) => setFormData({ ...formData, description: value })}
                    autoComplete="off"
                    multiline={3}
                    placeholder="Describe what this offer is about..."
                    helpText="This is for your reference only and won't be shown to customers"
                  />
                  <Select
                    label="Status"
                    options={[
                      { label: 'Active', value: 'active' },
                      { label: 'Paused', value: 'paused' },
                      { label: 'Scheduled', value: 'scheduled' },
                    ]}
                    value={formData.status}
                    onChange={(value) => setFormData({ ...formData, status: value })}
                    helpText="Active offers will be shown to customers immediately"
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Trigger Products
                  </Text>
                  <Tooltip content="Products that trigger this offer when purchased">
                    <Icon source={QuestionCircleIcon} tone="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Choose which products will trigger this offer when customers purchase them
                </Text>
                <Divider />
                <FormLayout>
                  {formData.selectedPurchasedProducts.length > 0 && (
                    <BlockStack gap="300">
                      {formData.selectedPurchasedProducts.map((product, index) => (
                        <Card key={`purchased-${product.id}-${product.variantId || 'default'}-${index}`}>
                          <div style={{ padding: '12px' }}>
                            <InlineStack gap="400" align="space-between" blockAlign="center">
                              <InlineStack gap="300" blockAlign="center">
                                <Thumbnail
                                  source={product.imageUrl || ImageIcon}
                                  alt={product.displayTitle || product.title}
                                  size="small"
                                />
                                <BlockStack gap="100">
                                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                                    {product.displayTitle || product.title}
                                  </Text>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    {product.price || product.variant_price || product.product_price || 'Price not available'}
                                    {product.variantTitle && ` • Variant: ${product.variantTitle}`}
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                              <Button
                                variant="tertiary"
                                tone="critical"
                                onClick={() => handleRemovePurchasedProduct(product.id, product.variantId)}
                              >
                                Remove
                              </Button>
                            </InlineStack>
                          </div>
                        </Card>
                      ))}
                    </BlockStack>
                  )}

                  <Button
                    variant="secondary"
                    icon={PlusIcon}
                    onClick={handleSelectPurchasedProducts}
                    fullWidth
                  >
                    {formData.selectedPurchasedProducts.length > 0 ? 'Add More Trigger Products' : 'Select Trigger Products'}
                  </Button>
                </FormLayout>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Products to Offer
                  </Text>
                  <Tooltip content="Configure what products to offer and at what discount">
                    <Icon source={QuestionCircleIcon} tone="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Choose the products you want to offer to customers as part of this deal
                </Text>
                <Divider />
                <FormLayout>
                  {formData.selectedProducts.length > 0 && (
                    <BlockStack gap="300">
                      {formData.selectedProducts.map((product, index) => (
                        <Card key={`${product.id}-${product.variantId || 'default'}-${index}`}>
                          <div style={{ padding: '12px' }}>
                            <InlineStack gap="400" align="space-between" blockAlign="center">
                              <InlineStack gap="300" blockAlign="center">
                                <Thumbnail
                                  source={product.imageUrl || ImageIcon}
                                  alt={product.displayTitle || product.title}
                                  size="small"
                                />
                                <BlockStack gap="100">
                                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                                    {product.displayTitle || product.title}
                                  </Text>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    {product.price || product.variant_price || product.product_price || 'Price not available'}
                                    {product.variantTitle && ` • Variant: ${product.variantTitle}`}
                                  </Text>
                                  {product.vendor && (
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      by {product.vendor}
                                    </Text>
                                  )}
                                </BlockStack>
                              </InlineStack>
                              <Button
                                variant="plain"
                                tone="critical"
                                onClick={() => handleRemoveProduct(product.id, product.variantId)}
                              >
                                Remove
                              </Button>
                            </InlineStack>
                          </div>
                        </Card>
                      ))}
                    </BlockStack>
                  )}
                  
                  <Button onClick={handleSelectProducts}>
                    Select Products
                  </Button>
                  
                  <Text as="p" variant="bodySm" tone="subdued">
                    Select the products you want to offer to customers after checkout
                  </Text>
                  
                  <InlineGrid columns={2} gap="400">
                    <Select
                      label="Discount Type"
                      options={[
                        { label: 'Percentage', value: 'percentage' },
                        { label: 'Fixed Amount', value: 'fixed' },
                      ]}
                      value={formData.discountType}
                      onChange={(value) => setFormData({ ...formData, discountType: value })}
                    />
                    <TextField
                      label="Discount Value"
                      value={formData.discountValue}
                      onChange={(value) => setFormData({ ...formData, discountValue: value })}
                      type="number"
                      autoComplete="off"
                      suffix={formData.discountType === 'percentage' ? '%' : '$'}
                    />
                  </InlineGrid>
                </FormLayout>
              </BlockStack>
            </Card>

            {/* Offer Display Section */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Offer Display
                  </Text>
                  <Tooltip content="Customize how the offer will appear to customers">
                    <Icon source={QuestionCircleIcon} tone="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Set the title, description, and button text for the offer
                </Text>
                <Divider />
                <FormLayout>
                  <TextField
                    label="Offer Title"
                    value={formData.offerTitle}
                    onChange={(value) => setFormData({ ...formData, offerTitle: value })}
                    placeholder="e.g., Special Offer Just For You!"
                    autoComplete="off"
                    helpText="This is shown to customers"
                  />

                  <TextField
                    label="Offer Description"
                    value={formData.offerDescription}
                    onChange={(value) => setFormData({ ...formData, offerDescription: value })}
                    placeholder="Describe the offer to customers"
                    autoComplete="off"
                    multiline={3}
                  />

                  <TextField
                    label="Button Text"
                    value={formData.buttonText}
                    onChange={(value) => setFormData({ ...formData, buttonText: value })}
                    placeholder="e.g., Add to Order"
                    autoComplete="off"
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            {/* Targeting Rules Section */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                      Targeting Rules
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Define when this offer should be shown to customers. Multiple rules work with OR logic - the offer shows if ANY rule matches.
                    </Text>
                  </BlockStack>
                  <Tooltip content="Add conditions to control when this offer appears to customers">
                    <Icon source={QuestionCircleIcon} tone="subdued" />
                  </Tooltip>
                </InlineStack>
                <Divider />
                
                <Banner tone="info">
                  <Text as="p" variant="bodyMd">
                    Tip: Start with cart value rules for best results. You can add multiple rules and the offer will show if any condition is met.
                  </Text>
                </Banner>

                <Button onClick={handleAddTargetingRule} icon={PlusIcon}>
                  Add Rule
                </Button>
                
                {formData.targetingRules.length === 0 ? (
                  <div style={{ 
                    padding: '40px 20px', 
                    textAlign: 'center', 
                    border: '1px dashed #c9cccf',
                    borderRadius: '8px',
                    backgroundColor: '#fafbfb'
                  }}>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        No targeting rules added yet
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Click "Add Rule" to define when this offer should be shown
                      </Text>
                    </BlockStack>
                  </div>
                ) : (
                  <BlockStack gap="300">
                    {formData.targetingRules.map((rule, index) => (
                      <React.Fragment key={rule.id}>
                        <Card>
                          <div style={{ padding: '16px' }}>
                            <BlockStack gap="300">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                  <Select
                                    label="Rule Type"
                                    options={[
                                      { label: 'Cart Value', value: 'cart_value' },
                                      { label: 'Customer Segment', value: 'customer_segment' },
                                      { label: 'Trigger Products', value: 'trigger_products' },
                                      { label: 'Trigger Collections', value: 'trigger_collections' },
                                    ]}
                                    value={rule.type}
                                    onChange={(value) => handleUpdateTargetingRule(rule.id, { 
                                      type: value,
                                      condition: undefined,
                                      value: undefined,
                                      minValue: undefined,
                                      maxValue: undefined,
                                    })}
                                  />
                                </div>
                                <div style={{ marginLeft: '12px', marginTop: '28px' }}>
                                  <Button
                                    variant="plain"
                                    tone="critical"
                                    onClick={() => handleRemoveTargetingRule(rule.id)}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              </div>

                              {rule.type === 'cart_value' && (
                                <BlockStack gap="300">
                                  <Select
                                    label="Condition"
                                    options={[
                                      { label: 'Minimum value', value: 'minimum' },
                                      { label: 'Maximum value', value: 'maximum' },
                                      { label: 'Between values', value: 'between' },
                                    ]}
                                    value={rule.condition || 'minimum'}
                                    onChange={(value) => handleUpdateTargetingRule(rule.id, { condition: value })}
                                  />
                                  {rule.condition === 'between' ? (
                                    <InlineGrid columns={2} gap="300">
                                      <TextField
                                        label="Minimum"
                                        value={rule.minValue || ''}
                                        onChange={(value) => handleUpdateTargetingRule(rule.id, { minValue: value })}
                                        type="number"
                                        autoComplete="off"
                                        prefix="$"
                                      />
                                      <TextField
                                        label="Maximum"
                                        value={rule.maxValue || ''}
                                        onChange={(value) => handleUpdateTargetingRule(rule.id, { maxValue: value })}
                                        type="number"
                                        autoComplete="off"
                                        prefix="$"
                                      />
                                    </InlineGrid>
                                  ) : (
                                    <TextField
                                      label="Amount"
                                      value={rule.minValue || ''}
                                      onChange={(value) => handleUpdateTargetingRule(rule.id, { minValue: value })}
                                      type="number"
                                      autoComplete="off"
                                      prefix="$"
                                    />
                                  )}
                                </BlockStack>
                              )}

                              {rule.type === 'customer_segment' && (
                                <Select
                                  label="Customer Type"
                                  options={[
                                    { label: 'All Customers', value: 'all' },
                                    { label: 'First-time Customers', value: 'first-time' },
                                    { label: 'Returning Customers', value: 'returning' },
                                    { label: 'VIP Customers', value: 'vip' },
                                  ]}
                                  value={rule.value || 'all'}
                                  onChange={(value) => handleUpdateTargetingRule(rule.id, { value })}
                                />
                              )}

                              {rule.type === 'trigger_products' && (
                                <div>
                                  <div style={{ marginBottom: '8px' }}>
                                    <Text as="p" variant="bodyMd">
                                      Trigger Products
                                    </Text>
                                  </div>
                                  <Button onClick={() => console.log('Open product picker for rule', rule.id)}>
                                    Select Products
                                  </Button>
                                  <div style={{ marginTop: '8px' }}>
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      Show this offer when specific products are in the cart
                                    </Text>
                                  </div>
                                </div>
                              )}

                              {rule.type === 'trigger_collections' && (
                                <div>
                                  <div style={{ marginBottom: '8px' }}>
                                    <Text as="p" variant="bodyMd">
                                      Trigger Collections
                                    </Text>
                                  </div>
                                  <Button onClick={() => console.log('Open collection picker for rule', rule.id)}>
                                    Select Collections
                                  </Button>
                                  <div style={{ marginTop: '8px' }}>
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      Show this offer when products from specific collections are in the cart
                                    </Text>
                                  </div>
                                </div>
                              )}
                            </BlockStack>
                          </div>
                        </Card>
                        
                        {index < formData.targetingRules.length - 1 && (
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                            <div style={{
                              backgroundColor: '#e4e5e7',
                              color: '#202223',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}>
                              OR
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

            {/* Limits & Schedule Section */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Limits & Schedule
                  </Text>
                  <Tooltip content="Set limits and schedule for the offer">
                    <Icon source={QuestionCircleIcon} tone="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Configure the limits and schedule for when this offer will be available
                </Text>
                <Divider />
                <FormLayout>
                  <InlineGrid columns={2} gap="400">
                    <TextField
                      label="Limit Per Customer"
                      value={formData.limitPerCustomer}
                      onChange={(value) => setFormData({ ...formData, limitPerCustomer: value })}
                      type="number"
                      autoComplete="off"
                      helpText="How many times each customer can accept this offer"
                    />
                    <TextField
                      label="Total Limit (Optional)"
                      value={formData.totalLimit}
                      onChange={(value) => setFormData({ ...formData, totalLimit: value })}
                      type="number"
                      autoComplete="off"
                      helpText="Total number of times this offer can be accepted"
                    />
                  </InlineGrid>

                  {formData.status === 'scheduled' && (
                    <TextField
                      label="Schedule Start Date"
                      value={formData.scheduleStart}
                      onChange={(value) => setFormData({ ...formData, scheduleStart: value })}
                      type="datetime-local"
                      autoComplete="off"
                    />
                  )}

                  <TextField
                    label="Expiry Date (Optional)"
                    value={formData.expiryDate}
                    onChange={(value) => setFormData({ ...formData, expiryDate: value })}
                    type="datetime-local"
                    autoComplete="off"
                    helpText="When this offer should stop being shown"
                  />
                </FormLayout>
              </BlockStack>
            </Card>

            {/* Advanced Settings Section */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Advanced Settings
                  </Text>
                  <Tooltip content="Configure advanced settings for the offer">
                    <Icon source={QuestionCircleIcon} tone="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Set up advanced features to optimize the performance of your offer
                </Text>
                <Divider />
                <Checkbox
                  label="Enable A/B Testing"
                  checked={formData.enableABTest}
                  onChange={(value) => setFormData({ ...formData, enableABTest: value })}
                  helpText="Test different versions of this offer to optimize performance"
                />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        {/* Right Column - Preview */}
        <Layout.Section variant="oneThird">
          <div style={{ position: 'sticky', top: '16px' }}>
            <Card>
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Live Preview
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    This is how your offer will appear to customers
                  </Text>
                </BlockStack>
                <Divider />
                
                {/* Mobile Device Frame */}
                <div style={{
                  border: '12px solid #1a1a1a',
                  borderRadius: '36px',
                  backgroundColor: '#ffffff',
                  padding: '16px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                  maxWidth: '375px',
                  margin: '0 auto',
                }}>
                  <BlockStack gap="400">
                    {/* Header */}
                    <div style={{
                      textAlign: 'center',
                      paddingBottom: '16px',
                      borderBottom: '1px solid #e1e3e5'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#008060',
                        margin: '0 auto 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}>
                        🎉
                      </div>
                      <Text as="h3" variant="headingMd">
                        {formData.offerTitle || 'Special Offer Just For You!'}
                      </Text>
                    </div>

                    {/* Product Display */}
                    {formData.selectedProducts.length > 0 ? (
                      <BlockStack gap="300">
                        {formData.selectedProducts.map((product, index) => (
                          <div key={`${product.id}-${product.variantId || 'default'}-${index}`} style={{
                            border: '1px solid #e1e3e5',
                            borderRadius: '12px',
                            padding: '12px',
                            backgroundColor: '#f6f6f7'
                          }}>
                            <InlineStack gap="300" blockAlign="start">
                              {product.imageUrl && (
                                <div style={{
                                  width: '80px',
                                  height: '80px',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e1e3e5'
                                }}>
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.displayTitle || product.title}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                  />
                                </div>
                              )}
                              <BlockStack gap="100">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                  {product.displayTitle || product.title}
                                </Text>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {formData.discountValue && (
                                    <Text as="span" variant="bodySm" tone="subdued">
                                      <s>{product.price || product.variant_price || product.product_price || 'N/A'}</s>
                                    </Text>
                                  )}
                                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                                    {(() => {
                                      const price = product.price || product.variant_price || product.product_price;
                                      if (!price || typeof price !== 'string') {
                                        return price || 'Price not available';
                                      }
                                      
                                      const numericPrice = parseFloat(price.replace('$', ''));
                                      if (isNaN(numericPrice)) {
                                        return price;
                                      }
                                      
                                      if (formData.discountType === 'percentage' && formData.discountValue) {
                                        return `$${(numericPrice * (1 - parseFloat(formData.discountValue) / 100)).toFixed(2)}`;
                                      } else if (formData.discountType === 'fixed' && formData.discountValue) {
                                        return `$${(numericPrice - parseFloat(formData.discountValue)).toFixed(2)}`;
                                      }
                                      return price;
                                    })()}
                                  </Text>
                                  {formData.discountValue && (
                                    <Badge tone="success">
                                      {formData.discountType === 'percentage' 
                                        ? `${formData.discountValue}% OFF`
                                        : `$${formData.discountValue} OFF`
                                      }
                                    </Badge>
                                  )}
                                </div>
                              </BlockStack>
                            </InlineStack>
                          </div>
                        ))}
                      </BlockStack>
                    ) : (
                      <div style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        border: '2px dashed #c9cccf',
                        borderRadius: '12px',
                        backgroundColor: '#fafbfb'
                      }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          No products selected
                        </Text>
                      </div>
                    )}

                    {/* Offer Description */}
                    {formData.offerDescription && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#f6f6f7',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <Text as="p" variant="bodySm">
                          {formData.offerDescription}
                        </Text>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <BlockStack gap="200">
                      <Button variant="primary" size="large" fullWidth>
                        {formData.buttonText || 'Add to Order'}
                      </Button>
                      <Button size="large" fullWidth>
                        No Thanks
                      </Button>
                    </BlockStack>

                    {/* Trust Indicators */}
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f1f9f6',
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: '1px solid #c1e7d8'
                    }}>
                      <Text as="p" variant="bodySm" tone="subdued">
                        ✓ Secure checkout • 30-day money back guarantee
                      </Text>
                    </div>
                  </BlockStack>
                </div>

                {/* Preview Info */}
                <Banner tone="info">
                  <Text as="p" variant="bodySm">
                    This preview updates in real-time as you edit the form
                  </Text>
                </Banner>
              </BlockStack>
            </Card>

            {/* Quick Tips Card */}
            <div style={{ marginTop: '16px' }}>
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    💡 Quick Tips
                  </Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodySm">
                      • Keep titles clear and benefit-focused
                    </Text>
                    <Text as="p" variant="bodySm">
                      • Use 10-25% discounts for best results
                    </Text>
                    <Text as="p" variant="bodySm">
                      • Test different products to find winners
                    </Text>
                    <Text as="p" variant="bodySm">
                      • Add targeting rules to increase conversion
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>
            </div>
          </div>
        </Layout.Section>
      </Layout>


      </Page>
      
      {showToast && (
        <Toast
          content={toastMessage}
          onDismiss={handleToastDismiss}
          error={toastError}
        />
      )}
    </Frame>
  );
}