import { Context } from 'hono'
import { validateBody } from '@/utils/validation'
import * as deviceService from './device.service'
import { claimDeviceSchema, telemetrySchema, claimStatusCheckSchema } from './device.validation'

export const checkClaimStatus = async (c: Context) => {
 c.req.param('rinchan-id')
 const rinchanIdData = await validateBody(c, claimStatusCheckSchema)

 const result = await deviceService.checkClaimStatus(rinchanIdData.rinchanId)
 return c.json({
    success: true,
    status: result.status,
    message: result.status === 'waiting' ? 'Menunggu klaim' : 'Klaim sukses',
    data: result
  }, 200)

}

export const claimDevice = async (c: Context) => {
  const user = c.get('user')
  const data = await validateBody(c, claimDeviceSchema)
  
  const result = await deviceService.claimNewDevice(user.userId, data.rinchanId, data.deviceName)
  return c.json({ success: true, message: 'Perangkat berhasil diklaim', data: result }, 201)
}
export const renewToken = async (c: Context) => {
  const user = c.get('user')
  const deviceId = c.req.param('id') as string // Ambil ID dari URL params
  
  const result = await deviceService.renewDeviceToken(user.userId, deviceId)
  return c.json({ success: true, message: 'Token berhasil diperbarui', data: result })
}

export const getMyDevices = async (c: Context) => {
  const user = c.get('user')
  const result = await deviceService.getUserDevices(user.userId)
  return c.json({ success: true, data: result })
}

export const sendTelemetry = async (c: Context) => {
  const data = await validateBody(c, telemetrySchema)
  await deviceService.recordSensor(data)
  return c.json({ success: true, message: 'Telemetry berhasil direkam' })
}