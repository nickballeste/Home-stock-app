import type { PrismaClient } from '@prisma/client';
import type { AlertStatus, ProductSummary, AlertSummary, ProductUnit } from '@homestock/types';
import { diffInDays, startOfDay } from '../../shared/dates.js';
import type { ProductsService } from '../products/products.service.js';
import type { ProductsRepository, DbProductWithRelations } from '../products/products.repository.js';
import type { SettingsService } from '../settings/settings.service.js';
import type { EmailClient } from './email.client.js';

export interface AlertsService {
  listActive(): Promise<ProductSummary[]>;
  summary(): Promise<AlertSummary>;
  runDigest(now?: Date): Promise<{ sent: number; recipients: string }>;
}

export class AlertsServiceImpl implements AlertsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly productsRepo: ProductsRepository,
    private readonly products: ProductsService,
    private readonly settings: SettingsService,
    private readonly email: EmailClient,
  ) {}

  async listActive(): Promise<ProductSummary[]> {
    const settings = await this.settings.get();
    const all = await this.productsRepo.list({});
    const now = new Date();
    return all
      .map((p) => ({
        product: p,
        status: this.products.computeAlertStatus(p, settings.defaultAlertThresholdDays, now),
      }))
      .filter(({ status }) => status === 'alert' || status === 'overdue')
      .map(({ product, status }) => productToSummary(product, status, now));
  }

  async summary(): Promise<AlertSummary> {
    const settings = await this.settings.get();
    const all = await this.productsRepo.list({});
    const now = new Date();
    let totalAlerts = 0;
    let totalOverdue = 0;
    let totalOk = 0;
    for (const p of all) {
      const s = this.products.computeAlertStatus(p, settings.defaultAlertThresholdDays, now);
      if (s === 'alert') totalAlerts += 1;
      else if (s === 'overdue') totalOverdue += 1;
      else totalOk += 1;
    }
    return { totalAlerts, totalOverdue, totalOk };
  }

  /**
   * Runs the daily digest:
   * 1. Find all products in alert/overdue state.
   * 2. Filter to those that haven't been notified today (per AlertDelivery).
   * 3. Send a single email with the digest, log deliveries.
   */
  async runDigest(now: Date = new Date()): Promise<{ sent: number; recipients: string }> {
    const settings = await this.settings.get();
    const today = startOfDay(now);

    // Evaluate every product through computeAlertStatus so per-product
    // threshold overrides are honored, not just the system default.
    const all = await this.productsRepo.list({});
    const candidates = all.filter((p) => {
      const status = this.products.computeAlertStatus(
        p,
        settings.defaultAlertThresholdDays,
        now,
      );
      return status === 'alert' || status === 'overdue';
    });

    if (candidates.length === 0) {
      return { sent: 0, recipients: settings.digestEmailAddress };
    }

    // Skip products notified earlier today
    const recentDeliveries = await this.prisma.alertDelivery.findMany({
      where: {
        productId: { in: candidates.map((p) => p.id) },
        sentAt: { gte: today },
        success: true,
      },
      select: { productId: true },
    });
    const notifiedToday = new Set(recentDeliveries.map((d) => d.productId));

    const toNotify = candidates.filter(
      (p) => !notifiedToday.has(p.id) && (p.alertConfig?.emailEnabled ?? true),
    );

    if (toNotify.length === 0 || !settings.digestEmailAddress) {
      return { sent: 0, recipients: settings.digestEmailAddress };
    }

    const html = renderDigestHtml(
      toNotify.map((p) =>
        productToSummary(
          p,
          this.products.computeAlertStatus(p, settings.defaultAlertThresholdDays, now),
          now,
        ),
      ),
    );

    const result = await this.email.send({
      to: settings.digestEmailAddress,
      subject: `HomeStock — ${toNotify.length} item(s) need restocking`,
      html,
    });

    await this.prisma.alertDelivery.createMany({
      data: toNotify.map((p) => ({
        productId: p.id,
        channel: 'email',
        success: Boolean(result.id),
      })),
    });

    return { sent: toNotify.length, recipients: settings.digestEmailAddress };
  }
}

function productToSummary(
  p: DbProductWithRelations,
  status: AlertStatus,
  now: Date,
): ProductSummary {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    categoryId: p.categoryId,
    unit: p.unit as ProductUnit,
    currentQuantity: p.currentQuantity,
    estimatedEndDate: p.estimatedEndDate.toISOString(),
    daysRemaining: diffInDays(now, p.estimatedEndDate),
    alertStatus: status,
  };
}

function renderDigestHtml(products: ProductSummary[]): string {
  const rows = products
    .map(
      (p) => `
      <tr>
        <td style="padding:8px 12px;">${escapeHtml(p.name)}${p.brand ? ` <span style="color:#666">(${escapeHtml(p.brand)})</span>` : ''}</td>
        <td style="padding:8px 12px;">${p.daysRemaining < 0 ? `Overdue by ${-p.daysRemaining}d` : `${p.daysRemaining}d left`}</td>
      </tr>`,
    )
    .join('');
  return `<!doctype html><html><body style="font-family: -apple-system, sans-serif;">
    <h2>Items running out</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 480px;">
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#888;font-size:12px;margin-top:24px;">— HomeStock</p>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
