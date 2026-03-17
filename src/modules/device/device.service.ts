import * as deviceRepo from './device.repo'
import { ResponseError } from '@/utils/responseError'
import { generateIotToken } from '@/utils/jwt'
import { getConfig } from '@/config/env'

export const claimNewDevice = async (userId: string, uuid: string, deviceName: string) => {
  const config = getConfig()
  
  // 1. Cek apakah UUID sudah diklaim orang lain
  const existing = await deviceRepo.findDeviceByUuid(uuid)
  if (existing) {
    throw new ResponseError(400, 'Perangkat ini sudah terdaftar di akun lain.')
  }

  // 2. Daftarkan perangkat baru
  const deviceId = crypto.randomUUID()
  const newDevice = await deviceRepo.insertDevice({
    id: deviceId,
    uuid: uuid,
    userId: userId,
    deviceName: deviceName,
    tokenVersion: 1, // Set versi awal token menjadi 1
    status: 'online'
  })

  // 3. Generate Token Permanen (API Key) untuk ESP32
  const apiKey = await generateIotToken(
    { userId, deviceId: newDevice.id, version: 1 },
    config.jwt.secret
  )

  return {
    device: newDevice,
    apiKey // Ini yang dikirim balik ke Web, lalu Web kirim ke ESP32 via BLE/Lokal
  }
}

export const renewDeviceToken = async (userId: string, deviceId: string) => {
  const config = getConfig()
  const device = await deviceRepo.findDeviceById(deviceId)
  
  if (!device) throw new ResponseError(404, 'Perangkat tidak ditemukan.')
  if (device.userId !== userId) throw new ResponseError(403, 'Akses ditolak.')

  // Naikkan versi token (+1)
  const newVersion = device.tokenVersion + 1
  await deviceRepo.updateDeviceData(deviceId, { tokenVersion: newVersion })

  // Generate token permanen baru dengan versi baru
  const newApiKey = await generateIotToken(
    { userId, deviceId, version: newVersion }, 
    config.jwt.secret
  )

  return { apiKey: newApiKey, version: newVersion }
}

export const recordSensor = async (data: any) => {
  const device = await deviceRepo.findDeviceById(data.deviceId)
  if (!device) throw new ResponseError(404, 'Perangkat tidak ditemukan.')

  return await deviceRepo.insertTelemetry({
    id: crypto.randomUUID(),
    deviceId: data.deviceId,
    temperature: data.temperature,
    lightLux: data.lightLux,
    noiseLevel: data.noiseLevel,
  })
}

export const getUserDevices = async (userId: string) => {
  return await deviceRepo.findDevicesByUserId(userId)
}