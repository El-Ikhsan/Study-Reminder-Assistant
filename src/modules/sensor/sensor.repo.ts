import { getDb, getDbForDO } from '@/db/client'
import { sensorTelemetry } from '@/db/schema'
import { sql, eq, desc, count } from 'drizzle-orm'
import { ResponseError } from '@/utils/responseError'
import { logger } from '@/utils/logger'

export const saveTelemetryAndRollingLimit = async (env: any, data: {
  deviceId: string
  temperature: number
  lightLux: number
  noiseLevel: number
}) => {
  try {
    const db = getDbForDO(env)
    
    // 1. Simpan data baru (1 Write)
    await db.insert(sensorTelemetry).values({
      id: crypto.randomUUID(),
      deviceId: data.deviceId,
      temperature: data.temperature,
      lightLux: data.lightLux,
      noiseLevel: data.noiseLevel
    })

    // 2. Hitung jumlah data (1 Read)
    const result = await db.select({ total: count() })
      .from(sensorTelemetry)
      .where(eq(sensorTelemetry.deviceId, data.deviceId))
    
    const currentTotal = result[0].total

    // 3. Logika Sapu Bersih (Jalan JIKA tembus 200 saja)
    if (currentTotal >= 200) {
      console.log(`[SensorRepo] Data mencapai ${currentTotal}. Memulai penghapusan menyisakan 50 terbaru...`)
      
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
    }
    
  } catch (error) {
    console.error('[SensorRepo] Failed to save telemetry:', error)
  }
}



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