import type { DurationInferenceInput } from '@homestock/types';

export const INFER_DURATION_SYSTEM = `You are a household consumption analyst.

Given a product and the household's weekly presence pattern, estimate how many days the
current stock will last.

Reason about typical per-use amounts for the product category, the number of consuming
members, and how much time they are at home each week (more time = more consumption,
roughly proportional, but bounded — people don't shower 24h/day).

Respond ONLY with valid JSON matching this schema (no markdown, no commentary):

{
  "durationDays": <positive integer>,
  "reasoning": "<one short sentence explaining the estimate>"
}`;

export function buildInferDurationUser(input: DurationInferenceInput): string {
  const { product, household } = input;
  return [
    `Product: ${product.name}${product.brand ? ` (${product.brand})` : ''}`,
    `Category: ${product.category}`,
    `Unit: ${product.unit}`,
    `Package size: ${product.packageSize} ${product.unit}`,
    `Current stock: ${product.currentQuantity} package(s)`,
    `Consuming members: ${household.memberCount}`,
    `Combined weekly presence: ${household.totalWeeklyPresenceHours} hours/week`,
    '',
    'Estimate how long this will last in days.',
  ].join('\n');
}
