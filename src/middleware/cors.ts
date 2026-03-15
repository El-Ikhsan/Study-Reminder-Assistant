import { cors } from "hono/cors"
import { getConfig } from "@/config/env"
import { Context, Next } from "hono"

export const corsMiddleware = async (c: Context, next: Next) => {
  const config = getConfig()

  return cors({
    origin: config.cors.origin,
    allowHeaders: ["Content-Type", "Authorization", "x-callback-token"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })(c, next)
}