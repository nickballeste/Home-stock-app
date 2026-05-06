import { describe, it, expect } from 'vitest';
import { computeWeeklyPresenceHours } from './presence.js';

describe('computeWeeklyPresenceHours', () => {
  it('matches the spec example: 5×6h + 2×24h = 78h', () => {
    const slots = [
      // Mon–Fri 08:00–09:00 (1h × 5)
      ...[1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '08:00', endTime: '09:00' })),
      // Mon–Fri 18:00–23:00 (5h × 5)
      ...[1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '18:00', endTime: '23:00' })),
      // Sat–Sun 00:00–23:59 (24h × 2)
      { dayOfWeek: 0, startTime: '00:00', endTime: '23:59' },
      { dayOfWeek: 6, startTime: '00:00', endTime: '23:59' },
    ];
    expect(computeWeeklyPresenceHours(slots)).toBe(78);
  });

  it('ignores invalid slots (end before start)', () => {
    expect(
      computeWeeklyPresenceHours([{ dayOfWeek: 1, startTime: '20:00', endTime: '18:00' }]),
    ).toBe(0);
  });

  it('ignores malformed times', () => {
    expect(
      computeWeeklyPresenceHours([{ dayOfWeek: 1, startTime: 'bad', endTime: '18:00' }]),
    ).toBe(0);
  });
});
