/**
 * Idempotent seed — safe to run multiple times.
 * Only needs DATABASE_URL in .env.
 */
import "dotenv/config";
import { ensureCatalogSeeded } from "./db";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required in .env");
    process.exit(1);
  }
  console.log("Seeding catalog (idempotent)...");
  await ensureCatalogSeeded();
  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
