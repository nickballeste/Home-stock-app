import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { SettingsServiceImpl, UpdateSettingsSchema } from './settings.service.js';

const row = {
  id: 'singleton',
  defaultAlertThresholdDays: 3,
  digestEmailTime: '08:00',
  digestEmailAddress: 'home@example.com',
  timezone: 'America/Sao_Paulo',
};

function makePrisma() {
  return {
    systemSettings: {
      upsert: vi.fn().mockResolvedValue(row),
    },
  } as unknown as PrismaClient & {
    systemSettings: { upsert: ReturnType<typeof vi.fn> };
  };
}

describe('SettingsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let svc: SettingsServiceImpl;

  beforeEach(() => {
    prisma = makePrisma();
    svc = new SettingsServiceImpl(prisma);
  });

  it('get() upserts the singleton row and maps it', async () => {
    const result = await svc.get();
    expect(prisma.systemSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'singleton' } }),
    );
    expect(result).toEqual(row);
  });

  it('update() only patches the provided fields', async () => {
    await svc.update({ defaultAlertThresholdDays: 5 });
    const args = prisma.systemSettings.upsert.mock.calls[0]![0];
    expect(args.update).toEqual({ defaultAlertThresholdDays: 5 });
  });

  it('update() can patch several fields at once', async () => {
    await svc.update({ digestEmailTime: '09:30', timezone: 'UTC' });
    const args = prisma.systemSettings.upsert.mock.calls[0]![0];
    expect(args.update).toEqual({ digestEmailTime: '09:30', timezone: 'UTC' });
  });
});

describe('UpdateSettingsSchema', () => {
  it('accepts a valid partial update', () => {
    expect(
      UpdateSettingsSchema.safeParse({ defaultAlertThresholdDays: 7 }).success,
    ).toBe(true);
  });

  it('rejects an invalid digest time', () => {
    expect(UpdateSettingsSchema.safeParse({ digestEmailTime: '9am' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(UpdateSettingsSchema.safeParse({ digestEmailAddress: 'not-an-email' }).success).toBe(
      false,
    );
  });

  it('rejects thresholds outside 0–60', () => {
    expect(UpdateSettingsSchema.safeParse({ defaultAlertThresholdDays: 61 }).success).toBe(false);
    expect(UpdateSettingsSchema.safeParse({ defaultAlertThresholdDays: -1 }).success).toBe(false);
  });
});
