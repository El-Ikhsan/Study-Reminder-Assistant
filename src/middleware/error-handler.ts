import { HTTPException } from "hono/http-exception"
import { logger } from "@/utils/logger"
import type { Context } from "hono"
import { ResponseError } from "@/utils/responseError"

export const errorHandler = (error: unknown, c: Context) => {
  if (error instanceof ResponseError) {
    return c.json(
      { success: false, message: error.message },
      error.status as any
    )
  }

  if (error instanceof HTTPException) {
    return c.json(
      { success: false, message: error.message },
      error.status
    )
  }

  logger.error("Unhandled error", {
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
    path: c.req.path,
    method: c.req.method,
  })

  return c.json(
    { success: false, message: "Internal server error" },
    500
  )
}