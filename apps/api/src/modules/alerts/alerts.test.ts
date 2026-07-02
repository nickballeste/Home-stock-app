import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertsServiceImpl } from './alerts.service.js';
import type { ProductsRepository, DbProductWithRelations } from '../products/products.repository.js';
import type { ProductsService } from '../products/products.service.js';
import type { SettingsService } from '../settings/settings.service.js';
import type { EmailClient } from './email.client.js';
import { addDays, startOfDay } from '../../shared/dates.js';

const NOW = new Date('2026-05-06T10:00:00Z');

function makeProduct(overrides: Partial<DbProductWithRelations> = {}): DbProductWithRelations {
  return {
    id: 'p1',
    name: 'Shampoo',
    brand: null,
    categoryId: 'c1',
    systemProductId: null,
    unit: 'ml',
    packageSize: 400,
    currentQuantity: 1,
    consumerScope: 'all',
    consumerMemberIds: [],
    estimatedDurationDays: 1,
    estimatedEndDate: addDays(NOW, 1),
    durationOverridden: false,
    confidenceNote: null,
    archivedAt: null,
    replacedById: null,
    createdAt: NOW,
    updatedAt: NOW,
    category: { id: 'c1', name: 'Hygiene', icon: 'droplet' },
    alertConfig: { id: 'a1', productId: 'p1', overrideThresholdDays: null, emailEnabled: true },
    ...overrides,
  };
}

function makeSetup(products: DbProductWithRelations[], opts: { recentDeliveries?: string[] } = {}) {
  const repo: ProductsRepository = {
    list: vi.fn().mockResolvedValue(products),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsertAlertConfig: vi.fn(),
  };

  const productsService: ProductsService = {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    restock: vi.fn(),
    replace: vi.fn(),
    overrideDuration: vi.fn(),
    reInferDuration: vi.fn(),
    reInferAll: vi.fn(),
    markFinished: vi.fn(),
    updateAlertConfig: vi.fn(),
    // Mirrors the real implementation, including per-product overrides.
    computeAlertStatus: (p, defaultThreshold, now = NOW) => {
      const today = startOfDay(now);
      const end = startOfDay(p.estimatedEndDate);
      if (end.getTime() < today.getTime()) return 'overdue';
      const threshold = p.alertConfig?.overrideThresholdDays ?? defaultThreshold;
      if (end.getTime() <= addDays(today, threshold).getTime()) return 'alert';
      return 'ok';
    },
  };

  const settings: SettingsService = {
    get: vi.fn().mockResolvedValue({
      id: 'singleton',
      defaultAlertThresholdDays: 3,
      digestEmailTime: '08:00',
      digestEmailAddress: 'home@example.com',
      timezone: 'America/Sao_Paulo',
    }),
    update: vi.fn(),
  };

  const email: EmailClient = {
    send: vi.fn().mockResolvedValue({ id: 'msg1' }),
  };

  const prisma = {
    alertDelivery: {
      findMany: vi.fn().mockResolvedValue(
        (opts.recentDeliveries ?? []).map((id) => ({ productId: id })),
      ),
      createMany: vi.fn().mockResolvedValue({ count: products.length }),
    },
  } as never;

  const svc = new AlertsServiceImpl(prisma, repo, productsService, settings, email);
  return { svc, repo, email, prisma };
}

describe('AlertsService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  describe('summary', () => {
    it('counts products by status correctly', async () => {
      const { svc } = makeSetup([
        makeProduct({ id: 'a', estimatedEndDate: addDays(NOW, -1) }), // overdue
        makeProduct({ id: 'b', estimatedEndDate: addDays(NOW, 1) }),  // alert
        makeProduct({ id: 'c', estimatedEndDate: addDays(NOW, 30) }), // ok
      ]);
      const result = await svc.summary();
      expect(result).toEqual({ totalAlerts: 1, totalOverdue: 1, totalOk: 1 });
    });
  });

  describe('listActive', () => {
    it('returns only alert + overdue products', async () => {
      const { svc } = makeSetup([
        makeProduct({ id: 'a', estimatedEndDate: addDays(NOW, -1) }),
        makeProduct({ id: 'b', estimatedEndDate: addDays(NOW, 30) }),
      ]);
      const result = await svc.listActive();
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('a');
    });
  });

  describe('runDigest', () => {
    it('does nothing when no products are in alert', async () => {
      const { svc, email } = makeSetup([
        makeProduct({ id: 'a', estimatedEndDate: addDays(NOW, 30) }), // ok
      ]);
      const result = await svc.runDigest();
      expect(result.sent).toBe(0);
      expect(email.send).not.toHaveBeenCalled();
    });

    it('skips products already notified today', async () => {
      const products = [
        makeProduct({ id: 'a', estimatedEndDate: addDays(NOW, 1) }),
        makeProduct({ id: 'b', estimatedEndDate: addDays(NOW, 1) }),
      ];
      const { svc, email, prisma } = makeSetup(products, { recentDeliveries: ['a'] });
      const result = await svc.runDigest();
      expect(result.sent).toBe(1);
      expect(email.send).toHaveBeenCalledTimes(1);
      const created = (prisma as { alertDelivery: { createMany: ReturnType<typeof vi.fn> } })
        .alertDelivery.createMany.mock.calls[0]![0].data as Array<{ productId: string }>;
      expect(created.map((c) => c.productId)).toEqual(['b']);
    });

    it('respects per-product emailEnabled = false', async () => {
      const products = [
        makeProduct({
          id: 'a',
          estimatedEndDate: addDays(NOW, 1),
          alertConfig: { id: 'a', productId: 'a', overrideThresholdDays: null, emailEnabled: false },
        }),
      ];
      const { svc, email } = makeSetup(products);
      const result = await svc.runDigest();
      expect(result.sent).toBe(0);
      expect(email.send).not.toHaveBeenCalled();
    });

    it('includes products in alert only via their per-product threshold override', async () => {
      // Ends in 5 days: outside the default 3-day threshold, but inside
      // this product's 7-day override — the digest must include it.
      const products = [
        makeProduct({
          id: 'a',
          estimatedEndDate: addDays(NOW, 5),
          alertConfig: { id: 'a', productId: 'a', overrideThresholdDays: 7, emailEnabled: true },
        }),
        makeProduct({ id: 'b', estimatedEndDate: addDays(NOW, 5) }), // default threshold → ok
      ];
      const { svc, email, prisma } = makeSetup(products);
      const result = await svc.runDigest();
      expect(result.sent).toBe(1);
      expect(email.send).toHaveBeenCalledTimes(1);
      const created = (prisma as { alertDelivery: { createMany: ReturnType<typeof vi.fn> } })
        .alertDelivery.createMany.mock.calls[0]![0].data as Array<{ productId: string }>;
      expect(created.map((c) => c.productId)).toEqual(['a']);
    });
  });
});
