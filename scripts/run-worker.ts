#!/usr/bin/env tsx
/**
 * CitationBot Worker Entry Point
 * Usage: npm run worker
 */
import { run } from "../lib/automation/worker";

run().catch(console.error);
