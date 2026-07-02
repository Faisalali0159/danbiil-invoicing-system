#!/usr/bin/env node
/**
 * Apply supabase/migrations/*.sql using DATABASE_URL from apps/web/.env.local
 *
 * Get the connection string from:
 * Supabase Dashboard → Project Settings → Database → Connection string (URI)
 *
 * Usage: npm run db:migrate
 */

import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const envPath = join(root, "apps/web/.env.local")

function loadEnv() {
  try {
    const content = readFileSync(envPath, "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const key = trimmed.slice(0, eq)
      const value = trimmed.slice(eq + 1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local optional if DATABASE_URL is exported in shell
  }
}

loadEnv()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error(
    "Missing DATABASE_URL.\n\n" +
      "Add it to apps/web/.env.local from:\n" +
      "Supabase Dashboard → Settings → Database → Connection string (URI)\n"
  )
  process.exit(1)
}

const migrationsDir = join(root, "supabase/migrations")
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()

const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  console.log(`Connected. Applying ${files.length} migration(s)...`)

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8")
    console.log(`→ ${file}`)
    await client.query(sql)
  }

  console.log("Done.")
} catch (err) {
  console.error("Migration failed:", err.message)
  process.exit(1)
} finally {
  await client.end()
}
