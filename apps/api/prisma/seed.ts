import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

// Load .env from the api package, then fall back to the monorepo root.
const here = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(here, '../.env') });
config({ path: resolve(here, '../../../.env') });

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'Hygiene', icon: 'droplet' },
  { name: 'Cleaning', icon: 'spray' },
  { name: 'Food', icon: 'utensils' },
  { name: 'Beverages', icon: 'coffee' },
  { name: 'Paper Goods', icon: 'scroll' },
  { name: 'Health', icon: 'heart' },
  { name: 'Pet', icon: 'paw' },
  { name: 'Other', icon: 'box' },
];

async function main() {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', digestEmailAddress: '' },
  });

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
