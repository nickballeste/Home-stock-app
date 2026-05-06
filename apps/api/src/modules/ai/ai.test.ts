import { describe, it, expect, vi } from 'vitest';
import { AnthropicAIService } from './ai.service.js';
import { AIServiceError } from '../../shared/errors.js';

function makeServiceWithResponse(text: string) {
  const svc = new AnthropicAIService('sk-test');
  // @ts-expect-error — overriding private client for test
  svc.client = {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text }],
      }),
    },
  };
  return svc;
}

describe('AnthropicAIService', () => {
  describe('extractRoutineFromPrompt', () => {
    it('parses and computes weeklyPresenceHours', async () => {
      const svc = makeServiceWithResponse(
        JSON.stringify({
          slots: [
            { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
            { dayOfWeek: 0, startTime: '00:00', endTime: '23:59' },
          ],
        }),
      );
      const result = await svc.extractRoutineFromPrompt('whatever');
      expect(result.slots).toHaveLength(2);
      expect(result.weeklyPresenceHours).toBe(25); // 1 + 24
    });

    it('tolerates code fences in the response', async () => {
      const svc = makeServiceWithResponse(
        '```json\n{"slots":[{"dayOfWeek":1,"startTime":"09:00","endTime":"10:00"}]}\n```',
      );
      const result = await svc.extractRoutineFromPrompt('whatever');
      expect(result.weeklyPresenceHours).toBe(1);
    });

    it('throws AIServiceError on malformed JSON', async () => {
      const svc = makeServiceWithResponse('not json');
      await expect(svc.extractRoutineFromPrompt('x')).rejects.toBeInstanceOf(AIServiceError);
    });

    it('throws AIServiceError on schema mismatch', async () => {
      const svc = makeServiceWithResponse(JSON.stringify({ wrong: 'shape' }));
      await expect(svc.extractRoutineFromPrompt('x')).rejects.toBeInstanceOf(AIServiceError);
    });
  });

  describe('inferProductDuration', () => {
    it('returns durationDays and computes endDate', async () => {
      const svc = makeServiceWithResponse(
        JSON.stringify({ durationDays: 23, reasoning: 'about three weeks' }),
      );
      const result = await svc.inferProductDuration({
        product: {
          name: 'Shampoo',
          category: 'Hygiene',
          unit: 'ml',
          packageSize: 400,
          currentQuantity: 1,
        },
        household: { totalWeeklyPresenceHours: 78, memberCount: 2 },
      });
      expect(result.estimatedDurationDays).toBe(23);
      expect(result.confidenceNote).toBe('about three weeks');
      expect(new Date(result.estimatedEndDate).getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects non-positive durations', async () => {
      const svc = makeServiceWithResponse(
        JSON.stringify({ durationDays: 0, reasoning: 'x' }),
      );
      await expect(
        svc.inferProductDuration({
          product: { name: 'x', category: 'y', unit: 'ml', packageSize: 1, currentQuantity: 1 },
          household: { totalWeeklyPresenceHours: 1, memberCount: 1 },
        }),
      ).rejects.toBeInstanceOf(AIServiceError);
    });
  });

  describe('extractProductFromImage', () => {
    it('parses well-formed metadata', async () => {
      const svc = makeServiceWithResponse(
        JSON.stringify({
          name: 'Shampoo Hidratante',
          brand: 'Elseve',
          suggestedCategory: 'Hygiene',
          unit: 'ml',
          packageSize: 400,
        }),
      );
      const result = await svc.extractProductFromImage('aGVsbG8=', 'image/jpeg');
      expect(result.name).toBe('Shampoo Hidratante');
      expect(result.unit).toBe('ml');
      expect(result.packageSize).toBe(400);
    });

    it('drops invalid units silently', async () => {
      const svc = makeServiceWithResponse(
        JSON.stringify({
          name: 'X',
          brand: null,
          suggestedCategory: null,
          unit: 'liters',
          packageSize: null,
        }),
      );
      // schema rejects invalid unit values
      await expect(svc.extractProductFromImage('x', 'image/jpeg')).rejects.toBeInstanceOf(
        AIServiceError,
      );
    });
  });
});
