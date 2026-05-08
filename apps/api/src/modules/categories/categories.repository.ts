import type { Category as DbCategory, PrismaClient } from '@prisma/client';

export interface CategoriesRepository {
  findById(id: string): Promise<DbCategory | null>;
  list(): Promise<DbCategory[]>;
  upsertByName(name: string, icon?: string): Promise<DbCategory>;
  create(name: string, icon: string): Promise<DbCategory>;
  update(id: string, data: { name?: string; icon?: string }): Promise<DbCategory>;
  delete(id: string): Promise<void>;
}

export class PrismaCategoriesRepository implements CategoriesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<DbCategory | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  list(): Promise<DbCategory[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  upsertByName(name: string, icon = 'box'): Promise<DbCategory> {
    return this.prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, icon },
    });
  }

  create(name: string, icon: string): Promise<DbCategory> {
    return this.prisma.category.create({ data: { name, icon } });
  }

  update(id: string, data: { name?: string; icon?: string }): Promise<DbCategory> {
    return this.prisma.category.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    const uncategorized = await this.upsertByName('Uncategorized', 'box');
    if (uncategorized.id !== id) {
      await this.prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: uncategorized.id },
      });
    }
    await this.prisma.category.delete({ where: { id } });
  }
}
