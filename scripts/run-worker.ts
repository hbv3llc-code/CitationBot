#!/usr/bin/env tsx
/**
 * CitationBot Worker Entry Point
 * Usage: npm run worker
 */
import { loadEnvConfig } from "@next/env";
import path from "path";

// Load .env file the same way Next.js does
loadEnvConfig(path.resolve(__dirname, ".."));

import { run } from "../lib/automation/worker";

run().catch(console.error);
