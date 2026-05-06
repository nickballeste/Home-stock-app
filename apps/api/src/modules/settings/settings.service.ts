import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import type { SystemSettings, UpdateSettingsInput } from '@homestock/types';

export const UpdateSettingsSchema = z.object({
  defaultAlertThresholdDays: z.number().int().min(0).max(60).optional(),
  digestEmailTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  digestEmailAddress: z.string().email().optional(),
  timezone: z.string().min(1).optional(),
});

export interface SettingsService {
  get(): Promise<SystemSettings>;
  update(input: UpdateSettingsInput): Promise<SystemSettings>;
}

export class SettingsServiceImpl implements SettingsService {
  constructor(private readonly prisma: PrismaClient) {}

  async get(): Promise<SystemSettings> {
    const row = await this.prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', digestEmailAddress: '' },
      update: {},
    });
    return {
      id: row.id,
      defaultAlertThresholdDays: row.defaultAlertThresholdDays,
      digestEmailTime: row.digestEmailTime,
      digestEmailAddress: row.digestEmailAddress,
      timezone: row.timezone,
    };
  }

  async update(input: UpdateSettingsInput): Promise<SystemSettings> {
    const row = await this.prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        defaultAlertThresholdDays: input.defaultAlertThresholdDays ?? 3,
        digestEmailTime: input.digestEmailTime ?? '08:00',
        digestEmailAddress: input.digestEmailAddress ?? '',
        timezone: input.timezone ?? 'America/Sao_Paulo',
      },
      update: {
        ...(input.defaultAlertThresholdDays !== undefined
          ? { defaultAlertThresholdDays: input.defaultAlertThresholdDays }
          : {}),
        ...(input.digestEmailTime !== undefined ? { digestEmailTime: input.digestEmailTime } : {}),
        ...(input.digestEmailAddress !== undefined
          ? { digestEmailAddress: input.digestEmailAddress }
          : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      },
    });
    return {
      id: row.id,
      defaultAlertThresholdDays: row.defaultAlertThresholdDays,
      digestEmailTime: row.digestEmailTime,
      digestEmailAddress: row.digestEmailAddress,
      timezone: row.timezone,
    };
  }
}
