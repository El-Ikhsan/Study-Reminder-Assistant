import app from "./app"
import { setWorkerEnv } from "@/config/env"

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    setWorkerEnv(env)

    return app.fetch(request, env, ctx)
  },
}

export { DeviceRoom } from './modules/websocket/DeviceRoom'