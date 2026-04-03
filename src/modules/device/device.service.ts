import * as deviceRepo from './device.repo'
import { ResponseError } from '@/utils/responseError'
import { generateIotToken } from '@/utils/jwt'
import { getConfig } from '@/config/env'

export const checkClaimStatus = async (rinchanId: string) => {
  const config = getConfig()

  let device = await deviceRepo.findDeviceByRinchanId(rinchanId)
  
  if (!device) {
    device = await deviceRepo.insertRinchanId({
      id: crypto.randomUUID(),
      rinchanId: rinchanId,
      status: 'unclaimed',
    })
  }

  if (!device.userId) {

    return {
      status: 'waiting', 
      device: {
        rinchanId: device.rinchanId,
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
      rinchanId: device.rinchanId,
      deviceName: device.deviceName,
      deviceStatus: device.status,
    },
    apiKey: apiKey 
  }
}

export const claimNewDevice = async (userId: string, rinchanId: string, deviceName: string) => {
  
  // 1. Cek apakah UUID sudah diklaim orang lain
  const deviceData = await deviceRepo.findDeviceByRinchanId(rinchanId)
  if (!deviceData) {
    throw new ResponseError(404, 'Perangkat dengan Rinchan ID ini tidak ditemukan.')
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