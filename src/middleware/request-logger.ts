import { logger } from "@/utils/logger"
import { createMiddleware } from "hono/factory"

export const requestLogger = createMiddleware(async (c, next) => {
  const start = Date.now()

  await next()

  const duration = Date.now() - start

  logger.info("HTTP Request", {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: `${duration}ms`,
    userAgent: c.req.header("user-agent"),
  })
})