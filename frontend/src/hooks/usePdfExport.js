import { useCallback, useRef, useState } from 'react';

/**
 * Wraps a (sync or async) PDF builder with busy state, error capture and a
 * double-click guard. Optional callbacks surface the result (e.g. a toast).
 *
 * @param {(...args:any[]) => any} exportFn
 * @param {{ onSuccess?: () => void, onError?: (error: Error) => void }} [options]
 */
export function usePdfExport(exportFn, { onSuccess, onError } = {}) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const busyRef = useRef(false);

  const exportPdf = useCallback(async (...args) => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setIsExporting(true);
    setError(null);
    try {
      await exportFn(...args);
      onSuccess?.();
      return true;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error(String(err));
      setError(normalized);
      onError?.(normalized);
      return false;
    } finally {
      busyRef.current = false;
      setIsExporting(false);
    }
  }, [exportFn, onSuccess, onError]);

  const reset = useCallback(() => setError(null), []);

  return { exportPdf, isExporting, error, reset };
}

export default usePdfExport;
