import { secureHeaders } from "hono/secure-headers"

export const securityMiddleware = secureHeaders({
  crossOriginResourcePolicy: "cross-origin",
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
  },
})