/**
 * Vercel serverless entry point. Bridges Vercel's Node request/response
 * to the Express app exported from apps/api.
 */
import { createApp } from '../apps/api/src/app.js';

const app = createApp();

export default function handler(req: unknown, res: unknown) {
  // Express's app function is (req, res) compatible with Vercel's signature.
  return (app as unknown as (req: unknown, res: unknown) => void)(req, res);
}
