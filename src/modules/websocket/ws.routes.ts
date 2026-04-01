import { Hono } from 'hono'
import { deviceAuthMiddleware } from '@/middleware/auth'
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

export default ws