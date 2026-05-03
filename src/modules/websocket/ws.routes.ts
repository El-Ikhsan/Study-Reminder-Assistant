import { Hono } from 'hono'
import { deviceAuthMiddleware } from '@/middleware/auth'
import { findDeviceById } from '@/modules/device/device.repo'
import type { Bindings } from '@/config/env'
import type { TokenPayload } from '@/utils/jwt'

const ws = new Hono<{
  Bindings: Bindings
  Variables: { user: TokenPayload | any }
}>()

/**
 * PINTU MASUK WEBSOCKET IOT (ESP32 Rin-chan)
 * Menggunakan deviceAuthMiddleware (Token Permanen IoT via URL Query)
 * URL: ws://[host]/api/ws/iot?token=eyJ...
 */
ws.get('/iot', deviceAuthMiddleware, async (c) => {
  const user = c.get('user')
  const deviceId = user?.deviceId

  if (!deviceId) {
    return c.json({ success: false, message: 'Akses ditolak: Token IoT tidak valid.' }, 400)
  }

  // 1. Dapatkan ID unik Ruang Rapat (Durable Object) berdasarkan deviceId
  const roomId = c.env.DEVICE_ROOM.idFromName(deviceId)
  const roomStub = c.env.DEVICE_ROOM.get(roomId)

  // 2. Sisipkan 'role' dan 'deviceId' ke URL agar DO tahu identitas alat
  const url = new URL(c.req.url)
  url.searchParams.set('role', 'iot')
  url.searchParams.set('deviceId', deviceId)

  // 3. Teruskan request upgrade WebSocket ke Durable Object
  const request = new Request(url.toString(), c.req.raw)
  return roomStub.fetch(request)
})

/**
 * PINTU MASUK WEBSOCKET WEB (Frontend Dashboard)
 * Menggunakan authMiddleware (JWT User via URL Query)
 * URL: ws://[host]/api/ws/web?deviceId=uuid&token=eyJ...
 * 
 * Web client akan menerima data TELEMETRY_UPDATE secara real-time
 * dari perangkat IoT yang terhubung di room yang sama.
 */
ws.get('/web', async (c) => {
  // 1. Ambil token dari query string (WebSocket tidak bisa kirim header custom)
  const token = c.req.query('token')
  const deviceId = c.req.query('deviceId')

  if (!token) {
    return c.json({ success: false, message: 'Akses ditolak: Token tidak ditemukan.' }, 401)
  }
  if (!deviceId) {
    return c.json({ success: false, message: 'Parameter deviceId wajib diisi.' }, 400)
  }

  // 2. Verifikasi access token secara manual (karena WebSocket tidak bisa pakai middleware biasa)
  const { getConfig } = await import('@/config/env')
  const { verifyAccessToken } = await import('@/utils/jwt')

  const config = getConfig()
  let payload: any

  try {
    payload = await verifyAccessToken(token, config.jwt.secret)
    if (!payload) {
      return c.json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa.' }, 401)
    }
  } catch (error) {
    return c.json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa.' }, 401)
  }

  // 3. Verifikasi kepemilikan device
  const device = await findDeviceById(deviceId)
  if (!device) {
    return c.json({ success: false, message: 'Perangkat tidak ditemukan.' }, 404)
  }
  if (device.userId !== payload.userId) {
    return c.json({ success: false, message: 'Akses ditolak: Perangkat bukan milik Anda.' }, 403)
  }

  // 4. Dapatkan Durable Object room berdasarkan deviceId (room yang sama dengan IoT!)
  const roomId = c.env.DEVICE_ROOM.idFromName(deviceId)
  const roomStub = c.env.DEVICE_ROOM.get(roomId)

  // 5. Sisipkan 'role' dan 'deviceId' ke URL agar DO tahu ini client web
  const url = new URL(c.req.url)
  url.searchParams.set('role', 'web')
  url.searchParams.set('deviceId', deviceId)

  // 6. Teruskan request upgrade WebSocket ke Durable Object
  const request = new Request(url.toString(), c.req.raw)
  return roomStub.fetch(request)
})

export default ws