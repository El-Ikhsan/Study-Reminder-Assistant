import * as deviceRepo from './device.repo'
import { ResponseError } from '@/utils/responseError'
import { generateIotToken } from '@/utils/jwt'
import { getConfig } from '@/config/env'

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

  // Update lastSeen setiap kali device polling
  await deviceRepo.updateDeviceLastSeen(device.id)

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