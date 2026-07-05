import { Hono } from 'hono'
import { authMiddleware } from '@/middleware/auth'
import * as deviceController from './device.controller'


const device = new Hono()

// path for dashboard
device.post('/:id/renew', authMiddleware, deviceController.renewToken)
device.post('/claim', authMiddleware, deviceController.claimDevice)
device.get('/list', authMiddleware, deviceController.getMyDevices)
device.patch('/:id', authMiddleware, deviceController.updateDevice)
device.delete('/:deviceId', authMiddleware, deviceController.deleteDevice)

// path for device settings (brightness & volume → IoT via WebSocket)
device.post('/settings/brightness', authMiddleware, deviceController.setBrightness)
device.post('/settings/volume', authMiddleware, deviceController.setVolume)
device.post('/settings/sensor', authMiddleware, deviceController.setSensorToggle)

// path for device iot
device.get('/poll/:deviceIotId', deviceController.checkClaimStatus)

export default device