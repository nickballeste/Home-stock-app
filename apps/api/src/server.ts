import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from the api package, then fall back to the monorepo root.
const here = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(here, '../.env') });
config({ path: resolve(here, '../../../.env') });

import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(port, () => {
  console.log(`HomeStock API listening on http://localhost:${port}`);
});
