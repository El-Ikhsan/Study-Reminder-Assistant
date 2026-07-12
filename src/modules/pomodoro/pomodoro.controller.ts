import { Context } from 'hono'
import { ResponseError } from '@/utils/responseError'
import { startSession, stopSession, getPomodoroHistoryById, deletePomodoroById, getAllPomodoroSessions, getUserStats } from './pomodoro.service'
import { validateBody, validateParam } from '@/utils/validation'
import { startPomodoroSchema, pomodoroIdParamSchema, stopPomodoroSchema } from './pomodoro.validation'

export const startPomodoro = async (c: Context) => {
  const body = await validateBody(c, startPomodoroSchema)
  const { deviceId, recipe } = body

  // Lempar ke Service (Di dalam startSession ini UUID akan di-generate)
  const result = await startSession(deviceId, recipe, c.env)

  return c.json({
    success: true,
    message: result.message,
    sessionId: result.sessionId, // Mengembalikan ID yang baru dibuat ke frontend
  })
}

export const stopPomodoro = async (c: Context) => {
  const body = await validateBody(c, stopPomodoroSchema)
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
  const user = c.get('user')
  const result = await getAllPomodoroSessions(user.userId)

  return c.json({
    success: true,
    data: result,
  }, 200)
}

export const getStats = async (c: Context) => {
  const user = c.get('user')
  
  const rangeParam = c.req.query('range')
  const range = (rangeParam === 'week' || rangeParam === 'month') ? rangeParam : 'week'
  
  const offsetParam = c.req.query('offset')
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0

  const result = await getUserStats(user.userId, range, isNaN(offset) ? 0 : offset)

  return c.json({
    success: true,
    data: result,
  }, 200)
}
