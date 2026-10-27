import { describe, it, expect } from 'vitest';
import { byChannel } from '../salesAnalytics';

describe('byChannel', () => {
  const transactions = [
    { id: '1', salesChannel: 'WEB' },
    { id: '2', salesChannel: 'POS' },
    { id: '3', salesChannel: 'WEB' },
  ];

  it('returns all transactions when channel is "all"', () => {
    const result = byChannel(transactions, 'all');
    expect(result).toHaveLength(3);
  });

  it('returns only online transactions when channel is "online"', () => {
    const result = byChannel(transactions, 'online');
    expect(result).toHaveLength(2);
    expect(result.map(t => t.id)).toEqual(['1', '3']);
  });

  it('returns only store transactions when channel is "store"', () => {
    const result = byChannel(transactions, 'store');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});
