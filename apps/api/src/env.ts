/**
 * Loads .env files. MUST be the first import of any entry point (server.ts,
 * seed scripts) — ES module imports are hoisted and execute in declaration
 * order, so importing this module first guarantees env vars are set before
 * any other module's top-level code runs.
 *
 * Looks in the api package dir first, then the monorepo root.
 * On Vercel, env vars come from the platform and both files are absent — no-op.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(here, '../.env') });
config({ path: resolve(here, '../../../.env') });
