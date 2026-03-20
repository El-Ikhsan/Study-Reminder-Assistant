import { getDb } from '@/db/client'
import { sensorTelemetry, rinchanLogs } from '@/db/schema'
import { sql, eq, desc } from 'drizzle-orm'
import { ResponseError } from '@/utils/responseError'


// Mock logger, sesuaikan dengan library logger milikmu (pino/winston/console)
const logger = {
  error: (msg: string, err: any) => console.error(`[SensorRepo] ${msg}`, err),
  info: (msg: string) => console.log(`[SensorRepo] ${msg}`)
}

export const saveTelemetryAndRollingLimit = async (data: {
  deviceId: string
  temperature: number
  lightLux: number
  noiseLevel: number
}) => {
  try {
    const db = getDb()
    
    // 1. Simpan data baru
    await db.insert(sensorTelemetry).values({
      id: crypto.randomUUID(),
      deviceId: data.deviceId,
      temperature: data.temperature,
      lightLux: data.lightLux,
      noiseLevel: data.noiseLevel
    })

    // 2. Rolling Window (Limit 50 Baris Terakhir) menggunakan Drizzle SQL
    await db.run(sql`
      DELETE FROM sensor_telemetry 
      WHERE device_id = ${data.deviceId} 
      AND id NOT IN (
        SELECT id FROM sensor_telemetry 
        WHERE device_id = ${data.deviceId} 
        ORDER BY created_at DESC 
        LIMIT 50
      )
    `)
    
  } catch (error) {
    logger.error('Failed to save telemetry', error)
    throw new ResponseError(500, 'Gagal menyimpan data telemetri sensor.')
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
  } catch (error) {
    logger.error('Failed to save Rin-chan log', error)
    throw new ResponseError(500, 'Gagal menyimpan riwayat respons Rin-chan.')
  }
}

// Untuk Endpoint HTTP GET di Frontend
export const getTelemetryHistory = async (deviceId: string) => {
  try {
    const db = getDb()
    return await db.select()
      .from(sensorTelemetry)
      .where(eq(sensorTelemetry.deviceId, deviceId))
      .orderBy(desc(sensorTelemetry.createdAt))
      .limit(50)
  } catch (error) {
    logger.error('Failed to fetch telemetry history', error)
    throw new ResponseError(500, 'Gagal mengambil riwayat sensor.')
  }
}