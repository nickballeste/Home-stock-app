import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MembersServiceImpl } from './members.service.js';
import type { MembersRepository } from './members.repository.js';
import { NotFoundError } from '../../shared/errors.js';

function makeRepo(overrides: Partial<MembersRepository> = {}): MembersRepository {
  return {
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listRoutineSlots: vi.fn().mockResolvedValue([]),
    replaceRoutine: vi.fn().mockResolvedValue([]),
    countMembersConsuming: vi.fn().mockResolvedValue(0),
    removeMemberFromAllProducts: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const baseDb = {
  id: 'm1',
  name: 'Maria',
  avatarUrl: null,
  weeklyPresenceHours: 0,
  createdAt: new Date('2026-05-01T00:00:00Z'),
  updatedAt: new Date('2026-05-01T00:00:00Z'),
};

describe('MembersService', () => {
  let svc: MembersServiceImpl;
  let repo: MembersRepository;

  beforeEach(() => {
    repo = makeRepo();
    svc = new MembersServiceImpl(repo);
  });

  describe('getById', () => {
    it('throws NotFoundError when member missing', async () => {
      await expect(svc.getById('missing')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('returns API-shaped member', async () => {
      repo = makeRepo({ findById: vi.fn().mockResolvedValue(baseDb) });
      svc = new MembersServiceImpl(repo);
      const member = await svc.getById('m1');
      expect(member.name).toBe('Maria');
      expect(member.createdAt).toBe('2026-05-01T00:00:00.000Z');
    });
  });

  describe('replaceRoutine', () => {
    it('computes weeklyPresenceHours from slots and persists', async () => {
      const replaceRoutine = vi.fn().mockResolvedValue([
        { id: 's1', memberId: 'm1', dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
      ]);
      repo = makeRepo({
        findById: vi.fn().mockResolvedValue(baseDb),
        replaceRoutine,
      });
      svc = new MembersServiceImpl(repo);

      const result = await svc.replaceRoutine('m1', {
        slots: [{ dayOfWeek: 1, startTime: '08:00', endTime: '09:00' }],
      });

      expect(result.weeklyPresenceHours).toBe(1);
      expect(replaceRoutine).toHaveBeenCalledWith(
        'm1',
        expect.any(Array),
        1,
      );
    });

    it('throws NotFoundError when member missing', async () => {
      await expect(svc.replaceRoutine('x', { slots: [] })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('delete', () => {
    it('reassigns consumer scope on referenced products before deleting', async () => {
      const removeFn = vi.fn().mockResolvedValue(undefined);
      const deleteFn = vi.fn().mockResolvedValue(undefined);
      repo = makeRepo({
        findById: vi.fn().mockResolvedValue(baseDb),
        removeMemberFromAllProducts: removeFn,
        delete: deleteFn,
      });
      svc = new MembersServiceImpl(repo);

      await svc.delete('m1');
      expect(removeFn).toHaveBeenCalledWith('m1');
      expect(deleteFn).toHaveBeenCalledWith('m1');
      expect(removeFn.mock.invocationCallOrder[0]).toBeLessThan(
        deleteFn.mock.invocationCallOrder[0]!,
      );
    });
  });
});
