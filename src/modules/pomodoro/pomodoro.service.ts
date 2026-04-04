import { logger } from '@/utils/logger'
import type { Bindings } from '@/config/env'
import * as pomodoroRepo from './pomodoro.repo' 
import { sendToIoT } from '@/modules/websocket/ws.service'
import { ResponseError } from '@/utils/responseError'

export const startSession = async (deviceId: string, recipe: any, env: Bindings) => {
  const sessionId = crypto.randomUUID()

  await pomodoroRepo.createSession({
    id: sessionId,
    deviceId: deviceId,
    focusDuration: recipe.focusDuration,
    restDuration: recipe.breakDuration,
    targetCycles: recipe.cycles,
    condition: (recipe.mode || 'normal') as 'normal' | 'marathon' | 'deadline',
    currentCycle: recipe.currentCycle || 1,
    currentMode: (recipe.currentMode || 'fokus') as 'fokus' | 'istirahat',
    currentPhase: (recipe.currentPhase || 'awal') as 'awal' | 'tengah' | 'akhir',
    status: (recipe.status || 'running') as 'running' | 'paused' | 'completed' | 'cancelled'
  })

  await sendToIoT(deviceId, "CMD_START_POMODORO", { sessionId, ...recipe }, env)

  logger.info(`Sesi Pomodoro [${sessionId}] dimulai untuk perangkat ${deviceId}`)
  return { sessionId, message: 'Data konfigurasi berhasil dikirim ke perangkat IoT.' }
}

export const stopSession = async (sessionId: string, deviceId: string, env: Bindings) => {
  await pomodoroRepo.updateSessionStatus(sessionId, 'completed')

  try {
    await sendToIoT(deviceId, "CMD_STOP_POMODORO", {}, env)
    logger.info(`Perintah stop berhasil dikirim ke perangkat ${deviceId}`)
  } catch (error) {
    logger.warn(`Perangkat ${deviceId} offline saat instruksi stop dikirim. Sesi dihentikan di database.`, error)
  }

  return { success: true, message: 'Sesi Pomodoro berhasil dihentikan.' }
}

export const getPomodoroHistoryById = async (pomodoroId: string) => {
  return await pomodoroRepo.findPomodoroHistoryBySessionId(pomodoroId)
}

export const getAllPomodoroSessions = async () => {
  return await pomodoroRepo.findAllPomodoroSessions()
}

export const deletePomodoroById = async (pomodoroId: string) => {
  const session = await pomodoroRepo.findPomodoroSessionById(pomodoroId)
  if (!session) {
    throw new ResponseError(404, 'Sesi Pomodoro tidak ditemukan.')
  }
  await pomodoroRepo.deleteSessionById(pomodoroId)
  return { success: true, message: 'Sesi Pomodoro dan history berhasil dihapus.' }
}

