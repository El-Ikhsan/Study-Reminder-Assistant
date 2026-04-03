import { getDb } from '@/db/client'
import { sensorTelemetry } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { ResponseError } from '@/utils/responseError'
import { logger } from '@/utils/logger'

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