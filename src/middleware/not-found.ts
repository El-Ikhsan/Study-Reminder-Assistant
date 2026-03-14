export const notFoundHandler = (c) =>
  c.json(
    {
      success: false,
      message: "Endpoint not found",
      path: c.req.path,
      method: c.req.method,
    },
    404
  )