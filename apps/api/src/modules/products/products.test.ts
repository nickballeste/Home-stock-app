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
    findActiveBefore: vi.fn().mockResolvedValue([]),
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

describe('ProductsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  describe('computeAlertStatus', () => {
    const repo = makeRepo(makeProduct());
    const svc = new ProductsServiceImpl(repo, aiMock, settingsMock, membersMock, categoriesMock);

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

  describe('overrideDuration', () => {
    it('sets durationOverridden=true and syncs end date from days', async () => {
      const p = makeProduct();
      const repo = makeRepo(p);
      const svc = new ProductsServiceImpl(repo, aiMock, settingsMock, membersMock, categoriesMock);

      await svc.overrideDuration('p1', { estimatedDurationDays: 10 });
      expect(repo.update).toHaveBeenCalledWith('p1', expect.objectContaining({
        estimatedDurationDays: 10,
        durationOverridden: true,
      }));
      const calledEndDate = repo.update.mock.calls[0]![1].estimatedEndDate as Date;
      expect(calledEndDate.toISOString()).toBe(addDays(startOfDay(NOW), 10).toISOString());
    });

    it('syncs days from end date', async () => {
      const p = makeProduct();
      const repo = makeRepo(p);
      const svc = new ProductsServiceImpl(repo, aiMock, settingsMock, membersMock, categoriesMock);

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
      const p = makeProduct({ currentQuantity: 2 });
      const repo = makeRepo(p);
      const svc = new ProductsServiceImpl(repo, aiMock, settingsMock, membersMock, categoriesMock);

      await svc.restock('p1');
      expect(repo.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ currentQuantity: 3 }),
      );
    });

    it('does NOT re-infer when duration is overridden', async () => {
      const p = makeProduct({ durationOverridden: true });
      const repo = makeRepo(p);
      const svc = new ProductsServiceImpl(repo, aiMock, settingsMock, membersMock, categoriesMock);

      await svc.restock('p1');
      expect(aiMock.inferProductDuration).not.toHaveBeenCalled();
    });

    it('re-infers when duration is not overridden', async () => {
      const p = makeProduct({ durationOverridden: false });
      const repo = makeRepo(p);
      const svc = new ProductsServiceImpl(repo, aiMock, settingsMock, membersMock, categoriesMock);

      await svc.restock('p1');
      expect(aiMock.inferProductDuration).toHaveBeenCalled();
    });
  });

  describe('list filtering', () => {
    it('filters by status', async () => {
      const p1 = makeProduct({ id: 'p1', estimatedEndDate: addDays(NOW, -1) }); // overdue
      const p2 = makeProduct({ id: 'p2', estimatedEndDate: addDays(NOW, 30) }); // ok
      const repo = makeRepo(p1);
      repo.list = vi.fn().mockResolvedValue([p1, p2]);
      const svc = new ProductsServiceImpl(repo, aiMock, settingsMock, membersMock, categoriesMock);

      const result = await svc.list({ status: 'overdue' });
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('p1');
    });
  });
});
