import { z } from 'zod'
import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

// Schema untuk memvalidasi variabel lingkungan berbasis teks/string
const envStringSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(1, "JWT_SECRET wajib diisi"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET wajib diisi"),
  CORS_ORIGIN: z.string().default('*'),
  R2_PUBLIC_URL: z.string().min(1, "R2_PUBLIC_URL wajib diisi"),
  RINCHAN_MODEL_URL: z.string().min(1, "RINCHAN_MODEL_URL wajib diisi"),
  STT_MODEL_URL: z.string().min(1, "STT_MODEL_URL wajib diisi")
})

export type Bindings = z.infer<typeof envStringSchema> & {
  DB: D1Database
  MY_BUCKET: R2Bucket
  DEVICE_ROOM: DurableObjectNamespace
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
  r2: {
    publicUrl: string
  }
  ai: {
    rinchanUrl: string
    STTUrl: string
  }
  db: D1Database
  bucket: R2Bucket
}

// Global state untuk menampung env dari Cloudflare
let workerEnv: Bindings | null = null
let parsedStringCache: z.infer<typeof envStringSchema> | null = null

/**
 * Dipanggil di index.ts/fetch untuk mendaftarkan env per-request
 */
export const setWorkerEnv = (env: Bindings) => {
  workerEnv = env
}

/**
 * Dipanggil di Service/Repo manapun tanpa parameter!
 */
export const getConfig = (): AppConfig => {
  if (!workerEnv) {
    throw new Error('Worker environment is not initialized. Pastikan setWorkerEnv(env) dipanggil.')
  }

  // Validasi Zod hanya dilakukan sekali per isolate untuk performa
  if (!parsedStringCache) {
    parsedStringCache = envStringSchema.parse(workerEnv)
  }

  return {
    isDev: parsedStringCache.NODE_ENV === 'development',
    jwt: {
      secret: parsedStringCache.JWT_SECRET,
      refreshSecret: parsedStringCache.JWT_REFRESH_SECRET,
    },
    cors: {
      origin: parsedStringCache.CORS_ORIGIN.split(',').map(o => o.trim()),
    },
    r2: {
      publicUrl: `https://${workerEnv.R2_PUBLIC_URL}.r2.cloudflarestorage.com`
    },
    ai: {
      rinchanUrl: parsedStringCache.RINCHAN_MODEL_URL,
      STTUrl: parsedStringCache.STT_MODEL_URL, // Asumsi endpoint sama untuk STT, bisa disesuaikan jika berbeda
    },
    // DB dan Bucket diambil langsung dari workerEnv yang segar
    db: workerEnv.DB,
    bucket: workerEnv.MY_BUCKET
  }
}