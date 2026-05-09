import { logger } from '@/utils/logger'
import type { Bindings } from '@/config/env'
import * as pomodoroRepo from './pomodoro.repo'
import { sendToIoT } from '@/modules/websocket/ws.service'
import { ResponseError } from '@/utils/responseError'
import { findDeviceById } from '@/modules/device/device.repo'

export const startSession = async (deviceId: string, recipe: any, env: Bindings) => {
  const sessionId = crypto.randomUUID()

  // Cek deviceId valid
  const device = await findDeviceById(deviceId)
  if (!device) {
    throw new ResponseError(404, 'Perangkat tidak ditemukan. Pastikan deviceId valid dan sudah diklaim.')
  }
  try {
    await sendToIoT(deviceId, "CMD_START_POMODORO", { sessionId, ...recipe }, env)
  } catch (error: any) {
    logger.error(`[Start] Gagal terhubung ke device ${deviceId}. Perangkat offline.`)
    throw new ResponseError(500, "Gagal memulai sesi. Pastikan perangkat Rinchan menyala dan terhubung ke WiFi.")
  }

  await pomodoroRepo.createSession({
    id: sessionId,
    deviceId: deviceId,
    focusDuration: recipe.focusDuration,
    restDuration: recipe.breakDuration,
    targetCycles: recipe.cycles,
    media: (recipe.media) as 'Buku' | 'Laptop' | 'HP' | 'Komputer',
    currentCycle: recipe.currentCycle || 1,
    currentMode: (recipe.currentMode || 'fokus') as 'fokus' | 'istirahat',
    currentPhase: (recipe.currentPhase || 'awal') as 'awal' | 'tengah' | 'akhir',
    status: (recipe.status || 'running') as 'running' | 'paused' | 'completed' | 'cancelled'
  })

  logger.info(`Sesi Pomodoro [${sessionId}] berhasil dimulai untuk perangkat ${deviceId}`)
  return { sessionId, message: 'Data konfigurasi berhasil dikirim dan perangkat merespons.' }
}


export const stopSession = async (sessionId: string, deviceId: string, env: Bindings) => {
  const currentSession = await pomodoroRepo.findPomodoroSessionById(sessionId)

  if (!currentSession) {
    throw new ResponseError(404, "Sesi tidak ditemukan di database.")
  }

  if (currentSession.status === 'completed' || currentSession.status === 'cancelled') {
    throw new ResponseError(400, `Perintah ditolak. Sesi ini sudah berstatus: ${currentSession.status}.`)
  }

  await pomodoroRepo.updateSessionStatus(sessionId, 'cancelled')

  try {
    await sendToIoT(deviceId, "CMD_STOP_POMODORO", {}, env)
    logger.info(`Perintah stop berhasil dikirim ke perangkat ${deviceId}`)
  } catch (error) {
    logger.warn(`Perangkat ${deviceId} offline saat instruksi stop dikirim. Sesi tetap dibatalkan di database.`)
  }

  return { success: true, message: 'Sesi Pomodoro berhasil dibatalkan.' }
}

export const getPomodoroHistoryById = async (pomodoroId: string) => {
  const pomodoroLogs = await pomodoroRepo.findPomodoroLogsBySessionId(pomodoroId)
  const sensorLogs = await pomodoroRepo.findSensorEventsBySessionId(pomodoroId)
  return { pomodoroLogs, sensorLogs }
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
