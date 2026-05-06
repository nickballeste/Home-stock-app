import type { Member, RoutineSlot } from '@homestock/types';
import { NotFoundError } from '../../shared/errors.js';
import { computeWeeklyPresenceHours } from '../../shared/presence.js';
import type { MembersRepository } from './members.repository.js';
import type { CreateMemberDto, ReplaceRoutineDto, UpdateMemberDto } from './members.schema.js';

export interface MembersService {
  list(): Promise<Member[]>;
  getById(id: string): Promise<Member>;
  create(input: CreateMemberDto): Promise<Member>;
  update(id: string, input: UpdateMemberDto): Promise<Member>;
  delete(id: string): Promise<void>;
  getRoutine(memberId: string): Promise<{ slots: RoutineSlot[]; weeklyPresenceHours: number }>;
  replaceRoutine(
    memberId: string,
    input: ReplaceRoutineDto,
  ): Promise<{ slots: RoutineSlot[]; weeklyPresenceHours: number }>;
}

export class MembersServiceImpl implements MembersService {
  constructor(private readonly repo: MembersRepository) {}

  async list(): Promise<Member[]> {
    const members = await this.repo.list();
    return members.map(toApiMember);
  }

  async getById(id: string): Promise<Member> {
    const m = await this.repo.findById(id);
    if (!m) throw new NotFoundError('MEMBER_NOT_FOUND', `No member with id ${id}`);
    return toApiMember(m);
  }

  async create(input: CreateMemberDto): Promise<Member> {
    const created = await this.repo.create({
      name: input.name,
      avatarUrl: input.avatarUrl ?? null,
    });
    return toApiMember(created);
  }

  async update(id: string, input: UpdateMemberDto): Promise<Member> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('MEMBER_NOT_FOUND', `No member with id ${id}`);
    const updated = await this.repo.update(id, input);
    return toApiMember(updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('MEMBER_NOT_FOUND', `No member with id ${id}`);
    await this.repo.removeMemberFromAllProducts(id);
    await this.repo.delete(id);
  }

  async getRoutine(memberId: string) {
    const member = await this.repo.findById(memberId);
    if (!member) throw new NotFoundError('MEMBER_NOT_FOUND', `No member with id ${memberId}`);
    const slots = await this.repo.listRoutineSlots(memberId);
    return {
      slots: slots.map(toApiSlot),
      weeklyPresenceHours: member.weeklyPresenceHours,
    };
  }

  async replaceRoutine(memberId: string, input: ReplaceRoutineDto) {
    const member = await this.repo.findById(memberId);
    if (!member) throw new NotFoundError('MEMBER_NOT_FOUND', `No member with id ${memberId}`);
    const weekly = computeWeeklyPresenceHours(input.slots);
    const slots = await this.repo.replaceRoutine(memberId, input.slots, weekly);
    return {
      slots: slots.map(toApiSlot),
      weeklyPresenceHours: weekly,
    };
  }
}

function toApiMember(m: {
  id: string;
  name: string;
  avatarUrl: string | null;
  weeklyPresenceHours: number;
  createdAt: Date;
  updatedAt: Date;
}): Member {
  return {
    id: m.id,
    name: m.name,
    avatarUrl: m.avatarUrl,
    weeklyPresenceHours: m.weeklyPresenceHours,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

function toApiSlot(s: {
  id: string;
  memberId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): RoutineSlot {
  return {
    id: s.id,
    memberId: s.memberId,
    dayOfWeek: s.dayOfWeek as RoutineSlot['dayOfWeek'],
    startTime: s.startTime,
    endTime: s.endTime,
  };
}
