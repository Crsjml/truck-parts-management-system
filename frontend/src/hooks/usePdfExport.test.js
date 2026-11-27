import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePdfExport } from './usePdfExport';

describe('usePdfExport', () => {
  it('is busy while the export runs and idle afterwards', async () => {
    let release;
    const fn = vi.fn(() => new Promise((r) => { release = r; }));
    const { result } = renderHook(() => usePdfExport(fn));
    let p;
    act(() => { p = result.current.exportPdf('a'); });
    expect(result.current.isExporting).toBe(true);
    await act(async () => { release(); await p; });
    expect(result.current.isExporting).toBe(false);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('captures a thrown error, calls onError and does not throw', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => usePdfExport(() => { throw new Error('boom'); }, { onError }));
    let ok;
    await act(async () => { ok = await result.current.exportPdf(); });
    expect(ok).toBe(false);
    expect(result.current.error.message).toBe('boom');
    expect(result.current.isExporting).toBe(false);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('ignores a second call while busy', async () => {
    let release;
    const fn = vi.fn(() => new Promise((r) => { release = r; }));
    const { result } = renderHook(() => usePdfExport(fn));
    let p1; let second;
    act(() => { p1 = result.current.exportPdf(); });
    await act(async () => { second = await result.current.exportPdf(); });
    expect(second).toBe(false);
    await act(async () => { release(); await p1; });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('calls onSuccess and clears a previous error', async () => {
    const onSuccess = vi.fn();
    let shouldFail = true;
    const { result } = renderHook(() => usePdfExport(() => { if (shouldFail) throw new Error('x'); }, { onSuccess }));
    await act(async () => { await result.current.exportPdf(); });
    expect(result.current.error).not.toBeNull();
    shouldFail = false;
    await act(async () => { await result.current.exportPdf(); });
    expect(result.current.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
