import { createMiddleware } from "hono/factory"

export const notFoundHandler = createMiddleware(async (c) =>
  c.json(
    {
      success: false,
      message: "Endpoint not found",
      path: c.req.path,
      method: c.req.method,
    },
    404
  ))