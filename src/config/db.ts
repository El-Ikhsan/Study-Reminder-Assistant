// config/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getConfig } from './env'
import * as schema from '../db/schema'

type Env = {
  DATABASE_URL?: string
}

// ✅ Get database instance for Cloudflare Workers
export const getDb = (env?: Env) => {
  const config = getConfig() // ✅ Safe: called per-request
  const databaseUrl = env?.DATABASE_URL ?? config.database.url

  const sql = postgres(databaseUrl, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 30,
    ssl: false, // ✅ OK for local dev, configure for production
    onnotice: () => {},
    transform: postgres.camel,
  })

  return drizzle(sql, { schema })
}

// Health check function for Workers
export const checkDatabaseHealth = async (env?: Env): Promise<boolean> => {
  try {
    const database = getDb(env)
    await database.select().from(schema.users).limit(1)
    return true
  } catch {
    return false
  }
}
