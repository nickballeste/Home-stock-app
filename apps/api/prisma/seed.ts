import { PrismaClient } from '@prisma/client';

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
