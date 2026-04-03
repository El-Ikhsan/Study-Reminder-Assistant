import { Context } from 'hono'
import { ResponseError } from '@/utils/responseError'
import { startSession, stopSession } from './pomodoro.service'
import { logger } from '@/utils/logger'

export const startPomodoro = async (c: Context) => {
  try {
    const body = await c.req.json()
    const { deviceId, recipe } = body

    if (!deviceId || !recipe) {
      return c.json({ 
        success: false, 
        message: "Device ID dan Recipe wajib diisi" 
      }, 400)
    }

    // Lempar ke Service (Di dalam startSession ini UUID akan di-generate)
    const result = await startSession(deviceId, recipe, c.env)

    return c.json({
      success: true,
      message: result.message,
      sessionId: result.sessionId // Mengembalikan ID yang baru dibuat ke frontend
    })

  } catch (error: any) {
    logger.error("Error di startPomodoro controller:", error)
    return c.json({ 
      success: false, 
      message: error.message || "Terjadi kesalahan internal" 
    }, 500)
  }
}

export const stopPomodoro = async (c: Context) => {
  const body = await c.req.json()
  if (!body.sessionId || !body.deviceId) throw new ResponseError(400, "Session ID dan Device ID wajib diisi")

  const result = await stopSession(body.sessionId, body.deviceId, c.env)
  return c.json(result, 200)
}
