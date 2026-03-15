import app from "./app"
import { setWorkerEnv } from "@/config/env"

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // ✨ WAJIB: Isi bensin dulu sebelum mobilnya (app) jalan!
    setWorkerEnv(env)
    
    // Baru kemudian serahkan sisanya ke Hono
    return app.fetch(request, env, ctx)
  },
}