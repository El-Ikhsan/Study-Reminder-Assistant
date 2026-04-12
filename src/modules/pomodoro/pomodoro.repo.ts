import { getDb } from '@/db/client'
import { pomodoroSessions, pomodoroLogs } from '@/db/schema'
import { eq, sql, count } from 'drizzle-orm'
import { ResponseError } from '@/utils/responseError'
import { logger } from '@/utils/logger'

export const createSession = async (data: {
  id: string; deviceId: string; focusDuration: number; restDuration: number
  targetCycles: number; condition: 'normal' | 'panjang' | 'deadline'
  currentCycle: number; currentMode: 'fokus' | 'istirahat'
  currentPhase: 'awal' | 'tengah' | 'akhir'
  status: 'running' | 'paused' | 'completed' | 'cancelled'
  sensorIntervalSec: number
}) => {
  try {
    const db = getDb()
    
    // 1. Buat Sesi Baru
    await db.insert(pomodoroSessions).values(data)
    
    // 2. ✨ LOGIKA HEMAT KUOTA BERBASIS SESI (Limit 30 Sesi) ✨
    // Cek total sesi untuk alat ini
    const result = await db.select({ total: count() })
      .from(pomodoroSessions)
      .where(eq(pomodoroSessions.deviceId, data.deviceId))
      
    // Jika jumlah sesi menyentuh 40, buang sesi-sesi lama dan sisakan 30 terbaru
    if (result[0].total >= 40) {
      logger.info(`[PomodoroRepo] Memulai pembersihan sesi lama untuk ${data.deviceId}...`)
      await db.run(sql`
        DELETE FROM pomodoro_sessions 
        WHERE device_id = ${data.deviceId} 
        AND id NOT IN (
          SELECT id FROM pomodoro_sessions 
          WHERE device_id = ${data.deviceId} 
          ORDER BY started_at DESC 
          LIMIT 30
        )
      `)
    }
  } catch (error) {
    logger.error('Gagal membuat sesi Pomodoro baru', error)
    throw new ResponseError(500, 'Terjadi kesalahan saat menyimpan sesi Pomodoro.')
  }
}
export const updateSessionStatus = async (sessionId: string, newStatus: 'running' | 'paused' | 'completed' | 'cancelled') => {
  try {
    const db = getDb() // Aman karena dipanggil REST API (Web Stop)
    await db.update(pomodoroSessions).set({ status: newStatus }).where(eq(pomodoroSessions.id, sessionId))
    logger.info(`Sesi Pomodoro ${sessionId} mengubah status menjadi: ${newStatus}.`)
  } catch (error) {
    logger.error(`Gagal mengubah status sesi ${sessionId}`, error)
    throw new ResponseError(500, 'Gagal mengubah status sesi Pomodoro.')
  }
}

export const findPomodoroHistoryBySessionId = async (sessionId: string) => {
  const db = getDb()
  return await db.select().from(pomodoroLogs).where(eq(pomodoroLogs.sessionId, sessionId))
}

export const findAllPomodoroSessions = async () => {
  const db = getDb()
  return await db.select().from(pomodoroSessions)
}
export const findPomodoroSessionById = async (sessionId: string) => {
  const db = getDb()
  const result = await db.select().from(pomodoroSessions).where(eq(pomodoroSessions.id, sessionId)).limit(1)
  return result[0] || null
}

export const deleteSessionById = async (sessionId: string) => {
  const db = getDb()
  await db.delete(pomodoroSessions).where(eq(pomodoroSessions.id, sessionId))
}
