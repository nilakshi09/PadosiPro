/**
 * seed.ts — Database seeder.
 *
 * WHY: Pre-populate the database with task catalogue data.
 * Run with: npm run prisma:seed
 *
 * Will be implemented once we define the Task model.
 */

async function main() {
  console.log("🌱 Seeding database...");
  // TODO: Add seed data for task catalogue
  console.log("✅ Seeding complete.");
}

main().catch((e) => {
  console.error("Seeding failed:", e);
  process.exit(1);
});
