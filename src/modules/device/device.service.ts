import * as deviceRepo from './device.repo'
import { ResponseError } from '@/utils/responseError'
import { generateIotToken } from '@/utils/jwt'
import { getConfig } from '@/config/env'
import { sendToIoT } from '@/modules/websocket/ws.service'
import { logger } from '@/utils/logger'
import type { Bindings } from '@/config/env'

export const checkClaimStatus = async (deviceIotId: string) => {
  const config = getConfig()

  let device = await deviceRepo.findDeviceByDeviceIotId(deviceIotId)

  if (!device) {
    device = await deviceRepo.insertDeviceIotId({
      id: crypto.randomUUID(),
      deviceIotId: deviceIotId,
      status: 'unclaimed',
    })
  }

  if (!device.userId) {

    return {
      status: 'waiting',
      device: {
        deviceIotId: device.deviceIotId,
        deviceName: device.deviceName,
        deviceStatus: device.status,
      },
      apiKey: null
    }
  }

  const apiKey = await generateIotToken(
    { userId: device.userId, deviceId: device.id, version: device.tokenVersion },
    config.jwt.secret
  )

  return {
    status: 'claimed',
    device: {
      deviceIotId: device.deviceIotId,
      deviceName: device.deviceName,
      deviceStatus: device.status,
    },
    apiKey: apiKey
  }
}

export const claimNewDevice = async (userId: string, deviceIotId: string, deviceName: string) => {

  // 1. Cek apakah UUID sudah diklaim orang lain
  const deviceData = await deviceRepo.findDeviceByDeviceIotId(deviceIotId)
  if (!deviceData) {
    throw new ResponseError(404, 'Perangkat dengan Device IoT ID ini tidak ditemukan. Pastikan perangkat sudah menyala, lakukan restart/booting ulang, lalu coba klaim kembali.')
  }
  if (deviceData.userId && deviceData.userId !== userId) {
    throw new ResponseError(400, 'Perangkat ini sudah terdaftar di akun lain.')
  }
  if (deviceData.status === 'claimed' && deviceData.userId === userId) {
    throw new ResponseError(400, 'Perangkat ini sudah terdaftar di akun Anda.')
  }

  // 2. Update data device jika belum diklaim
  await deviceRepo.updateDeviceData(deviceData.id, {
    userId: userId,
    deviceName: deviceName,
    status: 'claimed',
    tokenVersion: 1
  })
  const updatedDevice = await deviceRepo.findDeviceById(deviceData.id)
  return { device: updatedDevice }
}

export const renewDeviceToken = async (userId: string, deviceId: string) => {
  const device = await deviceRepo.findDeviceById(deviceId)

  if (!device) throw new ResponseError(404, 'Perangkat tidak ditemukan.')
  if (device.userId !== userId) throw new ResponseError(403, 'Akses ditolak.')

  // Naikkan versi token (+1)
  const newVersion = device.tokenVersion + 1
  await deviceRepo.updateDeviceData(deviceId, { tokenVersion: newVersion })

  return { version: newVersion }
}

export const updateDevice = async (userId: string, deviceId: string, data: { deviceName?: string, tokenVersion?: number }) => {
  const device = await deviceRepo.findDeviceById(deviceId)
  if (!device) throw new ResponseError(404, 'Perangkat tidak ditemukan.')
  if (device.userId !== userId) throw new ResponseError(403, 'Akses ditolak.')

  await deviceRepo.updateDeviceData(deviceId, data)
  const updatedDevice = await deviceRepo.findDeviceById(deviceId)
  return updatedDevice
}

export const getUserDevices = async (userId: string) => {
  return await deviceRepo.findDevicesByUserId(userId)
}

export const deleteDevice = async (userId: string, deviceId: string) => {
  const device = await deviceRepo.findDeviceById(deviceId)

  if (!device) throw new ResponseError(404, 'Perangkat tidak ditemukan.')
  if (device.userId !== userId) throw new ResponseError(403, 'Akses ditolak.')

  await deviceRepo.deletePomodoroSessionsByDeviceId(deviceId)
  await deviceRepo.deleteDeviceById(deviceId)

  return { success: true, message: 'Perangkat berhasil dihapus.' }
}

// ====================================================
// 📡 PENGATURAN HARDWARE: BRIGHTNESS & VOLUME
// ====================================================

export const setBrightness = async (userId: string, deviceId: string, value: number, env: Bindings) => {
  const device = await deviceRepo.findDeviceById(deviceId)

  if (!device) throw new ResponseError(404, 'Perangkat tidak ditemukan.')
  if (device.userId !== userId) throw new ResponseError(403, 'Akses ditolak.')

  try {
    await sendToIoT(deviceId, 'CMD_SET_BRIGHTNESS', { value }, env)
  } catch (error: any) {
    logger.error(`[Brightness] Gagal terhubung ke device ${deviceId}. Perangkat offline.`)
    throw new ResponseError(500, 'Gagal mengubah kecerahan. Pastikan perangkat Rinchan menyala dan terhubung ke WiFi.')
  }

  await deviceRepo.updateDeviceData(deviceId, { brightness: value })
  logger.info(`[💡] Brightness diubah menjadi ${value}% untuk device ${deviceId}`)
  return { success: true, message: `Kecerahan berhasil diubah menjadi ${value}%.` }
}

export const setVolume = async (userId: string, deviceId: string, value: number, env: Bindings) => {
  const device = await deviceRepo.findDeviceById(deviceId)

  if (!device) throw new ResponseError(404, 'Perangkat tidak ditemukan.')
  if (device.userId !== userId) throw new ResponseError(403, 'Akses ditolak.')

  try {
    await sendToIoT(deviceId, 'CMD_SET_VOLUME', { value }, env)
  } catch (error: any) {
    logger.error(`[Volume] Gagal terhubung ke device ${deviceId}. Perangkat offline.`)
    throw new ResponseError(500, 'Gagal mengubah volume. Pastikan perangkat Rinchan menyala dan terhubung ke WiFi.')
  }

  await deviceRepo.updateDeviceData(deviceId, { volume: value })
  logger.info(`[🔊] Volume diubah menjadi ${value}% untuk device ${deviceId}`)
  return { success: true, message: `Volume berhasil diubah menjadi ${value}%.` }
}