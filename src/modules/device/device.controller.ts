import { Context } from 'hono'
import { validateBody } from '@/utils/validation'
import * as deviceService from './device.service'
import { claimDeviceSchema, telemetrySchema } from './device.validation'


export const claimDevice = async (c: Context) => {
  const user = c.get('user')
  const data = await validateBody(c, claimDeviceSchema)
  
  const result = await deviceService.claimNewDevice(user.userId, data.uuid, data.deviceName)
  return c.json({ success: true, message: 'Device claimed successfully', data: result }, 201)
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
  return c.json({ success: true, message: 'Telemetry recorded' })
}