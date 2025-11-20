import db from "../db.server";
import { PLANS, getPlan, isValidPlan } from "../utils/plans";

export default class Subscription {
  constructor(shopify_url, graphql) {
    this.shopify_url = shopify_url;
    this.graphql = graphql;
  }

  // Helper function to get plan configuration
  static getPlanConfig(planId) {
    return getPlan(planId);
  }

  // Helper function to validate plan exists
  static isValidPlan(planId) {
    return isValidPlan(planId);
  }

  // Get current subscription from database
  async getCurrentSubscription() {
    try {
      const subscription = await db.subscription.findUnique({
        where: {
          shopify_url: this.shopify_url,
        },
      });

      return {
        status: 200,
        subscription: subscription || this.getDefaultSubscription(),
      };
    } catch (error) {
      console.error("Error getting current subscription:", error);
      return {
        status: 500,
        message: "Failed to get current subscription",
        error: error.message,
      };
    }
  }

  // Get default free subscription data
  getDefaultSubscription() {
    const freeConfig = PLANS.free;
    return {
      shopify_url: this.shopify_url,
      plan_id: freeConfig.id,
      plan_name: freeConfig.name,
      plan_price: freeConfig.priceValue,
      max_active_offers: freeConfig.maxOffers,
      max_impressions_monthly: freeConfig.maxImpressions,
      is_active: false,
    };
  }

  // Create or update subscription with plan data
  async createSubscription(planId, shopifySubscriptionId = null, chargeId = null) {
    try {
      if (!Subscription.isValidPlan(planId)) {
        return {
          status: 400,
          message: "Invalid plan ID provided",
        };
      }

      const planConfig = Subscription.getPlanConfig(planId);
      const subscriptionData = this.buildSubscriptionData(planConfig, shopifySubscriptionId, chargeId);

      const existingSubscription = await this.findExistingSubscription();
      
      let subscription;
      if (existingSubscription) {
        subscription = await this.updateExistingSubscription(subscriptionData);
      } else {
        subscription = await this.createNewSubscription(subscriptionData);
      }

      return {
        status: 200,
        message: "Subscription created/updated successfully",
        subscription,
      };
    } catch (error) {
      console.error("Error creating subscription:", error);
      return {
        status: 500,
        message: "Failed to create/update subscription",
        error: error.message,
      };
    }
  }

  // Build subscription data from plan config
  buildSubscriptionData(planConfig, shopifySubscriptionId, chargeId) {
    const now = new Date();
    const expiresAt = planConfig.id === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return {
      shopify_subscription_id: shopifySubscriptionId,
      charge_id: chargeId,
      plan_id: planConfig.id,
      plan_name: planConfig.name,
      plan_price: planConfig.priceValue || 0,
      max_active_offers: planConfig.maxOffers,
      max_impressions_monthly: planConfig.maxImpressions,
      is_active: true,
      started_at: now,
      expires_at: expiresAt,
      updatedAt: now,
    };
  }

  // Find existing subscription
  async findExistingSubscription() {
    return await db.subscription.findUnique({
      where: {
        shopify_url: this.shopify_url,
      },
    });
  }

  // Update existing subscription
  async updateExistingSubscription(subscriptionData) {
    return await db.subscription.update({
      where: {
        shopify_url: this.shopify_url,
      },
      data: subscriptionData,
    });
  }

  // Create new subscription
  async createNewSubscription(subscriptionData) {
    return await db.subscription.create({
      data: {
        shopify_url: this.shopify_url,
        ...subscriptionData,
      },
    });
  }

  // Cancel subscription
  async cancelSubscription() {
    try {
      const subscription = await db.subscription.update({
        where: {
          shopify_url: this.shopify_url,
        },
        data: {
          is_active: false,
          updatedAt: new Date(),
        },
      });

      return {
        status: 200,
        message: "Subscription cancelled successfully",
        subscription,
      };
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      return {
        status: 500,
        message: "Failed to cancel subscription",
        error: error.message,
      };
    }
  }

  // Update subscription status
  async updateSubscriptionStatus(isActive) {
    try {
      const subscription = await db.subscription.update({
        where: {
          shopify_url: this.shopify_url,
        },
        data: {
          is_active: isActive,
          updatedAt: new Date(),
        },
      });

      return {
        status: 200,
        message: `Subscription ${isActive ? "activated" : "deactivated"} successfully`,
        subscription,
      };
    } catch (error) {
      console.error("Error updating subscription status:", error);
      return {
        status: 500,
        message: "Failed to update subscription status",
        error: error.message,
      };
    }
  }

  // Create Shopify GraphQL subscription
  async createGraphqlSubscription(shopDomain, accessToken, planId, returnUrl) {
    try {
      if (!Subscription.isValidPlan(planId)) {
        return {
          status: 400,
          message: "Invalid plan ID provided",
        };
      }

      const planConfig = Subscription.getPlanConfig(planId);
      
      if (planId === 'free' || planId === 'enterprise') {
        return {
          status: 400,
          message: planId === 'free' 
            ? "Cannot create Shopify subscription for free plan" 
            : "Enterprise plan requires custom pricing. Please contact sales.",
        };
      }

      const mutation = this.buildSubscriptionMutation();
      const variables = this.buildMutationVariables(planConfig, returnUrl);

      const response = await this.executeGraphqlMutation(shopDomain, accessToken, mutation, variables);
      return await this.processSubscriptionResponse(response);

    } catch (error) {
      console.error("Error creating GraphQL subscription:", error);
      return {
        status: 500,
        message: "Failed to create subscription",
        error: error?.message || String(error),
      };
    }
  }

  // Build GraphQL mutation
  buildSubscriptionMutation() {
    return `
      mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!, $test: Boolean, $trialDays: Int) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          lineItems: $lineItems
          test: $test
          trialDays: $trialDays
        ) {
          confirmationUrl
          userErrors {
            field
            message
          }
          appSubscription {
            id
            name
            status
          }
        }
      }
    `;
  }

  // Build mutation variables
  buildMutationVariables(planConfig, returnUrl) {
    return {
      name: planConfig.name,
      returnUrl,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              interval: "EVERY_30_DAYS",
              price: { amount: planConfig.priceValue.toString(), currencyCode: "USD" },
            },
          },
        },
      ],
      test: true,
      trialDays: planConfig.id === 'starter' ? 5 : 0,
    };
  }

  // Execute GraphQL mutation
  async executeGraphqlMutation(shopDomain, accessToken, mutation, variables) {
    return await fetch(`https://${shopDomain}/admin/api/2024-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });
  }

  // Process subscription response
  async processSubscriptionResponse(response) {
    const result = await response.json();
    console.log("Subscription creation result:", JSON.stringify(result, null, 2));

    const data = result.data?.appSubscriptionCreate;

    if (data?.userErrors?.length) {
      return {
        status: 400,
        message: "Failed to create subscription",
        errors: data.userErrors,
      };
    }

    return {
      status: 200,
      message: "Subscription created successfully",
      confirmationUrl: data.confirmationUrl,
      subscription: data.appSubscription,
    };
  }

  // Get active Shopify subscription
  async getActiveSubscription(shopDomain, accessToken) {
    try {
      const query = this.buildActiveSubscriptionQuery();
      const response = await this.executeGraphqlQuery(shopDomain, accessToken, query);
      const result = await response.json();

      console.log("Active subscription result:", JSON.stringify(result, null, 2));

      const subscriptions = result.data?.currentAppInstallation?.activeSubscriptions || [];

      return {
        status: 200,
        message: "Fetched active subscriptions successfully",
        subscriptions,
      };
    } catch (error) {
      console.error("Error fetching active subscription:", error);
      return {
        status: 500,
        message: "Failed to fetch active subscription",
        error: error?.message || String(error),
      };
    }
  }

  // Build active subscription query
  buildActiveSubscriptionQuery() {
    return `
      {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            test
            trialDays
            lineItems {
              plan {
                pricingDetails {
                  __typename
                  ... on AppRecurringPricing {
                    interval
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
  }

  // Execute GraphQL query
  async executeGraphqlQuery(shopDomain, accessToken, query) {
    return await fetch(`https://${shopDomain}/admin/api/2024-10/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    });
  }

  // Cancel Shopify subscription
  async cancelShopifySubscription(shopDomain, accessToken) {
    try {
      const activeResult = await this.getActiveSubscription(shopDomain, accessToken);
      
      if (activeResult.status !== 200 || !activeResult.subscriptions || activeResult.subscriptions.length === 0) {
        return {
          status: 200,
          message: "No active subscription found to cancel",
        };
      }

      const subscriptionId = activeResult.subscriptions[0].id;
      const mutation = this.buildCancelSubscriptionMutation();
      const variables = { id: subscriptionId };

      const response = await this.executeGraphqlMutation(shopDomain, accessToken, mutation, variables);
      return await this.processCancellationResponse(response);

    } catch (error) {
      console.error("Error cancelling Shopify subscription:", error);
      return {
        status: 500,
        message: "Failed to cancel Shopify subscription",
        error: error?.message || String(error),
      };
    }
  }

  // Build cancellation mutation
  buildCancelSubscriptionMutation() {
    return `
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
  }

  // Process cancellation response
  async processCancellationResponse(response) {
    const result = await response.json();
    console.log("Cancellation result:", JSON.stringify(result, null, 2));

    if (result.errors) {
      return {
        status: 500,
        message: "GraphQL errors occurred",
        errors: result.errors,
      };
    }

    const { appSubscriptionCancel } = result.data;

    if (appSubscriptionCancel.userErrors && appSubscriptionCancel.userErrors.length > 0) {
      return {
        status: 400,
        message: "Failed to cancel subscription",
        errors: appSubscriptionCancel.userErrors,
      };
    }

    return {
      status: 200,
      message: "Shopify subscription cancelled successfully",
      subscription: appSubscriptionCancel.appSubscription,
    };
  }

  // Get subscription with usage analytics
  async getSubscriptionWithUsage() {
    try {
      const subscription = await this.getCurrentSubscription();
      
      if (subscription.status !== 200) {
        return subscription;
      }

      const usage = await this.calculateUsage();
      
      return {
        status: 200,
        subscription: subscription.subscription,
        usage,
      };
    } catch (error) {
      console.error("Error getting subscription with usage:", error);
      return {
        status: 500,
        message: "Failed to get subscription usage",
        error: error.message,
      };
    }
  }

  // Calculate current usage
  async calculateUsage() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeOffersCount, monthImpressionsCount] = await Promise.all([
      this.getActiveOffersCount(),
      this.getMonthImpressionsCount(monthStart),
    ]);

    const subscription = await this.findExistingSubscription() || this.getDefaultSubscription();

    const planConfig = getPlan(subscription.plan_id);
    
    return {
      active_offers_count: activeOffersCount,
      can_create_more_offers: activeOffersCount < subscription.max_active_offers,
      month_impressions_count: monthImpressionsCount,
      impressions_limit: subscription.max_impressions_monthly,
      can_show_more_offers: monthImpressionsCount < subscription.max_impressions_monthly,
      plan_features: planConfig.features,
      plan_limitations: planConfig.limitations,
    };
  }

  // Get active offers count
  async getActiveOffersCount() {
    return await db.offer.count({
      where: {
        shopify_url: this.shopify_url,
        status: 'active',
      },
    });
  }

  // Get monthly impressions count
  async getMonthImpressionsCount(monthStart) {
    const result = await db.analytics.aggregate({
      where: {
        shopify_url: this.shopify_url,
        createdAt: { gte: monthStart },
      },
      _sum: {
        impressions: true,
      },
    });

    return result._sum.impressions || 0;
  }

  // Check if user can perform action based on plan limits
  async canPerformAction(action, data = {}) {
    try {
      const { subscription, usage } = (await this.getSubscriptionWithUsage());
      
      switch (action) {
        case 'create_offer':
          return {
            allowed: usage.can_create_more_offers,
            message: usage.can_create_more_offers ? 
              'You can create more offers' : 
              `You've reached the maximum of ${subscription.max_active_offers} active offers for your ${subscription.plan_name} plan`,
          };
        
        case 'show_offer':
          return {
            allowed: usage.can_show_more_offers,
            message: usage.can_show_more_offers ? 
              'You can show more offers' : 
              `You've reached the monthly limit of ${subscription.max_impressions_monthly} impressions for your ${subscription.plan_name} plan`,
          };
        
        case 'access_analytics':
          const hasAdvancedAnalytics = ['professional', 'enterprise'].includes(subscription.plan_id);
          return {
            allowed: hasAdvancedAnalytics,
            message: hasAdvancedAnalytics ? 
              'You have access to advanced analytics' : 
              'Upgrade to Professional or Enterprise plan to access advanced analytics',
          };
        
        case 'ab_testing':
          const hasABTesting = ['starter', 'professional', 'enterprise'].includes(subscription.plan_id);
          return {
            allowed: hasABTesting,
            message: hasABTesting ? 
              'A/B testing is available' : 
              'Upgrade to Starter plan or higher to access A/B testing',
          };
        
        default:
          return {
            allowed: true,
            message: 'Action allowed',
          };
      }
    } catch (error) {
      console.error("Error checking action permissions:", error);
      return {
        allowed: false,
        message: 'Error checking permissions',
        error: error.message,
      };
    }
  }
}