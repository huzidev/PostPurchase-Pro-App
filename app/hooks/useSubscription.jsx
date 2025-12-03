import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFetcher, useLocation } from 'react-router';

const SubscriptionContext = createContext(null);

function useSubscriptionState() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const fetcher = useFetcher();

  useEffect(() => {
    // Load subscription data on component mount only
    if (!hasInitialized && fetcher.state === 'idle' && !fetcher.data) {
      setHasInitialized(true);
      fetcher.submit(
        { intent: 'getSubscription' },
        { method: 'POST', action: '/app/plans' }
      );
    }
  }, [hasInitialized, fetcher.state, fetcher.data, fetcher]);

  useEffect(() => {
    if (fetcher.data) {
      setLoading(false);
      if (fetcher.data.success) {
        setSubscription(fetcher.data.subscription);
        setError(null);
      } else {
        setError(fetcher.data.message || 'Failed to load subscription');
      }
    }
  }, [fetcher.data]);

  useEffect(() => {
    setLoading(fetcher.state === 'loading');
  }, [fetcher.state]);

  const refreshSubscription = React.useCallback(() => {
    if (fetcher.state === 'idle') {
      setLoading(true);
      fetcher.submit(
        { intent: 'getSubscription' },
        { method: 'POST', action: '/app/plans' }
      );
    }
  }, [fetcher]);

  return {
    subscription,
    loading,
    error,
    refreshSubscription,
  };
}

export function SubscriptionProvider({ children }) {
  const state = useSubscriptionState();
  return (
    <SubscriptionContext.Provider value={state}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context) return context;
  // Fallback to local subscription state if no provider is present
  return useSubscriptionState();
}

// Hook to refresh subscription on route changes to key pages
export function useRouteSubscriptionCheck() {
  const { refreshSubscription, loading, subscription } = useSubscription();
  const location = useLocation();

  useEffect(() => {
    // Only refresh subscription on specific routes and conditions
    const shouldRefresh = 
      (location.pathname === '/app/plans' && location.search.includes('plan=')) || // Plans success callback
      (location.pathname === '/app' && !subscription) || // Dashboard without subscription
      (location.pathname === '/app/plans' && !loading && !subscription); // Plans page without subscription

    if (shouldRefresh && typeof refreshSubscription === 'function' && !loading) {
      refreshSubscription();
    }
  }, [location.pathname, location.search, refreshSubscription, loading, subscription]);
}