import React, { useState, useCallback } from 'react';
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
} from '@shopify/polaris';
import { PlusIcon, QuestionCircleIcon, ImageIcon } from '@shopify/polaris-icons';

export function OfferForm({ offerId, onSave, onCancel }) {
  const isEditing = !!offerId;

  // Form state
  const [formData, setFormData] = useState({
    name: isEditing ? 'Summer Sale Bundle' : '',
    description: isEditing ? 'Offering a bundle of premium products' : '',
    status: 'active',
    selectedProducts: isEditing
      ? [
          {
            id: '123456789',
            title: 'Premium Leather Wallet',
            imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=100&h=100&fit=crop',
            price: '$49.99',
            variants: 3,
          },
        ]
      : [],
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
  });

  const handleSelectProducts = useCallback(() => {
    // This would open Shopify App Bridge's product picker
    console.log('Opening product selector...');
    // Simulate product selection for demo
    const mockProduct = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Luxury Watch Collection',
      imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=100&h=100&fit=crop',
      price: '$299.99',
      variants: 5,
    };
    setFormData({ ...formData, selectedProducts: [...formData.selectedProducts, mockProduct] });
  }, [formData]);

  const handleRemoveProduct = useCallback((productId) => {
    setFormData({ ...formData, selectedProducts: formData.selectedProducts.filter(p => p.id !== productId) });
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
    // Here you would normally make an API call to save the offer
    console.log('Saving offer...', formData);
    onSave();
  }, [formData, onSave]);

  return (
    <Page
      title={offerId ? 'Edit Offer' : 'Create New Offer'}
      backAction={{ onAction: onCancel }}
      primaryAction={{
        content: 'Save Offer',
        onAction: handleSubmit,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onCancel,
        },
      ]}
    >
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

            {/* Offer Details Section */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Offer Details
                  </Text>
                  <Tooltip content="Configure what product to offer and at what discount">
                    <Icon source={QuestionCircleIcon} tone="subdued" />
                  </Tooltip>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Choose the product you want to offer and set the discount amount
                </Text>
                <Divider />
                <FormLayout>
                  {formData.selectedProducts.length > 0 && (
                    <BlockStack gap="300">
                      {formData.selectedProducts.map((product) => (
                        <Card key={product.id}>
                          <div style={{ padding: '12px' }}>
                            <InlineStack gap="400" align="space-between" blockAlign="center">
                              <InlineStack gap="300" blockAlign="center">
                                <Thumbnail
                                  source={product.imageUrl || ImageIcon}
                                  alt={product.title}
                                  size="small"
                                />
                                <BlockStack gap="100">
                                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                                    {product.title}
                                  </Text>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    {product.price} • {product.variants} variants
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                              <Button
                                variant="plain"
                                tone="critical"
                                onClick={() => handleRemoveProduct(product.id)}
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
                        {formData.selectedProducts.map((product) => (
                          <div key={product.id} style={{
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
                                    alt={product.title}
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
                                  {product.title}
                                </Text>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  {formData.discountValue && (
                                    <Text as="span" variant="bodySm" tone="subdued">
                                      <s>{product.price}</s>
                                    </Text>
                                  )}
                                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                                    {formData.discountType === 'percentage' && formData.discountValue
                                      ? `$${(parseFloat(product.price.replace('$', '')) * (1 - parseFloat(formData.discountValue) / 100)).toFixed(2)}`
                                      : formData.discountType === 'fixed' && formData.discountValue
                                      ? `$${(parseFloat(product.price.replace('$', '')) - parseFloat(formData.discountValue)).toFixed(2)}`
                                      : product.price
                                    }
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
  );
}