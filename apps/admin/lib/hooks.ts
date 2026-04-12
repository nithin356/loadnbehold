'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAdminAuthStore } from './store';
import { toast } from 'sonner';

export function useAdminFetch<T>(fetchFn: (token: string) => Promise<T>) {
  const { accessToken } = useAdminAuthStore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn(accessToken);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
      toast.error(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [accessToken, fetchFn]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
