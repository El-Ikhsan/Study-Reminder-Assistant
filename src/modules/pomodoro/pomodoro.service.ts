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
    startedAt: exactStartTime
  })

  logger.info(`Sesi Pomodoro [${sessionId}] berhasil dimulai untuk perangkat ${deviceId}`)

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

export const getAllPomodoroSessions = async (userId: string) => {
  return await pomodoroRepo.findAllPomodoroSessions(userId)
}

export const deletePomodoroById = async (pomodoroId: string) => {
  const session = await pomodoroRepo.findPomodoroSessionById(pomodoroId)
  if (!session) {
    throw new ResponseError(404, 'Sesi Pomodoro tidak ditemukan.')
  }
  await pomodoroRepo.deleteSessionById(pomodoroId)
  return { success: true, message: 'Sesi Pomodoro dan history berhasil dihapus.' }
}

// ─── Types untuk stats ────────────────────────────────────────────────────

type StatsRange = 'week' | 'month'

type DominantDistraction = 'Suhu Panas' | 'Suhu Dingin' | 'Suara Bising' | 'Cahaya Gelap' | 'Cahaya Silau' | 'Optimal'

export interface LearningStats {
  range: StatsRange
  periodLabel: string           // Menampilkan "1-7 Jul 2026" atau "Juli 2026"
  // Pomodoro — periode saat ini
  totalFocusMinutes: number
  sessionCount: number
  completedCount: number
  // Pomodoro — periode sebelumnya (untuk TrendBadge di frontend)
  previousFocusMinutes: number
  previousSessionCount: number
  // Tren vs periode sebelumnya (angka %, contoh: +25, -10, 0)
  focusTrendPct: number
  sessionTrendPct: number
  // Lingkungan belajar
  totalSensorEvents: number
  interupsiCount: number
  pemulihanCount: number
  // Distraksi dominan berdasarkan triggerContext sensor logs interupsi
  dominantDistraction: DominantDistraction | null
  distractionChartData: { label: string; value: number }[]
  // Data grafik tren fokus per interval (siap render di frontend)
  chartData: { label: string; value: number }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Tentukan batas waktu unix (from/to) berdasarkan range kalender dan offset. */
function getPeriodBounds(range: StatsRange, offset: number) {
  const now = new Date()
  
  if (range === 'month') {
    const y = now.getFullYear()
    const m = now.getMonth()
    const start = new Date(y, m - offset, 1)
    const end = new Date(y, m - offset + 1, 1)
    const prevStart = new Date(y, m - offset - 1, 1)
    const prevEnd = new Date(y, m - offset, 1)
    
    const formatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
    const periodLabel = formatter.format(start)

    return {
      fromSec: Math.floor(start.getTime() / 1000),
      toSec: Math.floor(end.getTime() / 1000),
      prevFromSec: Math.floor(prevStart.getTime() / 1000),
      prevToSec: Math.floor(prevEnd.getTime() / 1000),
      periodLabel
    }
  } else {
    // week (dimulai dari Senin)
    const day = now.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    now.setHours(0, 0, 0, 0)
    now.setDate(now.getDate() + diffToMonday) // Senin minggu ini
    
    // terapkan offset (mundur N minggu)
    now.setDate(now.getDate() - (offset * 7))
    
    const start = new Date(now.getTime())
    const end = new Date(now.getTime())
    end.setDate(end.getDate() + 7)
    
    const prevStart = new Date(start.getTime())
    prevStart.setDate(prevStart.getDate() - 7)
    const prevEnd = new Date(start.getTime())
    
    const endDisplay = new Date(end.getTime())
    endDisplay.setDate(endDisplay.getDate() - 1) // Minggu
    
    const dFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })
    const yFormatter = new Intl.DateTimeFormat('id-ID', { year: 'numeric' })
    const periodLabel = `${dFormatter.format(start)} - ${dFormatter.format(endDisplay)} ${yFormatter.format(endDisplay)}`
    
    return {
      fromSec: Math.floor(start.getTime() / 1000),
      toSec: Math.floor(end.getTime() / 1000),
      prevFromSec: Math.floor(prevStart.getTime() / 1000),
      prevToSec: Math.floor(prevEnd.getTime() / 1000),
      periodLabel
    }
  }
}

/** Durasi fokus dalam menit dari sesi completed/stopped. */
function sumFocusMinutes(sessions: { focusDuration: number; status: string | null }[]): number {
  return sessions
    .filter(s => s.status === 'completed' || s.status === 'stopped')
    .reduce((acc, s) => acc + (s.focusDuration ?? 0), 0)
}

/** Hitung tren sebagai persentase bulat, capped di ±999. */
function calcTrendPct(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0
  if (previous === 0) return 100
  const pct = Math.round(((current - previous) / previous) * 100)
  return Math.max(-999, Math.min(999, pct))
}

/**
 * Tentukan distraksi dominan dan buat data grafik dari triggerContext log interupsi.
 */
function computeDistractionStats(
  sensorLogs: { eventType: string; triggerContext: string }[]
): { dominant: DominantDistraction | null; chartData: { label: string; value: number }[] } {
  const interupsiLogs = sensorLogs.filter(l => l.eventType === 'interupsi')
  const defaultChartData = [
    { label: 'Gelap', value: 0 },
    { label: 'Silau', value: 0 },
    { label: 'Bising', value: 0 },
    { label: 'Panas', value: 0 },
    { label: 'Dingin', value: 0 },
  ]

  if (interupsiLogs.length === 0) {
    return { dominant: 'Optimal', chartData: defaultChartData }
  }

  let gelap = 0, silau = 0, bising = 0, panas = 0, dingin = 0

  for (const log of interupsiLogs) {
    const ctx = log.triggerContext
    if (ctx.includes('Gelap')) gelap++
    else if (ctx.includes('Silau')) silau++
    else if (ctx.includes('Bising')) bising++
    else if (ctx.includes('Panas')) panas++
    else if (ctx.includes('Dingin')) dingin++
  }

  const categories = [
    { key: 'Cahaya Gelap', count: gelap },
    { key: 'Cahaya Silau', count: silau },
    { key: 'Suara Bising', count: bising },
    { key: 'Suhu Panas', count: panas },
    { key: 'Suhu Dingin', count: dingin },
  ]

  let maxCount = 0
  let dominant: DominantDistraction = 'Optimal'
  
  for (const cat of categories) {
    if (cat.count > maxCount) {
      maxCount = cat.count
      dominant = cat.key as DominantDistraction
    }
  }

  return {
    dominant,
    chartData: [
      { label: 'Gelap', value: gelap },
      { label: 'Silau', value: silau },
      { label: 'Bising', value: bising },
      { label: 'Panas', value: panas },
      { label: 'Dingin', value: dingin },
    ]
  }
}

/**
 * Bangun data grafik tren waktu fokus per interval sesuai range kalender.
 * - week  → per hari dalam minggu tersebut (Senin-Minggu)
 * - month → per minggu (dibagi rata ke dalam blok 7 hari)
 */
function computeChartData(
  sessions: { focusDuration: number; status: string | null; startedAt: Date | number | null }[],
  range: StatsRange,
  fromSec: number,
  toSec: number
): { label: string; value: number }[] {
  const doneSessions = sessions.filter(s => s.status === 'completed' || s.status === 'stopped')

  if (range === 'week') {
    const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
    const buckets = [0, 0, 0, 0, 0, 0, 0] // index 0 adalah Senin
    for (const s of doneSessions) {
      const ts = s.startedAt instanceof Date ? s.startedAt.getTime() : Number(s.startedAt) * 1000
      const dayIndex = Math.floor((ts - fromSec * 1000) / (24 * 3600 * 1000))
      if (dayIndex >= 0 && dayIndex < 7) {
        buckets[dayIndex] += (s.focusDuration ?? 0)
      }
    }
    return buckets.map((val, i) => ({ label: DAY_LABELS[i], value: val }))
  }

  // month → per minggu (Minggu 1, Minggu 2, dst)
  const daysInMonth = Math.round((toSec - fromSec) / (24 * 3600))
  const numWeeks = Math.ceil(daysInMonth / 7)
  const buckets = new Array(numWeeks).fill(0)
  
  for (const s of doneSessions) {
    const ts = s.startedAt instanceof Date ? s.startedAt.getTime() : Number(s.startedAt) * 1000
    const weekIndex = Math.floor((ts - fromSec * 1000) / (7 * 24 * 3600 * 1000))
    if (weekIndex >= 0 && weekIndex < numWeeks) {
      buckets[weekIndex] += (s.focusDuration ?? 0)
    }
  }
  return buckets.map((val, i) => ({ label: `Mg ${i + 1}`, value: val }))
}

// ─── Service function ─────────────────────────────────────────────────────

/**
 * Hitung statistik belajar pengguna di sisi backend.
 * Frontend hanya perlu render — tidak ada kalkulasi di frontend.
 */
export const getUserStats = async (userId: string, range: StatsRange, offset: number): Promise<LearningStats> => {
  const { fromSec, toSec, prevFromSec, prevToSec, periodLabel } = getPeriodBounds(range, offset)

  // Ambil data kedua periode secara paralel
  const [currentData, prevData] = await Promise.all([
    pomodoroRepo.findSessionsAndSensorLogsBetween(userId, fromSec, toSec),
    pomodoroRepo.findSessionsAndSensorLogsBetween(userId, prevFromSec, prevToSec),
  ])

  const { sessions: currentSessions, sensorLogs: currentSensorLogs } = currentData
  const { sessions: prevSessions } = prevData // Repo Between() otomatis menjamin tidak ada overlap data

  // ── Pomodoro stats ──────────────────────────────────────────────────────
  const totalFocusMinutes = sumFocusMinutes(currentSessions)
  const previousFocusMinutes = sumFocusMinutes(prevSessions)
  const sessionCount = currentSessions.length
  const previousSessionCount = prevSessions.length
  const completedCount = currentSessions.filter(s => s.status === 'completed').length

  const focusTrendPct = calcTrendPct(totalFocusMinutes, previousFocusMinutes)
  const sessionTrendPct = calcTrendPct(sessionCount, previousSessionCount)

  // ── Sensor / lingkungan stats ────────────────────────────────────────────
  const totalSensorEvents = currentSensorLogs.length
  const interupsiCount = currentSensorLogs.filter(l => l.eventType === 'interupsi').length
  const pemulihanCount = currentSensorLogs.filter(l => l.eventType === 'pemulihan').length

  const { dominant: dominantDistraction, chartData: distractionChartData } = computeDistractionStats(currentSensorLogs)
  const chartData = computeChartData(currentSessions, range, fromSec, toSec)

  return {
    range,
    periodLabel,
    totalFocusMinutes,
    sessionCount,
    completedCount,
    previousFocusMinutes,
    previousSessionCount,
    focusTrendPct,
    sessionTrendPct,
    totalSensorEvents,
    interupsiCount,
    pemulihanCount,
    dominantDistraction,
    distractionChartData,
    chartData,
  }
}


