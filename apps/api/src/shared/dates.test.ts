import { describe, it, expect } from 'vitest';
import { addDays, diffInDays, startOfDay } from './dates.js';

describe('date helpers', () => {
  it('addDays advances by N days', () => {
    const d = new Date('2026-05-01T12:00:00Z');
    expect(addDays(d, 3).toISOString()).toBe('2026-05-04T12:00:00.000Z');
  });

  it('addDays accepts negative values', () => {
    const d = new Date('2026-05-01T00:00:00Z');
    expect(addDays(d, -1).toISOString()).toBe('2026-04-30T00:00:00.000Z');
  });

  it('startOfDay zeros the time', () => {
    const d = new Date('2026-05-01T15:42:13Z');
    expect(startOfDay(d).toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('diffInDays counts whole days regardless of time', () => {
    const a = new Date('2026-05-01T22:00:00Z');
    const b = new Date('2026-05-04T03:00:00Z');
    expect(diffInDays(a, b)).toBe(3);
  });
});
