import { z } from 'zod';
import { HHMM_REGEX } from '../../shared/presence.js';

export const CreateMemberSchema = z.object({
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().nullish(),
});

export const UpdateMemberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullish(),
});

export const RoutineSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(HHMM_REGEX, 'startTime must be HH:MM (00:00–23:59)'),
  endTime: z.string().regex(HHMM_REGEX, 'endTime must be HH:MM (00:00–23:59)'),
});

export const ReplaceRoutineSchema = z.object({
  slots: z.array(RoutineSlotSchema),
});

export type CreateMemberDto = z.infer<typeof CreateMemberSchema>;
export type UpdateMemberDto = z.infer<typeof UpdateMemberSchema>;
export type ReplaceRoutineDto = z.infer<typeof ReplaceRoutineSchema>;
