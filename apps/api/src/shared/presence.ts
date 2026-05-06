import type { DayOfWeek } from '@homestock/types';

interface SlotInput {
  dayOfWeek: DayOfWeek | number;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

/**
 * Compute weekly presence hours from a list of routine slots.
 * - Slots are summed without de-duplication (overlap is the user's choice).
 * - "End time before start time" is treated as zero hours (invalid slot).
 * - "23:59" is rounded up to the full hour to allow "full day" extraction.
 */
export function computeWeeklyPresenceHours(slots: SlotInput[]): number {
  let total = 0;
  for (const slot of slots) {
    const start = parseHHMM(slot.startTime);
    const end = parseHHMM(slot.endTime);
    if (start === null || end === null) continue;

    const minutes = end - start;
    if (minutes <= 0) continue;
    total += minutes / 60;
  }
  return Math.round(total * 100) / 100;
}

function parseHHMM(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const mn = Number(m[2]);
  if (h < 0 || h > 23 || mn < 0 || mn > 59) return null;
  // Treat 23:59 as 24:00 so users can express "full day"
  if (h === 23 && mn === 59) return 24 * 60;
  return h * 60 + mn;
}
