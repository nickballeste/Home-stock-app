import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type {
  DurationInferenceInput,
  DurationInferenceOutput,
  ExtractedProduct,
  ExtractedRoutine,
  ProductUnit,
} from '@homestock/types';
import { AIServiceError } from '../../shared/errors.js';
import { addDays } from '../../shared/dates.js';
import { computeWeeklyPresenceHours } from '../../shared/presence.js';
import { EXTRACT_ROUTINE_SYSTEM, buildExtractRoutineUser } from './prompts/extract-routine.js';
import { INFER_DURATION_SYSTEM, buildInferDurationUser } from './prompts/infer-duration.js';
import { EXTRACT_PRODUCT_SYSTEM } from './prompts/extract-product.js';

const PRODUCT_UNITS: ReadonlyArray<ProductUnit> = ['ml', 'g', 'units', 'sheets', 'doses'];

export interface AIService {
  extractRoutineFromPrompt(prompt: string): Promise<ExtractedRoutine>;
  inferProductDuration(input: DurationInferenceInput): Promise<DurationInferenceOutput>;
  extractProductFromImage(
    imageBase64: string,
    mimeType: 'image/jpeg' | 'image/png',
  ): Promise<ExtractedProduct>;
}

const RoutineSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/),
  endTime: z.string().regex(/^\d{1,2}:\d{2}$/),
});

const ExtractRoutineSchema = z.object({
  slots: z.array(RoutineSlotSchema),
});

const InferDurationSchema = z.object({
  durationDays: z.number().int().positive(),
  reasoning: z.string().min(1),
});

const ExtractProductSchema = z.object({
  name: z.string().nullable(),
  brand: z.string().nullable(),
  suggestedCategory: z.string().nullable(),
  unit: z.enum(['ml', 'g', 'units', 'sheets', 'doses']).nullable(),
  packageSize: z.number().positive().nullable(),
});

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

export class AnthropicAIService implements AIService {
  private readonly client: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      throw new AIServiceError('ANTHROPIC_API_KEY is not configured');
    }
    this.client = new Anthropic({ apiKey });
  }

  async extractRoutineFromPrompt(prompt: string): Promise<ExtractedRoutine> {
    const text = await this.completeText({
      system: EXTRACT_ROUTINE_SYSTEM,
      user: buildExtractRoutineUser(prompt),
    });
    const json = parseJson(text);
    const parsed = ExtractRoutineSchema.safeParse(json);
    if (!parsed.success) {
      throw new AIServiceError('Failed to parse routine extraction response');
    }
    const slots = parsed.data.slots.map((s) => ({
      dayOfWeek: s.dayOfWeek as ExtractedRoutine['slots'][number]['dayOfWeek'],
      startTime: s.startTime,
      endTime: s.endTime,
    }));
    return {
      slots,
      weeklyPresenceHours: computeWeeklyPresenceHours(slots),
    };
  }

  async inferProductDuration(input: DurationInferenceInput): Promise<DurationInferenceOutput> {
    const text = await this.completeText({
      system: INFER_DURATION_SYSTEM,
      user: buildInferDurationUser(input),
    });
    const json = parseJson(text);
    const parsed = InferDurationSchema.safeParse(json);
    if (!parsed.success) {
      throw new AIServiceError('Failed to parse duration inference response');
    }
    const days = parsed.data.durationDays;
    return {
      estimatedDurationDays: days,
      estimatedEndDate: addDays(new Date(), days).toISOString(),
      confidenceNote: parsed.data.reasoning,
    };
  }

  async extractProductFromImage(
    imageBase64: string,
    mimeType: 'image/jpeg' | 'image/png',
  ): Promise<ExtractedProduct> {
    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: EXTRACT_PRODUCT_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: imageBase64 },
            },
            { type: 'text', text: 'Extract the product metadata from this image.' },
          ],
        },
      ],
    });
    const text = textOf(message);
    const json = parseJson(text);
    const parsed = ExtractProductSchema.safeParse(json);
    if (!parsed.success) {
      throw new AIServiceError('Failed to parse product extraction response');
    }
    const unit = parsed.data.unit && PRODUCT_UNITS.includes(parsed.data.unit) ? parsed.data.unit : null;
    return {
      name: parsed.data.name,
      brand: parsed.data.brand,
      suggestedCategory: parsed.data.suggestedCategory,
      unit,
      packageSize: parsed.data.packageSize,
    };
  }

  private async completeText(args: { system: string; user: string }): Promise<string> {
    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: args.system,
      messages: [{ role: 'user', content: args.user }],
    });
    return textOf(message);
  }
}

function textOf(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new AIServiceError('Empty response from AI');
  }
  return block.text;
}

function parseJson(text: string): unknown {
  // Tolerate stray code fences even though prompts forbid them.
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new AIServiceError('AI response was not valid JSON');
  }
}
