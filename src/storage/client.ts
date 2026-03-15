import { getConfig } from "@/config/env"
import type { R2Bucket } from "@cloudflare/workers-types"

/**
 * Mengambil instance Storage (R2 Bucket) secara langsung
 */
export const getStorage = (): R2Bucket => {
  const config = getConfig()
  return config.bucket
}

// Export tipe Storage agar bisa digunakan di Repository/Service
export type Storage = R2Bucket