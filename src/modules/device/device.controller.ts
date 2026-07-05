import { Context } from 'hono'
import { validateBody, validateParam } from '@/utils/validation'
import * as deviceService from './device.service'
import { claimDeviceSchema, claimStatusCheckSchema, deviceIdParamSchema, deviceIdRouteParamSchema, setBrightnessSchema, setVolumeSchema, updateDeviceSchema, setSensorToggleSchema } from './device.validation'

export const checkClaimStatus = async (c: Context) => {
 const deviceIotIdData = validateParam(c, claimStatusCheckSchema)

 const result = await deviceService.checkClaimStatus(deviceIotIdData.deviceIotId)
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
  
  const result = await deviceService.claimNewDevice(user.userId, data.deviceIotId, data.deviceName)
  return c.json({ success: true, message: 'Perangkat berhasil diklaim', data: result }, 201)
}
export const renewToken = async (c: Context) => {
  const user = c.get('user')
  const params = validateParam(c, deviceIdRouteParamSchema)
  const deviceId = params.id
  
  const result = await deviceService.renewDeviceToken(user.userId, deviceId)
  return c.json({ success: true, message: 'Token berhasil diperbarui', data: result })
}

export const updateDevice = async (c: Context) => {
  const user = c.get('user')
  const params = validateParam(c, deviceIdRouteParamSchema)
  const body = await validateBody(c, updateDeviceSchema)

  const result = await deviceService.updateDevice(user.userId, params.id, body)
  return c.json({ success: true, message: 'Perangkat berhasil diperbarui', data: result })
}

export const getMyDevices = async (c: Context) => {
  const user = c.get('user')
  const result = await deviceService.getUserDevices(user.userId)
  return c.json({ success: true, data: result })
}

export const deleteDevice = async (c: Context) => {
  const user = c.get('user')
  const params = validateParam(c, deviceIdParamSchema)

  const result = await deviceService.deleteDevice(user.userId, params.deviceId)
  return c.json(result, 200)
}

// ====================================================
// 📡 PENGATURAN HARDWARE: BRIGHTNESS & VOLUME
// ====================================================

export const setBrightness = async (c: Context) => {
  const user = c.get('user')
  const body = await validateBody(c, setBrightnessSchema)

  const result = await deviceService.setBrightness(user.userId, body.deviceId, body.value, c.env)
  return c.json(result, 200)
}

export const setVolume = async (c: Context) => {
  const user = c.get('user')
  const body = await validateBody(c, setVolumeSchema)

  const result = await deviceService.setVolume(user.userId, body.deviceId, body.value, c.env)
  return c.json(result, 200)
}

export const setSensorToggle = async (c: Context) => {
  const user = c.get('user')
  const body = await validateBody(c, setSensorToggleSchema)

  const result = await deviceService.setSensorToggle(user.userId, body.deviceId, body.sensorType, body.enabled, c.env)
  return c.json(result, 200)
}
