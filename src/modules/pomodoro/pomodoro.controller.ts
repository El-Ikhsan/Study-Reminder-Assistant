import { Context } from 'hono'
import { ResponseError } from '@/utils/responseError'
import { startSession, stopSession, getPomodoroHistoryById, deletePomodoroById, getAllPomodoroSessions } from './pomodoro.service'
import { logger } from '@/utils/logger'
import { validateBody, validateParam } from '@/utils/validation'
import { startPomodoroSchema, pomodoroIdParamSchema } from './pomodoro.validation'

export const startPomodoro = async (c: Context) => {
  try {
    const body = await validateBody(c, startPomodoroSchema)
    const { deviceId, recipe } = body

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

export const getPomodoroHistory = async (c: Context) => {
  const params = validateParam(c, pomodoroIdParamSchema)
  const result = await getPomodoroHistoryById(params.pomodoroId)

  return c.json({
    success: true,
    data: result,
  }, 200)
}

export const deletePomodoroHistory = async (c: Context) => {
  const params = validateParam(c, pomodoroIdParamSchema)
  const result = await deletePomodoroById(params.pomodoroId)

  return c.json(result, 200)
}

export const getAllPomodoro = async (c: Context) => {
  const result = await getAllPomodoroSessions()

  return c.json({
    success: true,
    data: result,
  }, 200)
}
