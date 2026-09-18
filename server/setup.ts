/**
 * NUMI setup — run after copying .env.example → .env
 * Does NOT require editing any source files.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { runPreflight } from "./preflight";

function run(cmd: string, args: string[]) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

async function main() {
  console.log("========== NUMI SETUP ==========");
  if (!process.env.DATABASE_URL) {
    console.error("\nDATABASE_URL missing. Copy .env.example to .env and set DATABASE_URL first.\n");
    process.exit(1);
  }

  try {
    run("pnpm", ["db:migrate"]);
  } catch {
    console.warn("db:migrate failed or drizzle-kit migrate unavailable — trying db:push");
    try {
      run("pnpm", ["db:push"]);
    } catch (e) {
      console.error("Database migration failed. Check DATABASE_URL.", e);
      process.exit(1);
    }
  }

  try {
    run("pnpm", ["db:seed"]);
  } catch (e) {
    console.warn("Seed warning:", e);
  }

  const pf = await runPreflight(true);
  console.log("\n========== SETUP SUMMARY ==========");
  console.log(`Preflight OK: ${pf.ok}`);
  console.log(`Can sell: ${pf.canSell}`);
  console.log(`Native delivery: ${pf.canDeliverNative}`);
  console.log("\nNext: pnpm build && pnpm start   (or pnpm dev for development)\n");
  process.exit(pf.ok ? 0 : 0); // setup exits 0 after reporting; preflight is informational here
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
