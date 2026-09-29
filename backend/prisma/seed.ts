/**
 * seed.ts — Database seeder for the Task catalogue.
 *
 * WHY: Pre-populate the database with the tasks that PadosiPro offers.
 * Users browse this catalogue and select the tasks they need help with.
 *
 * IDEMPOTENT: Uses upsert by task name, so running multiple times
 * won't create duplicates.
 *
 * Run with: npm run prisma:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Task catalogue data ─────────────────────────────────────────
// At least 20 tasks across 4+ categories.
// Names and descriptions are original, generic wording.

interface SeedTask {
  name: string;
  category: string;
  description: string;
}

const TASKS: SeedTask[] = [
  // ── Home Maintenance ──────────────────────────────────────────
  {
    name: "Plumbing Repair",
    category: "Home Maintenance",
    description: "Fix leaking taps, blocked drains, and pipe issues",
  },
  {
    name: "Electrical Repair",
    category: "Home Maintenance",
    description: "Repair faulty switches, wiring, and electrical fittings",
  },
  {
    name: "Painting & Wall Repair",
    category: "Home Maintenance",
    description: "Interior and exterior wall painting and crack repair",
  },
  {
    name: "Carpentry Work",
    category: "Home Maintenance",
    description: "Furniture repair, door fixing, and woodwork maintenance",
  },
  {
    name: "Appliance Servicing",
    category: "Home Maintenance",
    description: "AC, washing machine, and refrigerator servicing and repair",
  },
  {
    name: "Pest Control",
    category: "Home Maintenance",
    description: "Treatment for cockroaches, termites, mosquitoes, and rodents",
  },

  // ── Bill Payments & Documentation ─────────────────────────────
  {
    name: "Electricity Bill Payment",
    category: "Bill Payments & Documentation",
    description: "Pay monthly electricity bills on your behalf",
  },
  {
    name: "Water & Gas Bill Payment",
    category: "Bill Payments & Documentation",
    description: "Handle water supply and gas connection bill payments",
  },
  {
    name: "Property Tax Filing",
    category: "Bill Payments & Documentation",
    description: "Assist with annual property tax calculation and payment",
  },
  {
    name: "Document Collection & Submission",
    category: "Bill Payments & Documentation",
    description: "Pick up or submit documents at government offices",
  },
  {
    name: "Insurance Premium Payment",
    category: "Bill Payments & Documentation",
    description: "Ensure timely payment of insurance premiums",
  },

  // ── Errands & Deliveries ──────────────────────────────────────
  {
    name: "Grocery Shopping",
    category: "Errands & Deliveries",
    description: "Purchase daily groceries and household essentials",
  },
  {
    name: "Medicine Pickup",
    category: "Errands & Deliveries",
    description: "Collect prescribed medicines from the pharmacy",
  },
  {
    name: "Parcel Drop-off & Pickup",
    category: "Errands & Deliveries",
    description: "Send or receive parcels and courier packages",
  },
  {
    name: "Laundry & Dry Cleaning",
    category: "Errands & Deliveries",
    description: "Drop off and pick up laundry from nearby services",
  },
  {
    name: "Vehicle Fuel Refill",
    category: "Errands & Deliveries",
    description: "Get your car or two-wheeler refuelled at the nearest station",
  },

  // ── Personal Care & Wellness ──────────────────────────────────
  {
    name: "Home Salon Service",
    category: "Personal Care & Wellness",
    description: "Haircut, grooming, and beauty services at your doorstep",
  },
  {
    name: "Physiotherapy Visit",
    category: "Personal Care & Wellness",
    description: "Book a certified physiotherapist for a home session",
  },
  {
    name: "Elderly Care Assistance",
    category: "Personal Care & Wellness",
    description: "Daily assistance and companionship for senior family members",
  },
  {
    name: "Yoga & Fitness Training",
    category: "Personal Care & Wellness",
    description: "Personal yoga or fitness trainer for home workouts",
  },
  {
    name: "Dietician Consultation",
    category: "Personal Care & Wellness",
    description: "Get a personalised meal plan from a qualified dietician",
  },

  // ── Home Cleaning ─────────────────────────────────────────────
  {
    name: "Deep Home Cleaning",
    category: "Home Cleaning",
    description: "Thorough cleaning of all rooms, kitchen, and bathrooms",
  },
  {
    name: "Sofa & Carpet Cleaning",
    category: "Home Cleaning",
    description: "Professional shampooing and stain removal for upholstery",
  },
  {
    name: "Water Tank Cleaning",
    category: "Home Cleaning",
    description: "Sanitise and clean overhead and underground water tanks",
  },
];

// ── Main seed function ──────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding task catalogue...");

  for (const task of TASKS) {
    await prisma.task.upsert({
      where: { name: task.name },
      update: {
        category: task.category,
        description: task.description,
      },
      create: {
        name: task.name,
        category: task.category,
        description: task.description,
      },
    });
  }

  console.log(`✅ Seeded ${TASKS.length} tasks across ${new Set(TASKS.map((t) => t.category)).size} categories.`);
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
