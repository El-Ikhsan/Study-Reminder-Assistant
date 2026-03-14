import { z } from 'zod'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

const envStringSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),

  CORS_ORIGIN: z.string().default('*'),
})

export type Bindings = {
  DB: D1Database
  MY_BUCKET: R2Bucket
  NODE_ENV: string
  JWT_SECRET: string
  JWT_REFRESH_SECRET: string
  CORS_ORIGIN: string
}

export type AppConfig = {
  isDev: boolean

  jwt: {
    secret: string
    refreshSecret: string
  }

  cors: {
    origin: string[]
  }

  db: D1Database
  bucket: R2Bucket
}

// ✨ PERBAIKAN: Cache HANYA hasil validasi string-nya saja!
let parsedStringCache: z.infer<typeof envStringSchema> | null = null

export const getConfig = (env: Bindings): AppConfig => {
  // Lakukan validasi Zod hanya sekali per V8 Isolate
  if (!parsedStringCache) {
    parsedStringCache = envStringSchema.parse(env)
  }

  // Rakit konfigurasi dengan DB dan Bucket dari 'env' yang selalu segar
  return {
    isDev: parsedStringCache.NODE_ENV === 'development',

    jwt: {
      secret: parsedStringCache.JWT_SECRET,
      refreshSecret: parsedStringCache.JWT_REFRESH_SECRET,
    },

    cors: {
      origin: parsedStringCache.CORS_ORIGIN.split(',').map(o => o.trim()),
    },

    db: env.DB,
    bucket: env.MY_BUCKET
  }
}

let workerEnv: Bindings | null = null

export const setWorkerEnv = (env: Bindings) => {
  workerEnv = env
}