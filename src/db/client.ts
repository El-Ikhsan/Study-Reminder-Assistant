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

// Export tipe DB untuk keperluan type-hinting di Repo/Service
export type DB = ReturnType<typeof getDb>