import type { Category as DbCategory, PrismaClient } from '@prisma/client';

export interface CategoriesRepository {
  findById(id: string): Promise<DbCategory | null>;
  list(): Promise<DbCategory[]>;
}

export class PrismaCategoriesRepository implements CategoriesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(id: string): Promise<DbCategory | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  list(): Promise<DbCategory[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }
}
