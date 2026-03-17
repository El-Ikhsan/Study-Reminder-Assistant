import { Hono } from "hono"

import type { Bindings } from "@/config/env"
import {requestLogger} from "@/middleware/request-logger"
import {securityMiddleware} from "@/middleware/security"
import {corsMiddleware} from "@/middleware/cors"
import {errorHandler} from "@/middleware/error-handler"
import {notFoundHandler} from "@/middleware/not-found"

import { getConfig } from "@/config/env"

import authRoutes from "@/modules/auth/auth.routes"
import deviceRoutes from "./modules/device/device.routes"


/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */


const app = new Hono<{ Bindings: Bindings }>()

/* -------------------------------------------------------------------------- */
/* Global Middleware                                                          */
/* -------------------------------------------------------------------------- */


app.use("*", requestLogger)
app.use("*", securityMiddleware)
app.use("*", corsMiddleware)

/* -------------------------------------------------------------------------- */
/* Routes                                                                     */
/* -------------------------------------------------------------------------- */

// Debug routes (development only)
app.use("/api/debug/*", async (c, next) => {
  const config = getConfig()
  return config.isDev ? next() : c.notFound()
})

// Auth
app.route("/api/auth", authRoutes)
app.route("/api/device", deviceRoutes)

/* -------------------------------------------------------------------------- */
/* System Routes                                                              */
/* -------------------------------------------------------------------------- */

app.get("/api/health", (c) =>
  c.json({
    success: true,
    message: "Rin-chan API is healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    runtime: "hono",
    platform: "cloudflare-workers",
  })
)

/* -------------------------------------------------------------------------- */
/* Error Handling                                                             */
/* -------------------------------------------------------------------------- */

app.onError(errorHandler)
app.notFound(notFoundHandler)

export default app