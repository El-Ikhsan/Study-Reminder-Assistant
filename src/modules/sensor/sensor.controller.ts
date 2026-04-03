import { Context } from 'hono'
import { fetchDeviceTelemetry } from './sensor.service'
import { logger } from '@/utils/logger'

export const getTelemetry = async (c: Context) => {
  try {
    const deviceId = c.req.param('deviceId')  as string

    const data = await fetchDeviceTelemetry(deviceId)

    return c.json({
      success: true,
      message: "Data telemetri berhasil diambil",
      data: data
    })
  } catch (error: any) {
    logger.error("Error di getTelemetry controller:", error)
    const status = error.statusCode || 500
    return c.json({ 
      success: false, 
      message: error.message || "Terjadi kesalahan internal" 
    }, status)
  }
}