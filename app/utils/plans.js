// Plan configurations based on Plans.jsx
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    priceValue: 0,
    maxOffers: 2,
    maxImpressions: 100,
    features: [
      'Up to 2 active offers',
      '100 offer impressions/month',
      'Basic analytics',
      'Email support',
    ],
    limitations: [
      'Limited customization',
      'No A/B testing',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: '$19',
    period: '/month',
    priceValue: 19,
    maxOffers: 10,
    maxImpressions: 1000,
    popular: true,
    features: [
      'Up to 10 active offers',
      '1,000 offer impressions/month',
      'Advanced analytics',
      'Priority email support',
      'Custom offer designs',
      'Basic A/B testing',
    ],
    limitations: [],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: '$49',
    period: '/month',
    priceValue: 49,
    maxOffers: 50,
    maxImpressions: 10000,
    features: [
      'Up to 50 active offers',
      '10,000 offer impressions/month',
      'Advanced analytics & reports',
      'Priority support (24/7)',
      'Full customization',
      'Advanced A/B testing',
      'Audience segmentation',
      'API access',
    ],
    limitations: [],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    priceValue: null, // Custom pricing
    maxOffers: 999999, // Unlimited
    maxImpressions: 999999, // Unlimited
    contactEmail: 'contact@1s.agency',
    features: [
      'Unlimited active offers',
      'Unlimited impressions',
      'Custom analytics & reports',
      'Dedicated account manager',
      'White-label options',
      'Custom integrations',
      'SLA guarantee',
      'Advanced security features',
    ],
    limitations: [],
  },
};

// Helper functions
export const getPlan = (planId) => {
  return PLANS[planId] || PLANS.free;
};

export const isValidPlan = (planId) => {
  return Object.keys(PLANS).includes(planId);
};

export const getPaidPlans = () => {
  return Object.values(PLANS).filter(plan => plan.id !== 'free' && plan.id !== 'enterprise');
};

export const getAllPlans = () => {
  return Object.values(PLANS);
};