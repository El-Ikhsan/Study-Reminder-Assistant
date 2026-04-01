import { drizzle } from "drizzle-orm/d1"
import * as schema from "./schema"
import { getConfig } from "@/config/env"

/**
 * Mengambil instance Drizzle DB secara langsung
 */
export const getDb = () => {
  const config = getConfig()
  return drizzle(config.db, { schema })
}

/**
 * digunakan khusus untuk Durable Object, 
 * karena kita perlu passing env dari constructor DO ke repo 
 * agar bisa akses D1 Binding. Jangan dipakai di luar konteks DO!
 */
export const getDbForDO = (env: any) => {
  return drizzle(env.DB, { schema }) 
}

export type DB = ReturnType<typeof getDb>