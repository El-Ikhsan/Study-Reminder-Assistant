import * as sensorRepo from './sensor.repo'
import { ResponseError } from '@/utils/responseError'

export const fetchDeviceTelemetry = async (deviceId: string) => {
  if (!deviceId) {
    throw new ResponseError(400, 'Device ID tidak valid.')
  }
  
  const data = await sensorRepo.getTelemetryHistory(deviceId)
  return data
}