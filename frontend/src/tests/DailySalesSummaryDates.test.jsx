import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DailySalesSummary from '../components/analytics/DailySalesSummary';
import BestSellingPartsReport from '../components/analytics/BestSellingPartsReport';

vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({ formatBaseCurrency: (n) => `PHP ${n}` }),
}));

const dateInput = (container) => container.querySelector('input[type="date"]');

describe('analytics local-date stepping (run with TZ=Asia/Manila)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 07:00 Manila on 2026-11-26 == 2026-11-25T23:00Z (UTC date is still the 25th)
    vi.setSystemTime(new Date('2026-11-25T23:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('defaults to the local today and max is local today', () => {
    const { container } = render(<DailySalesSummary transactions={[]} />);
    expect(dateInput(container).value).toBe('2026-11-26');
    expect(dateInput(container).max).toBe('2026-11-26');
  });

  it('Prev goes to the 25th, then Next returns to the 26th and is blocked after', () => {
    const { container } = render(<DailySalesSummary transactions={[]} />);
    fireEvent.click(screen.getByTitle('Previous Day'));
    expect(dateInput(container).value).toBe('2026-11-25');
    fireEvent.click(screen.getByTitle('Next Day'));
    expect(dateInput(container).value).toBe('2026-11-26');
    fireEvent.click(screen.getByTitle('Next Day'));
    expect(dateInput(container).value).toBe('2026-11-26');
  });

  it('Next from an earlier day advances to the next calendar day', () => {
    const { container } = render(<DailySalesSummary transactions={[]} />);
    fireEvent.change(dateInput(container), { target: { value: '2026-11-20' } });
    fireEvent.click(screen.getByTitle('Next Day'));
    expect(dateInput(container).value).toBe('2026-11-21');
  });

  it('report default range ends on the local today', () => {
    const { container } = render(<BestSellingPartsReport transactions={[]} parts={[]} />);
    const inputs = container.querySelectorAll('input[type="date"]');
    expect(inputs[0].value).toBe('2026-10-27');
    expect(inputs[1].value).toBe('2026-11-26');
  });
});
