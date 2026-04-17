import { cors } from "hono/cors"
import { getConfig } from "@/config/env"
import { Context, Next } from "hono"

export const corsMiddleware = async (c: Context, next: Next) => {
  const config = getConfig()

  return cors({
    origin: (origin) => {
      if (config.cors.origin.includes('*')) {
        return origin || '*' // Return exact origin for credentials: true, else fallback
      }
      if (origin && config.cors.origin.includes(origin)) {
        return origin
      }
      return config.cors.origin[0] || '*'
    },
    allowHeaders: ["Content-Type", "Authorization", "x-callback-token", "X-Refresh-Token"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })(c, next)
}