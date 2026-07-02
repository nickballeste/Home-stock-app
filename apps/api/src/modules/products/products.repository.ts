import type {
  Prisma,
  PrismaClient,
  Product as DbProduct,
  AlertConfig as DbAlertConfig,
  Category as DbCategory,
} from '@prisma/client';

export type DbProductWithRelations = DbProduct & {
  category: DbCategory;
  alertConfig: DbAlertConfig | null;
};

export interface ListFilters {
  categoryId?: string;
  search?: string;
}

export interface ProductsRepository {
  list(filters: ListFilters): Promise<DbProductWithRelations[]>;
  findById(id: string): Promise<DbProductWithRelations | null>;
  create(input: {
    name: string;
    brand: string | null;
    categoryId: string;
    unit: string;
    packageSize: number;
    currentQuantity: number;
    consumerScope: string;
    consumerMemberIds: string[];
    estimatedDurationDays: number;
    estimatedEndDate: Date;
    durationOverridden: boolean;
    confidenceNote: string | null;
  }): Promise<DbProductWithRelations>;
  update(
    id: string,
    data: Prisma.ProductUpdateInput,
  ): Promise<DbProductWithRelations>;
  delete(id: string): Promise<void>;
  upsertAlertConfig(
    productId: string,
    data: { overrideThresholdDays?: number | null; emailEnabled?: boolean },
  ): Promise<DbAlertConfig>;
}

export class PrismaProductsRepository implements ProductsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(filters: ListFilters): Promise<DbProductWithRelations[]> {
    return this.prisma.product.findMany({
      where: {
        archivedAt: null,
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { brand: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { category: true, alertConfig: true },
      orderBy: { estimatedEndDate: 'asc' },
    });
  }

  findById(id: string): Promise<DbProductWithRelations | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: { category: true, alertConfig: true },
    });
  }

  async create(input: {
    name: string;
    brand: string | null;
    categoryId: string;
    unit: string;
    packageSize: number;
    currentQuantity: number;
    consumerScope: string;
    consumerMemberIds: string[];
    estimatedDurationDays: number;
    estimatedEndDate: Date;
    durationOverridden: boolean;
    confidenceNote: string | null;
  }): Promise<DbProductWithRelations> {
    return this.prisma.product.create({
      data: {
        ...input,
        alertConfig: { create: { emailEnabled: true } },
      },
      include: { category: true, alertConfig: true },
    });
  }

  update(id: string, data: Prisma.ProductUpdateInput): Promise<DbProductWithRelations> {
    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: true, alertConfig: true },
    });
  }

  async delete(id: string): Promise<void> {
    // AlertDelivery's FK is ON DELETE RESTRICT — remove delivery log rows
    // first or deleting any product that ever appeared in a digest fails.
    await this.prisma.$transaction([
      this.prisma.alertDelivery.deleteMany({ where: { productId: id } }),
      this.prisma.product.delete({ where: { id } }),
    ]);
  }

  async upsertAlertConfig(
    productId: string,
    data: { overrideThresholdDays?: number | null; emailEnabled?: boolean },
  ): Promise<DbAlertConfig> {
    return this.prisma.alertConfig.upsert({
      where: { productId },
      create: {
        productId,
        overrideThresholdDays: data.overrideThresholdDays ?? null,
        emailEnabled: data.emailEnabled ?? true,
      },
      update: {
        ...(data.overrideThresholdDays !== undefined
          ? { overrideThresholdDays: data.overrideThresholdDays }
          : {}),
        ...(data.emailEnabled !== undefined ? { emailEnabled: data.emailEnabled } : {}),
      },
    });
  }

}
