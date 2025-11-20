import { useState, useEffect } from 'react';
import { useFetcher } from 'react-router';

export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetcher = useFetcher();

  useEffect(() => {
    // Load subscription data on component mount and when fetcher data changes
    if (fetcher.state === 'idle' && !fetcher.data) {
      fetcher.submit(
        { intent: 'getSubscription' },
        { method: 'POST', action: '/app/plans' }
      );
    }
  }, []);

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

  const refreshSubscription = () => {
    setLoading(true);
    fetcher.submit(
      { intent: 'getSubscription' },
      { method: 'POST', action: '/app/plans' }
    );
  };

  return {
    subscription,
    loading,
    error,
    refreshSubscription,
  };
}