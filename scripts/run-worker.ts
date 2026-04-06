#!/usr/bin/env tsx
/**
 * CitationBot Worker Entry Point
 * Usage: npm run worker
 */
import { loadEnvConfig } from "@next/env";
import path from "path";

// Load .env BEFORE importing anything that connects to the database
loadEnvConfig(path.resolve(__dirname, ".."));

// Dynamic import ensures db/index.ts reads DATABASE_URL after env is loaded
async function main() {
  const { run } = await import("../lib/automation/worker");
  await run();
}

main().catch(console.error);
