import app from './app'
import { setWorkerEnv } from './config/env'

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      // Set env per request (AMAN & BENAR)
      setWorkerEnv(env)

      return await app.fetch(request, env, ctx)
    } catch (error) {
      console.error('Worker error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Internal server error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  },
}

export { app }
