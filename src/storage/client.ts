import type { Bindings } from "@/config/env"

export const createR2 = (env: Bindings) => {
  return env.MY_BUCKET
}

export type Storage = ReturnType<typeof createR2>