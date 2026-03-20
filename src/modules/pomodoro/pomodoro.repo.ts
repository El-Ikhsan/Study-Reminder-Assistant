import { getDb } from '@/db/client'
import { pomodoroSessions, rinchanLogs } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { ResponseError } from '@/utils/responseError'
import { logger } from '@/utils/logger'

// ==========================================
// ⏱️ BAGIAN: POMODORO TIME (SESSIONS)
// ==========================================
export const createSession = async (data: {
  id: string
  deviceId: string
  focusDuration: number
  restDuration: number
  targetCycles: number
  
  // ✨ Tipe data diubah dari 'string' menjadi Union Type ini!
  condition: 'normal' | 'marathon' | 'deadline' 
  
  currentCycle: number
  currentMode: 'fokus' | 'istirahat' 
  currentPhase: 'awal' | 'tengah' | 'akhir' 
  status: 'running' | 'paused' | 'completed' | 'cancelled' 
}) => {
  try {
    const db = getDb()
    await db.insert(pomodoroSessions).values({
      id: data.id,
      deviceId: data.deviceId,
      focusDuration: data.focusDuration,
      restDuration: data.restDuration,
      targetCycles: data.targetCycles,
      condition: data.condition,
      currentCycle: data.currentCycle,
      currentMode: data.currentMode,
      currentPhase: data.currentPhase,
      status: data.status
    })
    logger.info(`Sesi Pomodoro berhasil dibuat/dilanjutkan untuk perangkat: ${data.deviceId}`)
  } catch (error) {
    logger.error('Gagal membuat sesi Pomodoro baru di database', error)
    throw new ResponseError(500, 'Terjadi kesalahan pada server saat menyimpan sesi Pomodoro.')
  }
}

export const updateSessionPhase = async (sessionId: string, mode: 'fokus' | 'istirahat', phase: 'awal' | 'tengah' | 'akhir') => {
  try {
    const db = getDb()
    await db.update(pomodoroSessions)
      .set({ currentMode: mode, currentPhase: phase })
      .where(eq(pomodoroSessions.id, sessionId))
    
    logger.debug(`Fase sesi ${sessionId} diperbarui menjadi: ${mode} - ${phase}`)
  } catch (error) {
    logger.error(`Gagal memperbarui fase untuk sesi ${sessionId}`, error)
    throw new ResponseError(500, 'Terjadi kesalahan pada server saat memperbarui fase Pomodoro.')
  }
}

// ✨ Bonus: Jadikan status dinamis agar bisa 'completed', 'cancelled', atau 'paused'
export const updateSessionStatus = async (sessionId: string, newStatus: 'running' | 'paused' | 'completed' | 'cancelled') => {
  try {
    const db = getDb()
    await db.update(pomodoroSessions)
      .set({ status: newStatus })
      .where(eq(pomodoroSessions.id, sessionId))
      
    logger.info(`Sesi Pomodoro ${sessionId} mengubah status menjadi: ${newStatus}.`)
  } catch (error) {
    logger.error(`Gagal menyelesaikan sesi ${sessionId}`, error)
    throw new ResponseError(500, 'Terjadi kesalahan pada server saat mengubah status sesi Pomodoro.')
  }
}

// ==========================================
// 🌡️ BAGIAN: POMODORO SENSOR (AI LOGS)
// ==========================================
export const saveRinchanLogAndRollingLimit = async (data: {
  deviceId: string
  triggerContext: string
  aiResponse: string
  emotion: string
  temperatureAtTime: number
  lightAtTime: number
  noiseAtTime: number
}) => {
  try {
    const db = getDb()
    
    await db.insert(rinchanLogs).values({
      id: crypto.randomUUID(),
      ...data
    })

    await db.run(sql`
      DELETE FROM rinchan_logs 
      WHERE device_id = ${data.deviceId} 
      AND id NOT IN (
        SELECT id FROM rinchan_logs 
        WHERE device_id = ${data.deviceId} 
        ORDER BY created_at DESC 
        LIMIT 50
      )
    `)
    
    logger.debug(`Log Rin-chan disimpan & Rolling window diterapkan untuk: ${data.deviceId}`)
  } catch (error) {
    logger.error(`Gagal menyimpan riwayat AI log untuk perangkat ${data.deviceId}`, error)
    throw new ResponseError(500, 'Terjadi kesalahan pada server saat menyimpan riwayat sistem pakar.')
  }
}