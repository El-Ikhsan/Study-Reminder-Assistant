import { cors } from "hono/cors"
import { getConfig } from "@/config/env"

export const corsMiddleware = async (c, next) => {
  const config = getConfig(c.env)

  return cors({
    origin: config.cors.origin,
    allowHeaders: ["Content-Type", "Authorization", "x-callback-token"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })(c, next)
}