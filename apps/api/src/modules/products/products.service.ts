import type {
  AlertStatus,
  Product,
  ProductSummary,
  ProductFilters,
  ProductUnit,
} from '@homestock/types';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import { addDays, diffInDays, startOfDay } from '../../shared/dates.js';
import type { AIService } from '../ai/ai.service.js';
import type { SettingsService } from '../settings/settings.service.js';
import type { MembersRepository } from '../members/members.repository.js';
import type { CategoriesRepository } from '../categories/categories.repository.js';
import type {
  AlertConfigUpdateDto,
  CreateProductDto,
  DurationOverrideDto,
  UpdateProductDto,
} from './products.schema.js';
import type { DbProductWithRelations, ProductsRepository } from './products.repository.js';

export interface ProductsService {
  list(filters: ProductFilters): Promise<ProductSummary[]>;
  getById(id: string): Promise<Product>;
  create(input: CreateProductDto): Promise<Product>;
  update(id: string, input: UpdateProductDto): Promise<Product>;
  delete(id: string): Promise<void>;
  restock(id: string): Promise<Product>;
  replace(id: string, input: CreateProductDto): Promise<Product>;
  overrideDuration(id: string, input: DurationOverrideDto): Promise<Product>;
  reInferDuration(id: string): Promise<Product>;
  reInferAll(): Promise<{ updated: number; skipped: number }>;
  markFinished(id: string): Promise<Product>;
  updateAlertConfig(id: string, input: AlertConfigUpdateDto): Promise<Product>;
  computeAlertStatus(product: DbProductWithRelations, defaultThreshold: number, now?: Date): AlertStatus;
}

export class ProductsServiceImpl implements ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly ai: AIService,
    private readonly settings: SettingsService,
    private readonly members: MembersRepository,
    private readonly categories: CategoriesRepository,
  ) {}

  async list(filters: ProductFilters): Promise<ProductSummary[]> {
    const products = await this.repo.list({
      categoryId: filters.categoryId,
      search: filters.search,
    });
    const settings = await this.settings.get();
    const now = new Date();

    let summaries = products.map((p): ProductSummary => {
      const status = this.computeAlertStatus(p, settings.defaultAlertThresholdDays, now);
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
    });

    if (filters.status) {
      summaries = summaries.filter((s) => s.alertStatus === filters.status);
    }

    if (filters.sort === 'name') {
      summaries.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filters.sort === 'category') {
      summaries.sort((a, b) => a.categoryId.localeCompare(b.categoryId));
    }
    // Default order is endDate ASC from the repository.

    return summaries;
  }

  async getById(id: string): Promise<Product> {
    const p = await this.repo.findById(id);
    if (!p) throw new NotFoundError('PRODUCT_NOT_FOUND', `No product with id ${id}`);
    const settings = await this.settings.get();
    return this.toApiProduct(p, settings.defaultAlertThresholdDays);
  }

  async create(input: CreateProductDto): Promise<Product> {
    const categoryId = await this.resolveCategory(input.categoryId);
    const inference = await this.resolveInitialDuration({ ...input, categoryId });

    const created = await this.repo.create({
      name: input.name,
      brand: input.brand ?? null,
      categoryId,
      unit: input.unit,
      packageSize: input.packageSize,
      currentQuantity: input.currentQuantity,
      consumerScope: input.consumerScope,
      consumerMemberIds: input.consumerMemberIds,
      estimatedDurationDays: inference.durationDays,
      estimatedEndDate: inference.endDate,
      durationOverridden: inference.overridden,
      confidenceNote: inference.note,
    });

    const settings = await this.settings.get();
    return this.toApiProduct(created, settings.defaultAlertThresholdDays);
  }

  async update(id: string, input: UpdateProductDto): Promise<Product> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('PRODUCT_NOT_FOUND', `No product with id ${id}`);

    const updated = await this.repo.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.brand !== undefined ? { brand: input.brand } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.packageSize !== undefined ? { packageSize: input.packageSize } : {}),
      ...(input.currentQuantity !== undefined ? { currentQuantity: input.currentQuantity } : {}),
      ...(input.consumerScope !== undefined ? { consumerScope: input.consumerScope } : {}),
      ...(input.consumerMemberIds !== undefined ? { consumerMemberIds: input.consumerMemberIds } : {}),
    });

    const settings = await this.settings.get();
    return this.toApiProduct(updated, settings.defaultAlertThresholdDays);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('PRODUCT_NOT_FOUND', `No product with id ${id}`);
    await this.repo.delete(id);
  }

  async restock(id: string): Promise<Product> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('PRODUCT_NOT_FOUND', `No product with id ${id}`);

    const newQuantity = existing.currentQuantity + 1;

    let updateData: Parameters<ProductsRepository['update']>[1] = {
      currentQuantity: newQuantity,
    };

    // Only re-infer duration if the user has not overridden it.
    if (!existing.durationOverridden) {
      const inference = await this.inferDurationFor({ ...existing, currentQuantity: newQuantity });
      updateData = {
        ...updateData,
        estimatedDurationDays: inference.estimatedDurationDays,
        estimatedEndDate: new Date(inference.estimatedEndDate),
        confidenceNote: inference.confidenceNote,
      };
    }

    const updated = await this.repo.update(id, updateData);
    const settings = await this.settings.get();
    return this.toApiProduct(updated, settings.defaultAlertThresholdDays);
  }

  async replace(id: string, input: CreateProductDto): Promise<Product> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('PRODUCT_NOT_FOUND', `No product with id ${id}`);

    const newProduct = await this.create(input);
    await this.repo.update(id, {
      archivedAt: new Date(),
      replacedById: newProduct.id,
    });
    return newProduct;
  }

  async overrideDuration(id: string, input: DurationOverrideDto): Promise<Product> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('PRODUCT_NOT_FOUND', `No product with id ${id}`);

    const now = startOfDay(new Date());
    let days: number;
    let endDate: Date;

    if (input.estimatedDurationDays !== undefined) {
      days = input.estimatedDurationDays;
      endDate = addDays(now, days);
    } else if (input.estimatedEndDate !== undefined) {
      endDate = startOfDay(new Date(input.estimatedEndDate));
      days = diffInDays(now, endDate);
      if (days <= 0) {
        throw new ValidationError('estimatedEndDate must be in the future', 'estimatedEndDate');
      }
    } else {
      throw new ValidationError('Provide estimatedDurationDays or estimatedEndDate');
    }

    const updated = await this.repo.update(id, {
      estimatedDurationDays: days,
      estimatedEndDate: endDate,
      durationOverridden: true,
    });
    const settings = await this.settings.get();
    return this.toApiProduct(updated, settings.defaultAlertThresholdDays);
  }

  async reInferDuration(id: string): Promise<Product> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('PRODUCT_NOT_FOUND', `No product with id ${id}`);

    const inference = await this.inferDurationFor(existing);
    const updated = await this.repo.update(id, {
      estimatedDurationDays: inference.estimatedDurationDays,
      estimatedEndDate: new Date(inference.estimatedEndDate),
      durationOverridden: false,
      confidenceNote: inference.confidenceNote,
    });
    const settings = await this.settings.get();
    return this.toApiProduct(updated, settings.defaultAlertThresholdDays);
  }

  async reInferAll(): Promise<{ updated: number; skipped: number }> {
    const all = await this.repo.list({});
    let updated = 0;
    let skipped = 0;
    for (const product of all) {
      if (product.durationOverridden) { skipped++; continue; }
      try {
        await this.reInferDuration(product.id);
        updated++;
      } catch {
        skipped++;
      }
    }
    return { updated, skipped };
  }

  async markFinished(id: string): Promise<Product> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('PRODUCT_NOT_FOUND', `No product with id ${id}`);
    const yesterday = addDays(startOfDay(new Date()), -1);
    const updated = await this.repo.update(id, {
      currentQuantity: 0,
      estimatedEndDate: yesterday,
      durationOverridden: true,
    });
    const settings = await this.settings.get();
    return this.toApiProduct(updated, settings.defaultAlertThresholdDays);
  }

  async updateAlertConfig(id: string, input: AlertConfigUpdateDto): Promise<Product> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('PRODUCT_NOT_FOUND', `No product with id ${id}`);
    await this.repo.upsertAlertConfig(id, input);
    return this.getById(id);
  }

  computeAlertStatus(
    product: DbProductWithRelations,
    defaultThreshold: number,
    now: Date = new Date(),
  ): AlertStatus {
    const today = startOfDay(now);
    const end = startOfDay(product.estimatedEndDate);
    if (end.getTime() < today.getTime()) return 'overdue';

    const threshold =
      product.alertConfig?.overrideThresholdDays ?? defaultThreshold;
    const cutoff = addDays(today, threshold);
    if (end.getTime() <= cutoff.getTime()) return 'alert';
    return 'ok';
  }

  // ── Internals ────────────────────────────────────────────────

  private async resolveInitialDuration(input: CreateProductDto & { categoryId: string }) {
    if (input.estimatedDurationDays !== undefined) {
      return {
        durationDays: input.estimatedDurationDays,
        endDate: addDays(startOfDay(new Date()), input.estimatedDurationDays),
        overridden: true,
        note: null,
      };
    }
    if (input.estimatedEndDate !== undefined) {
      const endDate = startOfDay(new Date(input.estimatedEndDate));
      const days = diffInDays(new Date(), endDate);
      if (days <= 0) {
        throw new ValidationError('estimatedEndDate must be in the future', 'estimatedEndDate');
      }
      return { durationDays: days, endDate, overridden: true, note: null };
    }

    const inference = await this.inferDurationFor({
      name: input.name,
      brand: input.brand ?? null,
      currentQuantity: input.currentQuantity,
      packageSize: input.packageSize,
      unit: input.unit,
      categoryId: input.categoryId,
      consumerScope: input.consumerScope,
      consumerMemberIds: input.consumerMemberIds,
    });

    return {
      durationDays: inference.estimatedDurationDays,
      endDate: new Date(inference.estimatedEndDate),
      overridden: false,
      note: inference.confidenceNote,
    };
  }

  private async inferDurationFor(input: {
    name: string;
    brand: string | null;
    categoryId: string;
    unit: string;
    packageSize: number;
    currentQuantity: number;
    consumerScope: string;
    consumerMemberIds: string[];
    category?: { name: string };
  }) {
    const categoryName = input.category?.name ?? (await this.resolveCategoryName(input.categoryId));
    const { totalWeeklyPresenceHours, memberCount } = await this.resolveHouseholdContext(input);

    return this.ai.inferProductDuration({
      product: {
        name: input.name,
        brand: input.brand,
        category: categoryName,
        unit: input.unit as ProductUnit,
        packageSize: input.packageSize,
        currentQuantity: input.currentQuantity,
      },
      household: { totalWeeklyPresenceHours, memberCount },
    });
  }

  private async resolveHouseholdContext(input: {
    consumerScope: string;
    consumerMemberIds: string[];
  }): Promise<{ totalWeeklyPresenceHours: number; memberCount: number }> {
    const allMembers = await this.members.list();
    if (allMembers.length === 0) {
      return { totalWeeklyPresenceHours: 0, memberCount: 1 };
    }

    if (input.consumerScope === 'specific' && input.consumerMemberIds.length > 0) {
      const scoped = allMembers.filter((m) => input.consumerMemberIds.includes(m.id));
      const totalHours = scoped.reduce((sum, m) => sum + m.weeklyPresenceHours, 0);
      return {
        totalWeeklyPresenceHours: totalHours,
        memberCount: Math.max(scoped.length, 1),
      };
    }

    const totalHours = allMembers.reduce((sum, m) => sum + m.weeklyPresenceHours, 0);
    return { totalWeeklyPresenceHours: totalHours, memberCount: allMembers.length };
  }

  private async resolveCategory(categoryId: string | undefined): Promise<string> {
    if (categoryId) return categoryId;
    const cat = await this.categories.upsertByName('Uncategorized', 'box');
    return cat.id;
  }

  private async resolveCategoryName(categoryId: string): Promise<string> {
    const cat = await this.categories.findById(categoryId);
    return cat?.name ?? 'Other';
  }

  private toApiProduct(p: DbProductWithRelations, defaultThreshold: number): Product {
    const now = new Date();
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      categoryId: p.categoryId,
      category: { id: p.category.id, name: p.category.name, icon: p.category.icon },
      unit: p.unit as ProductUnit,
      packageSize: p.packageSize,
      currentQuantity: p.currentQuantity,
      consumerScope: p.consumerScope as 'all' | 'specific',
      consumerMemberIds: p.consumerMemberIds,
      estimatedDurationDays: p.estimatedDurationDays,
      estimatedEndDate: p.estimatedEndDate.toISOString(),
      durationOverridden: p.durationOverridden,
      inferenceConfidenceNote: p.confidenceNote,
      alertConfig: p.alertConfig
        ? {
            id: p.alertConfig.id,
            productId: p.alertConfig.productId,
            overrideThresholdDays: p.alertConfig.overrideThresholdDays,
            emailEnabled: p.alertConfig.emailEnabled,
          }
        : {
            id: '',
            productId: p.id,
            overrideThresholdDays: null,
            emailEnabled: true,
          },
      alertStatus: this.computeAlertStatus(p, defaultThreshold, now),
      daysRemaining: diffInDays(now, p.estimatedEndDate),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
