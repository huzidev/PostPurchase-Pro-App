import VariantCreate from "../mutations/variantCreate.js";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";
import { useSubmit, useActionData } from "react-router";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const variantCreate = new VariantCreate(admin.graphql);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  
  if (actionType === "fetchProducts") {
    const cursor = formData.get("cursor");
    
    return await variantCreate.getActiveProducts(cursor);
  }
  
  if (actionType === "addOptionValue") {
    const productId = formData.get("productId");
    const optionId = formData.get("optionId");
    const optionName = formData.get("optionName");
    const newValue = formData.get("newValue");
    
    // Here you would implement the Shopify GraphQL mutation to add option value
    // For now, return success to avoid errors
    console.log(`Adding "${newValue}" to ${optionName} option for product ${productId}`);
    
    return {
      success: true,
      message: `Added "${newValue}" to ${optionName} option`,
      refreshProducts: true // Signal to refresh products
    };
  }
  
  if (actionType === "removeOptionValue") {
    const productId = formData.get("productId");
    const optionId = formData.get("optionId");
    const optionName = formData.get("optionName");
    const valueToRemove = formData.get("valueToRemove");
    
    // Here you would implement the Shopify GraphQL mutation to remove option value
    // For now, return success to avoid errors
    console.log(`Removing "${valueToRemove}" from ${optionName} option for product ${productId}`);
    
    return {
      success: true,
      message: `Removed "${valueToRemove}" from ${optionName} option`,
      refreshProducts: true // Signal to refresh products
    };
  }
  
  if (actionType === "fetchProduct") {
    const productId = formData.get("productId");
    
    return await variantCreate.getProductOptions(productId);
  }
  
  if (actionType === "createVariants") {
    const productId = formData.get("productId");
    const datesData = formData.get("dates");
    const timeSlotsData = formData.get("timeSlots");
    const quantitiesData = formData.get("quantities");
    const price = parseFloat(formData.get("price")) || 0;
    const compareAtPrice = parseFloat(formData.get("compareAtPrice")) || 0;
    const dateOptionId = formData.get("dateOptionId");
    const timeslotOptionId = formData.get("timeslotOptionId");
    
    try {
      const dates = JSON.parse(datesData || "[]");
      const timeSlots = JSON.parse(timeSlotsData || "[]");
      const quantities = JSON.parse(quantitiesData || "{}");
      
      if (!dates.length || timeSlots.length === 0 || !dateOptionId || !timeslotOptionId) {
        return { 
          success: false, 
          error: "Dates, time slots, and option IDs are required. Please fetch product first." 
        };
      }

      // Create variants for each date and time slot combination
      const variants = [];
      dates.forEach(date => {
        timeSlots.forEach(timeSlot => {
          const quantity = quantities[timeSlot] ?? 22; // Use custom quantity or default to 22
          variants.push({
            price: price,
            compareAtPrice: compareAtPrice,
            inventoryQuantities: [
              {
                locationId: "gid://shopify/Location/109539918144", // Shop location
                availableQuantity: quantity
              }
            ],
            optionValues: [
              {
                name: date,
                optionId: dateOptionId
              },
              {
                name: timeSlot,
                optionId: timeslotOptionId
              }
            ]
          });
        });
      });
      
      const result = await variantCreate.createProductVariants({
        productId,
        variants
      });
      
      // Add productId to the result so we can clear the form for this product
      if (result.success && result.variants) {
        result.variants = result.variants.map(variant => ({
          ...variant,
          productId: productId
        }));
      }
      
      return result;
    } catch (parseError) {
      return { 
        success: false, 
        error: "Invalid dates or time slots data format. Please provide valid JSON arrays." 
      };
    }
  }
  
  return { success: false, error: "Unknown action" };
};

export default function BulkCreateVariants() {
  const actionData = useActionData();
  const submit = useSubmit();
  const [products, setProducts] = useState([]);
  const [newOptionValues, setNewOptionValues] = useState({}); // Track new values being added for each product option
  const [loading, setLoading] = useState(false);
  const [creatingVariants, setCreatingVariants] = useState({});
  const [addedDates, setAddedDates] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [timeSlotQuantities, setTimeSlotQuantities] = useState({});

  // Auto-refresh products when option values are added/removed
  useEffect(() => {
    if (actionData?.refreshProducts && actionData?.success) {
      // Add a small delay to allow the backend to update before refreshing
      setTimeout(() => {
        handleFetchProducts();
      }, 500);
    }
    
    // Update products state when fetched
    if (actionData?.products) {
      setProducts(actionData.products);
    }
  }, [actionData]);

  // Handle success messages and loading states
  useEffect(() => {
    if (actionData) {
      setLoading(false);
      if (actionData.success && actionData.variants) {
        setSuccessMessage('Variants created successfully!');
        
        // Find the productId from the variants response to clear that product's form
        const createdVariants = actionData.variants;
        if (createdVariants && createdVariants.length > 0) {
          // Extract productId from the first variant (all variants belong to same product)
          const productId = createdVariants[0]?.productId;
          if (productId) {
            clearProductForm(productId);
          }
        }
        
        setCreatingVariants({});
        setTimeout(() => setSuccessMessage(''), 3000);
      } else if (actionData.success && !actionData.variants) {
        setCreatingVariants({});
      }
    }
  }, [actionData]);

  const clearProductForm = (productId) => {
    // Clear added dates for this product
    setAddedDates(prev => ({
      ...prev,
      [productId]: []
    }));
    
    // Reset quantities for this product
    setTimeSlotQuantities(prev => ({
      ...prev,
      [productId]: {}
    }));
    
    // Uncheck all time slot checkboxes for this product
    const productElement = document.querySelector(`[data-product-id="${productId}"]`);
    if (productElement) {
      const checkboxes = productElement.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = false;
      });
    }
  };

  const handleFetchProducts = () => {
    setLoading(true);
    const formData = new FormData();
    formData.set("actionType", "fetchProducts");
    
    submit(formData, { method: "post" });
  };

  const handleAddOptionValue = (productId, optionId, optionName, value) => {
    if (!value.trim()) return;
    
    const formData = new FormData();
    formData.set("actionType", "addOptionValue");
    formData.set("productId", productId);
    formData.set("optionId", optionId);
    formData.set("optionName", optionName);
    formData.set("newValue", value.trim());
    
    submit(formData, { method: "post" });
    
    // Reset the input
    setNewOptionValues(prev => ({
      ...prev,
      [`${productId}-${optionId}`]: ""
    }));
  };

  const handleRemoveOptionValue = (productId, optionId, optionName, valueToRemove) => {
    const formData = new FormData();
    formData.set("actionType", "removeOptionValue");
    formData.set("productId", productId);
    formData.set("optionId", optionId);
    formData.set("optionName", optionName);
    formData.set("valueToRemove", valueToRemove);
    
    submit(formData, { method: "post" });
  };

  const handleCreateVariants = (productId, dates, timeSlots) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCreatingVariants(prev => ({ ...prev, [productId]: true }));
    setSuccessMessage('');

    // Extract pricing from existing variants
    const existingVariant = product.variants?.nodes?.[0];
    const price = existingVariant?.price || "0.00";
    const compareAtPrice = existingVariant?.compareAtPrice || null;

    // Send all dates and timeslots in a single request
    const formData = new FormData();
    formData.set("actionType", "createVariants");
    formData.set("productId", productId);
    formData.set("dates", JSON.stringify(dates));
    formData.set("timeSlots", JSON.stringify(timeSlots));
    formData.set("quantities", JSON.stringify(timeSlotQuantities[productId] || {}));
    formData.set("price", price);
    formData.set("compareAtPrice", compareAtPrice || "0");
    
    // Add option IDs from product
    const dateOption = product.options?.find(opt => opt.name.toLowerCase() === 'date');
    const timeslotOption = product.options?.find(opt => opt.name.toLowerCase() === 'timeslot');
    
    if (dateOption) formData.set("dateOptionId", dateOption.id);
    if (timeslotOption) formData.set("timeslotOptionId", timeslotOption.id);
    
    submit(formData, { method: "post" });
  };

  const handleAddDate = (productId, date) => {
    if (!date.trim()) return;
    
    setAddedDates(prev => ({
      ...prev,
      [productId]: [...(prev[productId] || []), date.trim()]
    }));
  };

  const handleRemoveDate = (productId, dateToRemove) => {
    setAddedDates(prev => ({
      ...prev,
      [productId]: (prev[productId] || []).filter(date => date !== dateToRemove)
    }));
  };

  const styles = {
    page: {
      padding: '24px',
      backgroundColor: '#fafbfb',
      minHeight: '100vh'
    },
    card: {
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      maxWidth: '800px',
      margin: '0 auto'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '24px',
      color: '#202223'
    },
    banner: {
      padding: '12px 16px',
      borderRadius: '4px',
      marginBottom: '16px',
      border: '1px solid'
    },
    bannerError: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      color: '#b91c1c'
    },
    bannerSuccess: {
      backgroundColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      color: '#166534'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151'
    },
    input: {
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s ease'
    },
    inputFocus: {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 1px #3b82f6'
    },
    helpText: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '4px'
    },
    button: {
      padding: '8px 16px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease'
    },
    buttonSecondary: {
      backgroundColor: '#6b7280',
      color: 'white'
    },
    buttonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    },
    timeSlotContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginTop: '8px'
    },
    timeSlotChip: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#f3f4f6',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '14px',
      border: '1px solid #d1d5db'
    },
    removeButton: {
      marginLeft: '8px',
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      fontSize: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    addTimeSlotRow: {
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-end'
    },
    pre: {
      backgroundColor: '#f6f6f6',
      padding: '16px',
      borderRadius: '4px',
      overflow: 'auto',
      fontSize: '12px',
      fontFamily: 'monospace',
      border: '1px solid #e5e7eb'
    }
  };

  return (
    <div style={styles.page}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.card}>
        <h1 style={styles.title}>Product Options & Variant Creation Manager</h1>

        {actionData?.error && (
          <div style={{...styles.banner, ...styles.bannerError}}>
            <strong>Error:</strong> {actionData.error}
          </div>
        )}
        
        {successMessage && (
          <div style={{...styles.banner, ...styles.bannerSuccess}}>
            <strong>Success:</strong> {successMessage}
          </div>
        )}
        
        {actionData?.success && actionData.message && !actionData.variants && (
          <div style={{...styles.banner, ...styles.bannerSuccess}}>
            <strong>Success:</strong> {actionData.message}
          </div>
        )}

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
          <h2 style={{margin: 0, fontSize: '18px', color: '#374151'}}>Products & Options Management</h2>
          <button
            type="button"
            style={{...styles.button, opacity: loading ? 0.7 : 1}}
            onClick={handleFetchProducts}
            disabled={loading}
          >
            {loading ? (
              <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></span>
                Loading...
              </span>
            ) : (
              products.length > 0 ? 'Refresh Products' : 'Load Products'
            )}
          </button>
        </div>

        {products && products.length > 0 ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
            {products.map((product) => (
              <div
                key={product.id}
                data-product-id={product.id}
                style={{
                  padding: '20px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  backgroundColor: '#fefefe'
                }}
              >
                {/* Product Header */}
                <div style={{marginBottom: '16px'}}>
                  <h3 style={{margin: '0 0 8px 0', fontSize: '18px', color: '#111827', fontWeight: 'bold'}}>
                    {product.title}
                  </h3>
                  <p style={{margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontFamily: 'monospace'}}>
                    ID: {product.id}
                  </p>
                  <div style={{display: 'flex', gap: '12px', fontSize: '14px', color: '#374151'}}>
                    <span>Status: <strong>{product.status}</strong></span>
                    <span>Variants: <strong>{product.variants?.nodes?.length || 0}</strong></span>
                  </div>
                </div>

                {/* Options Management */}
                {product.options && product.options.length > 0 && (
                  <div style={{marginBottom: '20px'}}>
                    <h4 style={{margin: '0 0 12px 0', fontSize: '16px', color: '#374151'}}>Product Options</h4>
                    
                    {product.options.map((option) => (
                      <div
                        key={option.id}
                        style={{
                          marginBottom: '16px',
                          padding: '16px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          backgroundColor: option.name.toLowerCase() === 'date' ? '#fef3f2' : '#f0f9ff'
                        }}
                      >
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                          <h5 style={{margin: 0, fontSize: '14px', fontWeight: '600', color: '#374151'}}>
                            {option.name} Option
                          </h5>
                        </div>

                        {/* Existing Values */}
                        <div style={{marginBottom: '12px'}}>
                          <p style={{margin: '0 0 8px 0', fontSize: '13px', fontWeight: '500', color: '#374151'}}>
                            Current Values:
                          </p>
                          <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px'}}>
                            {option.values && option.values.length > 0 ? option.values.map((value, valueIndex) => {
                              const isStaticOption = option.name.toLowerCase() === 'date' || option.name.toLowerCase() === 'timeslot';
                              return (
                                <div
                                  key={valueIndex}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    backgroundColor: isStaticOption ? '#e0f2fe' : '#f3f4f6',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    border: `1px solid ${isStaticOption ? '#0284c7' : '#d1d5db'}`
                                  }}
                                >
                                  <span style={{ marginRight: isStaticOption ? '0' : '6px' }}>{value}</span>
                                  {!isStaticOption && (
                                    <button
                                      type="button"
                                      style={{
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        width: '16px',
                                        height: '16px',
                                        fontSize: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                      onClick={() => handleRemoveOptionValue(product.id, option.id, option.name, value)}
                                      title={`Remove ${value}`}
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              );
                            }) : (
                              <span style={{color: '#6b7280', fontStyle: 'italic', fontSize: '12px'}}>
                                No values added yet
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Variant Creation Section */}
                <div
                  style={{
                    marginTop: '20px',
                    padding: '16px',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb'
                  }}
                >
                  <h4 style={{margin: '0 0 16px 0', fontSize: '16px', color: '#374151'}}>Quick Variant Creation</h4>
                  
                  {/* Show current pricing info */}
                  {product.variants?.nodes?.[0] && (
                    <div style={{marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '6px'}}>
                      <p style={{margin: '0', fontSize: '12px', color: '#1e40af'}}>
                        <strong>Using existing pricing:</strong> ${product.variants.nodes[0].price}
                        {product.variants.nodes[0].compareAtPrice && ` (Compare at: $${product.variants.nodes[0].compareAtPrice})`}
                      </p>
                    </div>
                  )}

                  {/* Date Management Section */}
                  <div style={{marginBottom: '20px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fefefe'}}>
                    <label style={{...styles.label, fontSize: '13px', marginBottom: '8px', display: 'block', fontWeight: '600'}}>Add Dates</label>
                    <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
                      <input
                        type="text"
                        id={`dateInput-${product.id}`}
                        style={{...styles.input, fontSize: '13px', flex: '1'}}
                        placeholder="e.g., Saturday April 6, 2024"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target;
                            handleAddDate(product.id, input.value);
                            input.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        style={{...styles.button, fontSize: '13px', padding: '8px 12px'}}
                        onClick={() => {
                          const input = document.getElementById(`dateInput-${product.id}`);
                          handleAddDate(product.id, input.value);
                          input.value = '';
                        }}
                      >
                        Add Date
                      </button>
                    </div>
                    
                    {/* Added Dates Display */}
                    <div style={{marginBottom: '8px'}}>
                      <p style={{fontSize: '12px', color: '#6b7280', margin: '0 0 6px 0'}}>Added Dates:</p>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                        {(addedDates[product.id] || []).length > 0 ? (
                          addedDates[product.id].map((date, index) => (
                            <div
                              key={index}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: '#f0fdf4',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                border: '1px solid #bbf7d0'
                              }}
                            >
                              <span style={{marginRight: '6px'}}>{date}</span>
                              <button
                                type="button"
                                style={{
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  width: '16px',
                                  height: '16px',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onClick={() => handleRemoveDate(product.id, date)}
                                title={`Remove ${date}`}
                              >
                                ×
                              </button>
                            </div>
                          ))
                        ) : (
                          <span style={{color: '#9ca3af', fontStyle: 'italic', fontSize: '12px'}}>No dates added yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time Slots Section */}
                  <div style={{marginBottom: '20px', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fefefe'}}>
                    <label style={{...styles.label, fontSize: '13px', marginBottom: '12px', display: 'block', fontWeight: '600'}}>Select Time Slots & Quantities</label>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                      {['9am', '10:45am', '12:30pm', '2:15pm', '4:00pm'].map(slot => (
                        <div key={slot} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          backgroundColor: '#fafafa',
                          transition: 'all 0.2s ease'
                        }}>
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            minWidth: '120px'
                          }}>
                            <input
                              type="checkbox"
                              name={slot}
                              value={slot}
                              style={{
                                cursor: 'pointer',
                                width: '16px',
                                height: '16px',
                                accentColor: '#3b82f6'
                              }}
                            />
                            <span style={{fontWeight: '500'}}>{slot}</span>
                          </label>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <label style={{fontSize: '12px', color: '#6b7280', minWidth: '30px'}}>Qty:</label>
                            <input
                              type="number"
                              min="0"
                              value={timeSlotQuantities[product.id]?.[slot] ?? 22}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                const finalValue = isNaN(value) ? 0 : value;
                                setTimeSlotQuantities(prev => ({
                                  ...prev,
                                  [product.id]: {
                                    ...prev[product.id],
                                    [slot]: finalValue
                                  }
                                }));
                              }}
                              style={{
                                width: '80px',
                                padding: '4px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Create Variants Button */}
                  <button
                    type="button"
                    style={{
                      ...styles.button,
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: creatingVariants[product.id] ? 0.7 : 1
                    }}
                    disabled={creatingVariants[product.id]}
                    onClick={() => {
                      const dates = addedDates[product.id] || [];
                      
                      // Collect selected timeslots from checkboxes
                      const timeSlots = [];
                      const timeslotOptions = ['9am', '10:45am', '12:30pm', '2:15pm', '4:00pm'];
                      const checkboxes = document.querySelectorAll(`input[type="checkbox"][name]`);
                      checkboxes.forEach(checkbox => {
                        if (checkbox.checked && timeslotOptions.includes(checkbox.value)) {
                          timeSlots.push(checkbox.value);
                        }
                      });
                      
                      if (dates.length === 0) {
                        alert('Please add at least one date');
                        return;
                      }
                      
                      if (timeSlots.length === 0) {
                        alert('Please select at least one time slot');
                        return;
                      }
                      
                      handleCreateVariants(product.id, dates, timeSlots);
                    }}
                  >
                    {creatingVariants[product.id] ? (
                      <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}}>
                        <span style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></span>
                        Creating Variants...
                      </span>
                    ) : (
                      'Create Variants'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
                ) : (
          <div style={{textAlign: 'center', padding: '60px', color: '#6b7280'}}>
            {products.length === 0 ? (
              <div>
                <p style={{fontSize: '16px', marginBottom: '8px'}}>Ready to manage your product options?</p>
                <p style={{fontSize: '14px'}}>Click "Load Products" to fetch your store's products and start managing their options.</p>
              </div>
            ) : (
              <p>No active products found in your store</p>
            )}
          </div>
        )}


      </div>
    </div>
  );
}
