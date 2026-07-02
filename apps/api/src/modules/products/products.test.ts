import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ProductsRepository, DbProductWithRelations } from './products.repository.js';
import type { AIService } from '../ai/ai.service.js';
import type { SettingsService } from '../settings/settings.service.js';
import type { MembersRepository } from '../members/members.repository.js';
import type { CategoriesRepository } from '../categories/categories.repository.js';
import { ProductsServiceImpl } from './products.service.js';
import { addDays, startOfDay } from '../../shared/dates.js';

const NOW = new Date('2026-05-06T10:00:00Z');

function makeProduct(overrides: Partial<DbProductWithRelations> = {}): DbProductWithRelations {
  const today = startOfDay(NOW);
  return {
    id: 'p1',
    name: 'Shampoo',
    brand: 'Elseve',
    categoryId: 'c1',
    systemProductId: null,
    unit: 'ml',
    packageSize: 400,
    currentQuantity: 1,
    consumerScope: 'all',
    consumerMemberIds: [],
    estimatedDurationDays: 23,
    estimatedEndDate: addDays(today, 23),
    durationOverridden: false,
    confidenceNote: 'about three weeks',
    archivedAt: null,
    replacedById: null,
    createdAt: today,
    updatedAt: today,
    category: { id: 'c1', name: 'Hygiene', icon: 'droplet' },
    alertConfig: {
      id: 'a1',
      productId: 'p1',
      overrideThresholdDays: null,
      emailEnabled: true,
    },
    ...overrides,
  };
}

function makeRepo(p: DbProductWithRelations): ProductsRepository & {
  update: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
} {
  return {
    list: vi.fn().mockResolvedValue([p]),
    findById: vi.fn().mockResolvedValue(p),
    create: vi.fn().mockImplementation(async (input) => makeProduct(input)),
    update: vi.fn().mockImplementation(async (_id, data) => makeProduct({ ...p, ...data })),
    delete: vi.fn().mockResolvedValue(undefined),
    upsertAlertConfig: vi.fn().mockResolvedValue(p.alertConfig!),
  };
}

const aiMock: AIService = {
  extractRoutineFromPrompt: vi.fn(),
  inferProductDuration: vi.fn().mockResolvedValue({
    estimatedDurationDays: 30,
    estimatedEndDate: addDays(NOW, 30).toISOString(),
    confidenceNote: 'estimate',
  }),
  extractProductFromImage: vi.fn(),
};

const settingsMock: SettingsService = {
  get: vi.fn().mockResolvedValue({
    id: 'singleton',
    defaultAlertThresholdDays: 3,
    digestEmailTime: '08:00',
    digestEmailAddress: '',
    timezone: 'America/Sao_Paulo',
  }),
  update: vi.fn(),
};

const categoriesMock: CategoriesRepository = {
  findById: vi.fn().mockResolvedValue({ id: 'c1', name: 'Hygiene', icon: 'droplet' }),
  list: vi.fn().mockResolvedValue([]),
  upsertByName: vi.fn().mockResolvedValue({ id: 'c-unc', name: 'Uncategorized', icon: 'box' }),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const membersMock: MembersRepository = {
  list: vi.fn().mockResolvedValue([
    {
      id: 'm1',
      name: 'A',
      avatarUrl: null,
      weeklyPresenceHours: 78,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'm2',
      name: 'B',
      avatarUrl: null,
      weeklyPresenceHours: 30,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  listRoutineSlots: vi.fn(),
  replaceRoutine: vi.fn(),
  countMembersConsuming: vi.fn(),
  removeMemberFromAllProducts: vi.fn(),
};

function makeService(repo: ProductsRepository) {
  return new ProductsServiceImpl(repo, aiMock, settingsMock, membersMock, categoriesMock);
}

describe('ProductsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  describe('computeAlertStatus', () => {
    const svc = makeService(makeRepo(makeProduct()));

    it('returns "overdue" when end date is in the past', () => {
      const p = makeProduct({ estimatedEndDate: addDays(NOW, -1) });
      expect(svc.computeAlertStatus(p, 3, NOW)).toBe('overdue');
    });

    it('returns "alert" when within threshold', () => {
      const p = makeProduct({ estimatedEndDate: addDays(NOW, 2) });
      expect(svc.computeAlertStatus(p, 3, NOW)).toBe('alert');
    });

    it('returns "ok" beyond threshold', () => {
      const p = makeProduct({ estimatedEndDate: addDays(NOW, 10) });
      expect(svc.computeAlertStatus(p, 3, NOW)).toBe('ok');
    });

    it('respects per-product threshold override', () => {
      const p = makeProduct({
        estimatedEndDate: addDays(NOW, 5),
        alertConfig: { id: 'a1', productId: 'p1', overrideThresholdDays: 7, emailEnabled: true },
      });
      expect(svc.computeAlertStatus(p, 3, NOW)).toBe('alert');
    });
  });

  describe('create', () => {
    it('runs AI inference with the full household context by default', async () => {
      const repo = makeRepo(makeProduct());
      const svc = makeService(repo);

      await svc.create({
        name: 'Shampoo',
        brand: 'Elseve',
        categoryId: 'c1',
        unit: 'ml',
        packageSize: 400,
        currentQuantity: 1,
        consumerScope: 'all',
        consumerMemberIds: [],
      });

      expect(aiMock.inferProductDuration).toHaveBeenCalledWith(
        expect.objectContaining({
          product: expect.objectContaining({ name: 'Shampoo', category: 'Hygiene' }),
          household: { totalWeeklyPresenceHours: 108, memberCount: 2 },
        }),
      );
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          estimatedDurationDays: 30,
          durationOverridden: false,
          confidenceNote: 'estimate',
        }),
      );
    });

    it('scopes household context to the consuming members when specific', async () => {
      const repo = makeRepo(makeProduct());
      const svc = makeService(repo);

      await svc.create({
        name: 'Shampoo',
        categoryId: 'c1',
        unit: 'ml',
        packageSize: 400,
        currentQuantity: 1,
        consumerScope: 'specific',
        consumerMemberIds: ['m2'],
      });

      expect(aiMock.inferProductDuration).toHaveBeenCalledWith(
        expect.objectContaining({
          household: { totalWeeklyPresenceHours: 30, memberCount: 1 },
        }),
      );
    });

    it('skips AI and marks overridden when a duration is provided', async () => {
      const repo = makeRepo(makeProduct());
      const svc = makeService(repo);

      await svc.create({
        name: 'Shampoo',
        categoryId: 'c1',
        unit: 'ml',
        packageSize: 400,
        currentQuantity: 1,
        consumerScope: 'all',
        consumerMemberIds: [],
        estimatedDurationDays: 15,
      });

      expect(aiMock.inferProductDuration).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ estimatedDurationDays: 15, durationOverridden: true }),
      );
    });

    it('falls back to the Uncategorized category when none is given', async () => {
      const repo = makeRepo(makeProduct());
      const svc = makeService(repo);

      await svc.create({
        name: 'Mystery item',
        unit: 'units',
        packageSize: 1,
        currentQuantity: 1,
        consumerScope: 'all',
        consumerMemberIds: [],
        estimatedDurationDays: 10,
      });

      expect(categoriesMock.upsertByName).toHaveBeenCalledWith('Uncategorized', 'box');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'c-unc' }),
      );
    });
  });

  describe('overrideDuration', () => {
    it('sets durationOverridden=true and syncs end date from days', async () => {
      const repo = makeRepo(makeProduct());
      const svc = makeService(repo);

      await svc.overrideDuration('p1', { estimatedDurationDays: 10 });
      expect(repo.update).toHaveBeenCalledWith('p1', expect.objectContaining({
        estimatedDurationDays: 10,
        durationOverridden: true,
      }));
      const calledEndDate = repo.update.mock.calls[0]![1].estimatedEndDate as Date;
      expect(calledEndDate.toISOString()).toBe(addDays(startOfDay(NOW), 10).toISOString());
    });

    it('syncs days from end date', async () => {
      const repo = makeRepo(makeProduct());
      const svc = makeService(repo);

      const target = addDays(startOfDay(NOW), 7).toISOString();
      await svc.overrideDuration('p1', { estimatedEndDate: target });
      expect(repo.update).toHaveBeenCalledWith('p1', expect.objectContaining({
        estimatedDurationDays: 7,
        durationOverridden: true,
      }));
    });
  });

  describe('restock', () => {
    it('increments currentQuantity by 1', async () => {
      const repo = makeRepo(makeProduct({ currentQuantity: 2 }));
      const svc = makeService(repo);

      await svc.restock('p1');
      expect(repo.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ currentQuantity: 3 }),
      );
    });

    it('does NOT re-infer when duration is overridden', async () => {
      const repo = makeRepo(makeProduct({ durationOverridden: true }));
      const svc = makeService(repo);

      await svc.restock('p1');
      expect(aiMock.inferProductDuration).not.toHaveBeenCalled();
    });

    it('re-infers when duration is not overridden', async () => {
      const repo = makeRepo(makeProduct({ durationOverridden: false }));
      const svc = makeService(repo);

      await svc.restock('p1');
      expect(aiMock.inferProductDuration).toHaveBeenCalled();
    });

    it('re-infers and clears the override when restocking from empty', async () => {
      // The markFinished flow leaves quantity 0, end date in the past and
      // durationOverridden=true — restocking must not leave it stuck there.
      const repo = makeRepo(
        makeProduct({
          currentQuantity: 0,
          durationOverridden: true,
          estimatedEndDate: addDays(NOW, -1),
        }),
      );
      const svc = makeService(repo);

      await svc.restock('p1');
      expect(aiMock.inferProductDuration).toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith('p1', expect.objectContaining({
        currentQuantity: 1,
        durationOverridden: false,
        estimatedDurationDays: 30,
      }));
    });
  });

  describe('markFinished', () => {
    it('zeroes the quantity and moves the end date into the past', async () => {
      const repo = makeRepo(makeProduct({ currentQuantity: 2 }));
      const svc = makeService(repo);

      const result = await svc.markFinished('p1');
      expect(repo.update).toHaveBeenCalledWith('p1', expect.objectContaining({
        currentQuantity: 0,
        durationOverridden: true,
      }));
      const endDate = repo.update.mock.calls[0]![1].estimatedEndDate as Date;
      expect(endDate.getTime()).toBeLessThan(startOfDay(NOW).getTime());
      expect(result.alertStatus).toBe('overdue');
    });
  });

  describe('replace', () => {
    it('creates the new product and archives the old one', async () => {
      const repo = makeRepo(makeProduct());
      const svc = makeService(repo);

      await svc.replace('p1', {
        name: 'New Shampoo',
        categoryId: 'c1',
        unit: 'ml',
        packageSize: 500,
        currentQuantity: 1,
        consumerScope: 'all',
        consumerMemberIds: [],
        estimatedDurationDays: 20,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Shampoo' }),
      );
      expect(repo.update).toHaveBeenCalledWith('p1', expect.objectContaining({
        archivedAt: expect.any(Date),
      }));
    });
  });

  describe('list filtering', () => {
    it('filters by status', async () => {
      const p1 = makeProduct({ id: 'p1', estimatedEndDate: addDays(NOW, -1) }); // overdue
      const p2 = makeProduct({ id: 'p2', estimatedEndDate: addDays(NOW, 30) }); // ok
      const repo = makeRepo(p1);
      repo.list = vi.fn().mockResolvedValue([p1, p2]);
      const svc = makeService(repo);

      const result = await svc.list({ status: 'overdue' });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('p1');
    });
  });
});
