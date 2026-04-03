import { getDbForDO } from '@/db/client'
import { sensorTelemetry, rinchanLogs, pomodoroSessions } from '@/db/schema'
import { eq, desc, count, lte, and, sql } from 'drizzle-orm'
import { logger } from '@/utils/logger'


export const saveTelemetryForDO = async (env: any, data: {
  deviceId: string
  temperature: number
  lightLux: number
  noiseLevel: number
}) => {
  try {
    const db = getDbForDO(env)
    
    // 1. Simpan data baru 
    await db.insert(sensorTelemetry).values({
      id: crypto.randomUUID(),
      deviceId: data.deviceId,
      temperature: data.temperature,
      lightLux: data.lightLux,
      noiseLevel: data.noiseLevel,
      createdAt: sql`CURRENT_TIMESTAMP` // ✨ FIX 1: Paksa isi jam sekarang agar tidak NULL!
    })

    // 2. Hitung jumlah total data saat ini
    const result = await db.select({ total: count() })
      .from(sensorTelemetry)
      .where(eq(sensorTelemetry.deviceId, data.deviceId))
    
    const currentTotal = result[0].total

    // 3. ✨ FIX 2: Logika Sapu Bersih pakai Pure Drizzle (Jalan JIKA tembus 200 saja)
    if (currentTotal >= 200) {
      logger.info(`[ws.repo] Data mencapai ${currentTotal}. Memulai penghapusan...`)
      
      // A. Cari tanggal dari data ke-51 (offset 50)
      const threshold = await db.select({ createdAt: sensorTelemetry.createdAt })
        .from(sensorTelemetry)
        .where(eq(sensorTelemetry.deviceId, data.deviceId))
        .orderBy(desc(sensorTelemetry.createdAt))
        .offset(50) // Melewati 50 data terbaru
        .limit(1)

      if (threshold.length > 0) {
        const cutoffDate = threshold[0].createdAt

        // B. Hapus SEMUA data yang umurnya sama atau lebih tua dari data ke-51
        await db.delete(sensorTelemetry)
          .where(
            and(
              eq(sensorTelemetry.deviceId, data.deviceId),
              lte(sensorTelemetry.createdAt, cutoffDate) // lte = Less Than or Equals
            )
          )
          
        logger.info(`[ws.repo] Pembersihan sukses. 50 data terbaru tersisa di database.`)
      }
    }
  } catch (error) {
    logger.error('[ws.repo] Failed to save telemetry:', error)
  }
}

export const saveRinchanLogForDO = async (env: any, data: {
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

export const updateSessionProgressForDO = async (
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