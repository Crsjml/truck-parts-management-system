import { useState, useEffect, useCallback } from 'react';
import { fetchSavedParts, savePart, unsavePart } from '../authStore';

export const useSavedParts = (customerSession) => {
  const [savedIds, setSavedIds] = useState(new Set());
  const [savedPartsCount, setSavedPartsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!customerSession) {
      setSavedIds(new Set());
      setSavedPartsCount(0);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      const result = await fetchSavedParts();
      if (result.partIds) {
        setSavedIds(new Set(result.partIds));
        setSavedPartsCount(result.savedPartsCount);
      }
      setIsLoading(false);
    };

    load();
  }, [customerSession]);

  const toggle = useCallback(
    async (partId) => {
      if (!customerSession) return { ok: false, error: 'Not logged in' };

      const isSaved = savedIds.has(partId);
      const prevIds = new Set(savedIds);
      const prevCount = savedPartsCount;

      // Optimistic update
      const nextIds = new Set(prevIds);
      if (isSaved) {
        nextIds.delete(partId);
      } else {
        nextIds.add(partId);
      }
      setSavedIds(nextIds);

      // Call API
      const result = isSaved ? await unsavePart(partId) : await savePart(partId);

      if (result.ok) {
        setSavedPartsCount(result.savedPartsCount);
        return { ok: true };
      } else {
        // Rollback on error
        setSavedIds(prevIds);
        setSavedPartsCount(prevCount);
        return { ok: false, error: result.error };
      }
    },
    [customerSession, savedIds, savedPartsCount]
  );

  return { savedIds, savedPartsCount, toggle, isLoading };
};
