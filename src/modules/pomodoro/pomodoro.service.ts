import { logger } from '@/utils/logger'
import type { Bindings } from '@/config/env'
import * as pomodoroRepo from './pomodoro.repo'
import { sendToIoT } from '@/modules/websocket/ws.service'
import { ResponseError } from '@/utils/responseError'
import { findDeviceById } from '@/modules/device/device.repo'

export const startSession = async (deviceId: string, recipe: any, env: Bindings) => {
  const sessionId = crypto.randomUUID()

  const device = await findDeviceById(deviceId)
  if (!device) {
    throw new ResponseError(404, 'Perangkat tidak ditemukan. Pastikan deviceId valid dan sudah diklaim.')
  }

  let exactStartTime = new Date()

  try {
    // 1. Tahan API (Await) sampai ESP32 menerima perintah dan mengirim CMD_ACK
    const ackRes = await sendToIoT(deviceId, "CMD_START_POMODORO", { sessionId, ...recipe }, env)
    
    // ✨ Ambil waktu presisi dari ESP32 (yang punya data NTP)
    if (ackRes?.payload?.startedAt) {
      exactStartTime = new Date(Number(ackRes.payload.startedAt))
      logger.info(`[Start] Waktu persis NTP diterima dari ESP32: ${exactStartTime.toISOString()}`)
    }
  } catch (error: any) {
    logger.error(`[Start] Gagal terhubung ke device ${deviceId}. Perangkat offline atau lambat.`)
    throw new ResponseError(500, "Gagal memulai sesi. Pastikan perangkat Rinchan menyala dan terhubung ke WiFi.")
  }

  // 3. Simpan ke database dengan waktu yang sudah sinkron
  await pomodoroRepo.createSession({
    id: sessionId,
    deviceId: deviceId,
    focusDuration: recipe.focusDuration,
    restDuration: recipe.breakDuration,
    targetCycles: recipe.cycles,
    media: (recipe.media) as 'Buku' | 'Laptop' | 'HP' | 'Komputer',
    // ✨ Pastikan schema repo kamu mendukung insert `startedAt` secara manual
    startedAt: exactStartTime
  })

  logger.info(`Sesi Pomodoro [${sessionId}] berhasil dimulai untuk perangkat ${deviceId}`)

  // ✨ 4. Kembalikan waktu akurat ke Frontend agar UI bisa menyesuaikan countdown-nya!
  return {
    sessionId,
    startedAt: exactStartTime.toISOString(),
    message: 'Data konfigurasi berhasil dikirim dan perangkat merespons.'
  }
}

export const stopSession = async (sessionId: string, deviceId: string, env: Bindings) => {
  const currentSession = await pomodoroRepo.findPomodoroSessionById(sessionId)

  if (!currentSession) {
    throw new ResponseError(404, "Sesi tidak ditemukan di database.")
  }

  if (currentSession.status === 'completed' || currentSession.status === 'stopped') {
    throw new ResponseError(400, `Perintah ditolak. Sesi ini sudah berstatus: ${currentSession.status}.`)
  }

  await pomodoroRepo.updateSessionStatus(sessionId, 'stopped')

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
  const sensorLogs = await pomodoroRepo.findSensorLogsBySessionId(pomodoroId)
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
