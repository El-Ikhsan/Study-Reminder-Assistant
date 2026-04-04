import { Hono } from 'hono'
import { authMiddleware } from '@/middleware/auth'
import * as deviceController from './device.controller'


const device = new Hono()

// path for dashboard
device.post('/:id/renew', authMiddleware, deviceController.renewToken)
device.post('/claim', authMiddleware, deviceController.claimDevice)
device.get('/list', authMiddleware, deviceController.getMyDevices)
device.delete('/:deviceId', authMiddleware, deviceController.deleteDevice)
// path for device iot
device.get('/poll/:rinchan-id', deviceController.checkClaimStatus)

export default device