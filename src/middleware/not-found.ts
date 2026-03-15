import { Context } from "hono"

export const notFoundHandler = (c: Context) =>
  c.json(
    {
      success: false,
      message: "Endpoint not found",
      path: c.req.path,
      method: c.req.method,
    },
    404
  )