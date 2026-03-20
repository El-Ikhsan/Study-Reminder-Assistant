import { Hono } from 'hono'
import { authMiddleware, deviceAuthMiddleware } from '@/middleware/auth'
import type { Bindings } from '@/config/env'
import type { TokenPayload } from '@/utils/jwt'

const ws = new Hono<{
  Bindings: Bindings
  Variables: { user: TokenPayload | any }
}>()

/**
 * 🌐 PINTU MASUK WEB DASHBOARD
 * Menggunakan authMiddleware (Token User)
 * URL: ws://localhost:8787/api/ws/web/dev-1234-5678
 */
ws.get('/web/:deviceId', authMiddleware, async (c) => {
  const deviceId = c.req.param('deviceId')
  
  // Dapatkan ID unik untuk Ruang Rapat berdasarkan deviceId
  const roomId = c.env.DEVICE_ROOM.idFromName(deviceId)
  const roomStub = c.env.DEVICE_ROOM.get(roomId)

  // Ubah URL untuk memberi tahu Ruangan bahwa ini adalah 'web'
  const url = new URL(c.req.url)
  url.searchParams.set('role', 'web')
  url.searchParams.set('deviceId', deviceId)

  // Teruskan request upgrade WebSocket ke Durable Object
  const request = new Request(url.toString(), c.req.raw)
  return roomStub.fetch(request)
})

/**
 * 🛰️ PINTU MASUK IOT (ESP32)
 * Menggunakan deviceAuthMiddleware (Token Permanen IoT)
 * URL: ws://localhost:8787/api/ws/iot?token=eyJ...
 */
ws.get('/iot', deviceAuthMiddleware, async (c) => {
  const user = c.get('user')
  const deviceId = user.deviceId // Didapat otomatis dari payload Token IoT!

  if (!deviceId) {
    return c.json({ success: false, message: 'Invalid IoT Token' }, 400)
  }

  // Dapatkan ID unik Ruang Rapat (Pasti sama dengan yang didapat Web!)
  const roomId = c.env.DEVICE_ROOM.idFromName(deviceId)
  const roomStub = c.env.DEVICE_ROOM.get(roomId)

  // Ubah URL untuk memberi tahu Ruangan bahwa ini adalah 'iot'
  const url = new URL(c.req.url)
  url.searchParams.set('role', 'iot')
  url.searchParams.set('deviceId', deviceId)

  const request = new Request(url.toString(), c.req.raw)
  return roomStub.fetch(request)
})

export default ws