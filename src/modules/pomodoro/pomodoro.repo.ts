import { getDb, getDbForDO } from '@/db/client'
import { pomodoroSessions, rinchanLogs } from '@/db/schema'
import { eq, sql, count } from 'drizzle-orm'
import { ResponseError } from '@/utils/responseError'
import { logger } from '@/utils/logger'

// ==========================================
// ⏱️ BAGIAN: POMODORO TIME (Dipanggil dari Web HTTP -> Boleh pakai getDb)
// ==========================================
export const createSession = async (data: {
  id: string; deviceId: string; focusDuration: number; restDuration: number
  targetCycles: number; condition: 'normal' | 'marathon' | 'deadline'
  currentCycle: number; currentMode: 'fokus' | 'istirahat'
  currentPhase: 'awal' | 'tengah' | 'akhir'
  status: 'running' | 'paused' | 'completed' | 'cancelled'
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
      // AJAIBNYA: Karena ON DELETE CASCADE di skema tadi, 
      // otomatis RATUSAN data di rinchanLogs milik sesi yang dihapus 
      // ikut Lenyap tak berbekas dalam hitungan milidetik! (Sangat hemat kuota Write)
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

// ==========================================
// ⚠️ DIPANGGIL OLEH WEBSOCKET DO (WAJIB PAKAI getDbForDO & ENV)
// ==========================================

export const updateSessionProgress = async (
  env: any, 
  sessionId: string, 
  cycle: number, 
  mode: 'fokus' | 'istirahat', 
  phase: 'awal' | 'tengah' | 'akhir'
) => {
  try {
    const db = getDbForDO(env) 
    await db.update(pomodoroSessions)
      .set({ currentCycle: cycle, currentMode: mode, currentPhase: phase })
      .where(eq(pomodoroSessions.id, sessionId))
    
    logger.debug(`[Dashboard State] Sesi ${sessionId} update ke: Siklus ${cycle}, ${mode}-${phase}`)
  } catch (error) {
    logger.error(`Gagal update state dashboard untuk sesi ${sessionId}`, error)
  }
}

export const saveRinchanLog = async (env: any, data: {
  deviceId: string; 
  sessionId: string; 
  currentCycle: number;
  pomodoroMode: 'fokus' | 'istirahat';
  timePhase: 'awal' | 'tengah' | 'akhir';
  triggerContext: string; 
  aiResponse: string; 
  emotion: string; 
  temperatureAtTime?: number; 
  lightAtTime?: number; 
  noiseAtTime?: number;
}) => {
  try {
    const db = getDbForDO(env) 
    await db.insert(rinchanLogs).values({ id: crypto.randomUUID(), ...data })
  } catch (error) {
    logger.error(`Gagal menyimpan riwayat AI log untuk ${data.deviceId}`, error)
  }
}

export const updateSessionStatusForDO = async (
  env: any, 
  sessionId: string, 
  newStatus: 'running' | 'paused' | 'completed' | 'cancelled'
) => {
  try {
    const db = getDbForDO(env)
    await db.update(pomodoroSessions)
      .set({ status: newStatus })
      .where(eq(pomodoroSessions.id, sessionId))
    
    logger.info(`[WS] Status sesi ${sessionId} diupdate dari IoT menjadi: ${newStatus}`)
  } catch (error) {
    logger.error(`[WS] Gagal update status sesi ${sessionId} dari DO`, error)
  }
}

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
    
    // 1. Simpan log baru
    await db.insert(rinchanLogs).values({
      id: crypto.randomUUID(),
      ...data
    })

    // 2. ✨ PERBAIKAN: Hitung jumlah log untuk alat ini dulu
    const result = await db.select({ total: count() })
      .from(rinchanLogs)
      .where(eq(rinchanLogs.deviceId, data.deviceId))
      
    const currentTotal = result[0].total

    // 3. ✨ PERBAIKAN: Sapu bersih HANYA jika sudah tembus 200
    if (currentTotal >= 200) {
      logger.info(`[RinchanRepo] Log mencapai ${currentTotal}. Memulai pembersihan menyisakan 50 terbaru...`)
      
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
    }
  } catch (error) {
    logger.error('Failed to save Rin-chan log', error)
    throw new ResponseError(500, 'Gagal menyimpan riwayat respons Rin-chan.')
  }
}