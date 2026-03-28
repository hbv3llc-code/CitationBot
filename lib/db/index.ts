import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Connection string from env
const connectionString = process.env.DATABASE_URL!;

// For query purposes (pooled)
const queryClient = postgres(connectionString, { max: 10 });

export const db = drizzle(queryClient, { schema });

export * from "./schema";
