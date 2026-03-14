import { drizzle } from "drizzle-orm/d1"
import * as schema from "./schema"
import type { Bindings } from "@/config/env"

export const createDB = (env: Bindings) => {
  return drizzle(env.DB, { schema })
}

export type DB = ReturnType<typeof createDB>