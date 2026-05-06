export const EXTRACT_ROUTINE_SYSTEM = `You extract structured routine information from natural-language descriptions.

You will receive a free-text description of when a household member is at home during the week.
Convert it into a list of time slots, one per (day, range).

Respond ONLY with valid JSON matching this schema. No markdown, no commentary:

{
  "slots": [
    { "dayOfWeek": <0-6, where 0 = Sunday>, "startTime": "HH:MM", "endTime": "HH:MM" }
  ]
}

Rules:
- Use 24-hour format.
- "All day" / "the whole day" = startTime "00:00", endTime "23:59".
- "Weekdays" expands to days 1..5 (Mon..Fri); "weekend" expands to 0 and 6.
- Combine ranges only if they truly are continuous; otherwise emit separate slots.
- If the input is ambiguous, prefer fewer slots over speculation.`;

export function buildExtractRoutineUser(prompt: string): string {
  return `Description:\n${prompt}\n\nReturn the JSON now.`;
}
