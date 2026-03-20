import { Context } from 'hono'
import * as pomodoroService from './pomodoro.service'
import { ResponseError } from '@/utils/responseError'

export const startPomodoro = async (c: Context) => {
  const body = await c.req.json()
  if (!body.deviceId || !body.focusDuration) throw new ResponseError(400, "Data tidak lengkap")
  
  const result = await pomodoroService.startSession(body.deviceId, body, c.env)
  return c.json(result, 200)
}

export const stopPomodoro = async (c: Context) => {
  const body = await c.req.json()
  if (!body.sessionId || !body.deviceId) throw new ResponseError(400, "Session ID dan Device ID wajib diisi")

  const result = await pomodoroService.stopSession(body.sessionId, body.deviceId, c.env)
  return c.json(result, 200)
}

export const reportSensorToAI = async (c: Context) => {
  const body = await c.req.json()
  if (!body.deviceId || !body.sensor) throw new ResponseError(400, "Device ID dan data sensor wajib dikirim")

  const result = await pomodoroService.processSensorReportForAI(body.deviceId, body.sensor, c.env)
  return c.json(result, 200)
}

export const reportTimePhase = async (c: Context) => {
  const body = await c.req.json()
  // Validasi payload dari IoT
  if (!body.sessionId || !body.deviceId || !body.mode) throw new ResponseError(400, "Payload fase waktu tidak lengkap")

  const result = await pomodoroService.processTimePhaseReport(
    body.sessionId, body.deviceId, body.mode, body.durationMin, body.remainingMin, body.condition, c.env
  )
  return c.json(result, 200)
}