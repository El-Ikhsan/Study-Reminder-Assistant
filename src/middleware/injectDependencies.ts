import { createMiddleware } from 'hono/factory'
import { createDB, type DB } from "@/db/client"
import { createR2, type Storage } from "@/storage/client"
import type { Bindings } from "@/config/env"

// ✨ Definisikan tipe lingkungan untuk middleware ini
type InjectEnv = {
  Bindings: Bindings
  Variables: {
    db: DB
    storage: Storage
  }
}

// ✨ Bungkus dengan createMiddleware agar TypeScript tahu 'c' itu aman!
export const injectDependencies = createMiddleware<InjectEnv>(async (c, next) => {
  const db = createDB(c.env)
  const storage = createR2(c.env)

  c.set("db", db)
  c.set("storage", storage)

  await next()
})