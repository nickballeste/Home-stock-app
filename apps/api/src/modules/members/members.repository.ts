import type { PrismaClient, Member as DbMember, RoutineSlot as DbRoutineSlot } from '@prisma/client';
import type { ReplaceRoutineDto } from './members.schema.js';

export interface MembersRepository {
  list(): Promise<DbMember[]>;
  findById(id: string): Promise<DbMember | null>;
  create(data: { name: string; avatarUrl?: string | null }): Promise<DbMember>;
  update(id: string, data: { name?: string; avatarUrl?: string | null }): Promise<DbMember>;
  delete(id: string): Promise<void>;
  listRoutineSlots(memberId: string): Promise<DbRoutineSlot[]>;
  replaceRoutine(memberId: string, slots: ReplaceRoutineDto['slots'], weeklyHours: number): Promise<DbRoutineSlot[]>;
  countMembersConsuming(memberId: string): Promise<number>;
  removeMemberFromAllProducts(memberId: string): Promise<void>;
}

export class PrismaMembersRepository implements MembersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(): Promise<DbMember[]> {
    return this.prisma.member.findMany({ orderBy: { createdAt: 'asc' } });
  }

  findById(id: string): Promise<DbMember | null> {
    return this.prisma.member.findUnique({ where: { id } });
  }

  create(data: { name: string; avatarUrl?: string | null }): Promise<DbMember> {
    return this.prisma.member.create({
      data: {
        name: data.name,
        avatarUrl: data.avatarUrl ?? null,
      },
    });
  }

  update(id: string, data: { name?: string; avatarUrl?: string | null }): Promise<DbMember> {
    return this.prisma.member.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.member.delete({ where: { id } });
  }

  listRoutineSlots(memberId: string): Promise<DbRoutineSlot[]> {
    return this.prisma.routineSlot.findMany({
      where: { memberId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async replaceRoutine(
    memberId: string,
    slots: ReplaceRoutineDto['slots'],
    weeklyHours: number,
  ): Promise<DbRoutineSlot[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.routineSlot.deleteMany({ where: { memberId } });
      if (slots.length > 0) {
        await tx.routineSlot.createMany({
          data: slots.map((s) => ({
            memberId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        });
      }
      await tx.member.update({
        where: { id: memberId },
        data: { weeklyPresenceHours: weeklyHours },
      });
      return tx.routineSlot.findMany({
        where: { memberId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });
  }

  async countMembersConsuming(memberId: string): Promise<number> {
    return this.prisma.product.count({
      where: { consumerMemberIds: { has: memberId } },
    });
  }

  async removeMemberFromAllProducts(memberId: string): Promise<void> {
    const products = await this.prisma.product.findMany({
      where: { consumerMemberIds: { has: memberId } },
      select: { id: true, consumerMemberIds: true, consumerScope: true },
    });
    for (const p of products) {
      const remaining = p.consumerMemberIds.filter((id) => id !== memberId);
      const nextScope = remaining.length === 0 ? 'all' : p.consumerScope;
      await this.prisma.product.update({
        where: { id: p.id },
        data: {
          consumerMemberIds: remaining,
          consumerScope: nextScope,
        },
      });
    }
  }
}
