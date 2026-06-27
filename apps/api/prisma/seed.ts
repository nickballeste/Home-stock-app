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

const SYSTEM_PRODUCTS = [
  // ── Hygiene ──────────────────────────────────────────────────────
  { name: 'Shampoo', categoryName: 'Hygiene', unit: 'ml', commonPackageSize: 400, defaultDurationDays: 30, tags: ['hair', 'shower'] },
  { name: 'Conditioner', categoryName: 'Hygiene', unit: 'ml', commonPackageSize: 400, defaultDurationDays: 45, tags: ['hair', 'shower'] },
  { name: 'Body Wash', categoryName: 'Hygiene', unit: 'ml', commonPackageSize: 250, defaultDurationDays: 20, tags: ['shower', 'soap'] },
  { name: 'Toothpaste', categoryName: 'Hygiene', unit: 'g', commonPackageSize: 90, defaultDurationDays: 60, tags: ['oral', 'teeth', 'dental'] },
  { name: 'Mouthwash', categoryName: 'Hygiene', unit: 'ml', commonPackageSize: 500, defaultDurationDays: 45, tags: ['oral', 'teeth', 'dental'] },
  { name: 'Deodorant', categoryName: 'Hygiene', unit: 'g', commonPackageSize: 150, defaultDurationDays: 60, tags: ['personal', 'antiperspirant'] },
  { name: 'Razor', categoryName: 'Hygiene', unit: 'units', commonPackageSize: 4, defaultDurationDays: 30, tags: ['shaving', 'blade'] },
  { name: 'Shaving Cream', categoryName: 'Hygiene', unit: 'ml', commonPackageSize: 200, defaultDurationDays: 45, tags: ['shaving', 'foam', 'gel'] },
  { name: 'Hand Soap', categoryName: 'Hygiene', unit: 'ml', commonPackageSize: 300, defaultDurationDays: 20, tags: ['soap', 'hands', 'washing'] },
  { name: 'Cotton Pads', categoryName: 'Hygiene', unit: 'units', commonPackageSize: 100, defaultDurationDays: 30, tags: ['cotton', 'makeup', 'cleansing'] },
  { name: 'Sunscreen', categoryName: 'Hygiene', unit: 'ml', commonPackageSize: 200, defaultDurationDays: 60, tags: ['sun', 'protection', 'skin', 'spf'] },
  { name: 'Moisturizer', categoryName: 'Hygiene', unit: 'ml', commonPackageSize: 200, defaultDurationDays: 60, tags: ['skin', 'lotion', 'cream', 'face'] },
  { name: 'Toothbrush', categoryName: 'Hygiene', unit: 'units', commonPackageSize: 1, defaultDurationDays: 90, tags: ['oral', 'teeth', 'dental', 'brush'] },
  { name: 'Nail Clipper', categoryName: 'Hygiene', unit: 'units', commonPackageSize: 1, defaultDurationDays: 730, tags: ['nails', 'grooming'] },
  { name: 'Face Wash', categoryName: 'Hygiene', unit: 'ml', commonPackageSize: 150, defaultDurationDays: 45, tags: ['skin', 'face', 'cleanser', 'wash'] },

  // ── Cleaning ──────────────────────────────────────────────────────
  { name: 'Dish Soap', categoryName: 'Cleaning', unit: 'ml', commonPackageSize: 500, defaultDurationDays: 30, tags: ['kitchen', 'dishes', 'washing', 'detergent'] },
  { name: 'Laundry Detergent', categoryName: 'Cleaning', unit: 'g', commonPackageSize: 3000, defaultDurationDays: 45, tags: ['laundry', 'clothes', 'washing', 'powder'] },
  { name: 'Liquid Laundry Detergent', categoryName: 'Cleaning', unit: 'ml', commonPackageSize: 2000, defaultDurationDays: 45, tags: ['laundry', 'clothes', 'washing', 'liquid'] },
  { name: 'Fabric Softener', categoryName: 'Cleaning', unit: 'ml', commonPackageSize: 1000, defaultDurationDays: 45, tags: ['laundry', 'clothes', 'softener', 'conditioner'] },
  { name: 'All-Purpose Cleaner', categoryName: 'Cleaning', unit: 'ml', commonPackageSize: 500, defaultDurationDays: 30, tags: ['cleaner', 'spray', 'surfaces', 'multipurpose'] },
  { name: 'Bathroom Cleaner', categoryName: 'Cleaning', unit: 'ml', commonPackageSize: 500, defaultDurationDays: 45, tags: ['bathroom', 'toilet', 'tiles', 'limescale'] },
  { name: 'Floor Cleaner', categoryName: 'Cleaning', unit: 'ml', commonPackageSize: 1000, defaultDurationDays: 60, tags: ['floor', 'mopping', 'tiles'] },
  { name: 'Dishwasher Tablets', categoryName: 'Cleaning', unit: 'units', commonPackageSize: 30, defaultDurationDays: 30, tags: ['dishwasher', 'tablets', 'dishes', 'pods'] },
  { name: 'Sponge', categoryName: 'Cleaning', unit: 'units', commonPackageSize: 3, defaultDurationDays: 14, tags: ['kitchen', 'dishes', 'scrub', 'sponge'] },
  { name: 'Bleach', categoryName: 'Cleaning', unit: 'ml', commonPackageSize: 1000, defaultDurationDays: 90, tags: ['disinfectant', 'whitening', 'cleaning', 'chlorine'] },
  { name: 'Glass Cleaner', categoryName: 'Cleaning', unit: 'ml', commonPackageSize: 500, defaultDurationDays: 60, tags: ['windows', 'glass', 'mirrors', 'spray'] },

  // ── Food ─────────────────────────────────────────────────────────
  { name: 'Cooking Oil', categoryName: 'Food', unit: 'ml', commonPackageSize: 900, defaultDurationDays: 45, tags: ['oil', 'cooking', 'frying', 'vegetable'] },
  { name: 'Olive Oil', categoryName: 'Food', unit: 'ml', commonPackageSize: 500, defaultDurationDays: 60, tags: ['oil', 'cooking', 'salad', 'extra virgin'] },
  { name: 'Salt', categoryName: 'Food', unit: 'g', commonPackageSize: 500, defaultDurationDays: 180, tags: ['seasoning', 'cooking', 'spice'] },
  { name: 'Sugar', categoryName: 'Food', unit: 'g', commonPackageSize: 1000, defaultDurationDays: 90, tags: ['sweetener', 'baking', 'cooking'] },
  { name: 'Flour', categoryName: 'Food', unit: 'g', commonPackageSize: 1000, defaultDurationDays: 60, tags: ['baking', 'cooking', 'wheat'] },
  { name: 'Rice', categoryName: 'Food', unit: 'g', commonPackageSize: 1000, defaultDurationDays: 30, tags: ['grains', 'staple', 'cooking', 'carbs'] },
  { name: 'Pasta', categoryName: 'Food', unit: 'g', commonPackageSize: 500, defaultDurationDays: 21, tags: ['grains', 'carbs', 'cooking', 'spaghetti', 'noodles'] },
  { name: 'Ground Coffee', categoryName: 'Food', unit: 'g', commonPackageSize: 250, defaultDurationDays: 21, tags: ['coffee', 'morning', 'caffeine'] },
  { name: 'Eggs', categoryName: 'Food', unit: 'units', commonPackageSize: 12, defaultDurationDays: 14, tags: ['protein', 'breakfast', 'baking', 'dairy'] },
  { name: 'Butter', categoryName: 'Food', unit: 'g', commonPackageSize: 200, defaultDurationDays: 21, tags: ['dairy', 'cooking', 'baking', 'spread'] },
  { name: 'Cereal', categoryName: 'Food', unit: 'g', commonPackageSize: 500, defaultDurationDays: 21, tags: ['breakfast', 'grains', 'morning'] },
  { name: 'Honey', categoryName: 'Food', unit: 'g', commonPackageSize: 500, defaultDurationDays: 180, tags: ['sweetener', 'spread', 'natural'] },
  { name: 'Ketchup', categoryName: 'Food', unit: 'ml', commonPackageSize: 500, defaultDurationDays: 90, tags: ['condiment', 'sauce', 'tomato'] },
  { name: 'Mayonnaise', categoryName: 'Food', unit: 'g', commonPackageSize: 250, defaultDurationDays: 60, tags: ['condiment', 'sauce', 'spread'] },
  { name: 'Tomato Sauce', categoryName: 'Food', unit: 'g', commonPackageSize: 400, defaultDurationDays: 14, tags: ['sauce', 'pasta', 'cooking', 'marinara'] },
  { name: 'Bread', categoryName: 'Food', unit: 'units', commonPackageSize: 1, defaultDurationDays: 7, tags: ['bakery', 'breakfast', 'staple', 'loaf'] },
  { name: 'Black Pepper', categoryName: 'Food', unit: 'g', commonPackageSize: 50, defaultDurationDays: 120, tags: ['seasoning', 'spice', 'cooking'] },
  { name: 'Garlic Powder', categoryName: 'Food', unit: 'g', commonPackageSize: 50, defaultDurationDays: 120, tags: ['seasoning', 'spice', 'cooking', 'garlic'] },

  // ── Beverages ────────────────────────────────────────────────────
  { name: 'Mineral Water', categoryName: 'Beverages', unit: 'ml', commonPackageSize: 1500, defaultDurationDays: 3, tags: ['water', 'hydration', 'drinking'] },
  { name: 'Orange Juice', categoryName: 'Beverages', unit: 'ml', commonPackageSize: 1000, defaultDurationDays: 7, tags: ['juice', 'breakfast', 'vitamin c', 'fruit'] },
  { name: 'Coffee Capsules', categoryName: 'Beverages', unit: 'units', commonPackageSize: 10, defaultDurationDays: 10, tags: ['coffee', 'capsule', 'nespresso', 'pod'] },
  { name: 'Tea Bags', categoryName: 'Beverages', unit: 'units', commonPackageSize: 50, defaultDurationDays: 50, tags: ['tea', 'hot drink', 'herbal'] },
  { name: 'Milk', categoryName: 'Beverages', unit: 'ml', commonPackageSize: 1000, defaultDurationDays: 7, tags: ['dairy', 'breakfast', 'coffee', 'white'] },
  { name: 'Soda', categoryName: 'Beverages', unit: 'ml', commonPackageSize: 2000, defaultDurationDays: 7, tags: ['soft drink', 'cola', 'carbonated', 'fizzy'] },
  { name: 'Sparkling Water', categoryName: 'Beverages', unit: 'ml', commonPackageSize: 1000, defaultDurationDays: 5, tags: ['water', 'sparkling', 'carbonated', 'gas'] },

  // ── Paper Goods ──────────────────────────────────────────────────
  { name: 'Toilet Paper', categoryName: 'Paper Goods', unit: 'units', commonPackageSize: 12, defaultDurationDays: 30, tags: ['bathroom', 'paper', 'essential', 'tissue'] },
  { name: 'Paper Towels', categoryName: 'Paper Goods', unit: 'units', commonPackageSize: 4, defaultDurationDays: 14, tags: ['kitchen', 'paper', 'cleaning', 'roll'] },
  { name: 'Facial Tissues', categoryName: 'Paper Goods', unit: 'units', commonPackageSize: 100, defaultDurationDays: 14, tags: ['paper', 'nose', 'facial', 'kleenex'] },
  { name: 'Trash Bags', categoryName: 'Paper Goods', unit: 'units', commonPackageSize: 20, defaultDurationDays: 20, tags: ['garbage', 'waste', 'bags', 'bin liner'] },
  { name: 'Zip Lock Bags', categoryName: 'Paper Goods', unit: 'units', commonPackageSize: 20, defaultDurationDays: 30, tags: ['storage', 'bags', 'food', 'seal'] },
  { name: 'Aluminum Foil', categoryName: 'Paper Goods', unit: 'sheets', commonPackageSize: 50, defaultDurationDays: 60, tags: ['cooking', 'foil', 'baking', 'wrap'] },
  { name: 'Parchment Paper', categoryName: 'Paper Goods', unit: 'sheets', commonPackageSize: 30, defaultDurationDays: 60, tags: ['baking', 'cooking', 'oven', 'non-stick'] },

  // ── Health ───────────────────────────────────────────────────────
  { name: 'Vitamin C', categoryName: 'Health', unit: 'doses', commonPackageSize: 60, defaultDurationDays: 60, tags: ['vitamins', 'supplements', 'immune', 'ascorbic'] },
  { name: 'Vitamin D', categoryName: 'Health', unit: 'doses', commonPackageSize: 60, defaultDurationDays: 60, tags: ['vitamins', 'supplements', 'immune', 'bones', 'sunshine'] },
  { name: 'Multivitamin', categoryName: 'Health', unit: 'doses', commonPackageSize: 30, defaultDurationDays: 30, tags: ['vitamins', 'supplements', 'daily'] },
  { name: 'Omega-3', categoryName: 'Health', unit: 'doses', commonPackageSize: 60, defaultDurationDays: 60, tags: ['supplements', 'fish oil', 'heart', 'omega'] },
  { name: 'Paracetamol', categoryName: 'Health', unit: 'doses', commonPackageSize: 20, defaultDurationDays: 60, tags: ['medicine', 'pain reliever', 'fever', 'headache', 'tylenol'] },
  { name: 'Ibuprofen', categoryName: 'Health', unit: 'doses', commonPackageSize: 20, defaultDurationDays: 60, tags: ['medicine', 'pain reliever', 'anti-inflammatory', 'advil'] },
  { name: 'Band-Aids', categoryName: 'Health', unit: 'units', commonPackageSize: 20, defaultDurationDays: 90, tags: ['first aid', 'bandage', 'wound', 'plaster'] },
  { name: 'Antiseptic', categoryName: 'Health', unit: 'ml', commonPackageSize: 100, defaultDurationDays: 180, tags: ['first aid', 'disinfectant', 'wound', 'alcohol'] },
  { name: 'Protein Powder', categoryName: 'Health', unit: 'g', commonPackageSize: 900, defaultDurationDays: 30, tags: ['supplement', 'protein', 'gym', 'fitness', 'whey'] },
  { name: 'Creatine', categoryName: 'Health', unit: 'g', commonPackageSize: 300, defaultDurationDays: 50, tags: ['supplement', 'gym', 'fitness', 'creatine', 'performance'] },
  { name: 'Melatonin', categoryName: 'Health', unit: 'doses', commonPackageSize: 30, defaultDurationDays: 30, tags: ['sleep', 'supplements', 'rest', 'insomnia'] },

  // ── Pet ──────────────────────────────────────────────────────────
  { name: 'Cat Food (Dry)', categoryName: 'Pet', unit: 'g', commonPackageSize: 400, defaultDurationDays: 14, tags: ['cat', 'food', 'kibble', 'dry', 'feline'] },
  { name: 'Cat Food (Wet)', categoryName: 'Pet', unit: 'g', commonPackageSize: 85, defaultDurationDays: 7, tags: ['cat', 'food', 'wet', 'pouches', 'feline'] },
  { name: 'Dog Food (Dry)', categoryName: 'Pet', unit: 'g', commonPackageSize: 3000, defaultDurationDays: 30, tags: ['dog', 'food', 'kibble', 'dry', 'canine'] },
  { name: 'Dog Food (Wet)', categoryName: 'Pet', unit: 'g', commonPackageSize: 400, defaultDurationDays: 7, tags: ['dog', 'food', 'wet', 'canine', 'canned'] },
  { name: 'Cat Litter', categoryName: 'Pet', unit: 'g', commonPackageSize: 5000, defaultDurationDays: 30, tags: ['cat', 'litter', 'sand', 'feline', 'toilet'] },
  { name: 'Pet Shampoo', categoryName: 'Pet', unit: 'ml', commonPackageSize: 200, defaultDurationDays: 60, tags: ['pet', 'grooming', 'bath', 'dog', 'cat'] },
  { name: 'Pet Treats', categoryName: 'Pet', unit: 'g', commonPackageSize: 100, defaultDurationDays: 14, tags: ['pet', 'treats', 'snacks', 'reward', 'dog', 'cat'] },
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

  for (const sp of SYSTEM_PRODUCTS) {
    await prisma.systemProduct.upsert({
      where: { name_categoryName: { name: sp.name, categoryName: sp.categoryName } },
      update: {
        unit: sp.unit,
        commonPackageSize: sp.commonPackageSize,
        defaultDurationDays: sp.defaultDurationDays,
        tags: sp.tags,
      },
      create: sp,
    });
  }

  console.log(`Seed complete — ${SYSTEM_PRODUCTS.length} system products upserted.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
