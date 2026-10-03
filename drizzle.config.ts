import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Docker and CI pass DATABASE_URL directly instead of using .env.local.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
