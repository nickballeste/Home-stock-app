import { z } from 'zod';

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
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'startTime must be HH:MM'),
  endTime: z.string().regex(/^\d{1,2}:\d{2}$/, 'endTime must be HH:MM'),
});

export const ReplaceRoutineSchema = z.object({
  slots: z.array(RoutineSlotSchema),
});

export type CreateMemberDto = z.infer<typeof CreateMemberSchema>;
export type UpdateMemberDto = z.infer<typeof UpdateMemberSchema>;
export type ReplaceRoutineDto = z.infer<typeof ReplaceRoutineSchema>;
