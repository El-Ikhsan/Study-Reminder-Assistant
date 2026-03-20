import { saveTelemetryAndRollingLimit } from '@/modules/sensor/sensor.repo'
import { logger } from '@/utils/logger'

export class DeviceRoom {
  state: DurableObjectState
  sessions: Map<WebSocket, { role: 'iot' | 'web', deviceId: string }>

  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.sessions = new Map()
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('deviceId')

    // ==========================================
    // 1. JEMBATAN INTERNAL: Menerima perintah HTTP dari Hono Service
    // ==========================================
    if (request.method === 'POST' && url.pathname.endsWith('/internal/command')) {
      if (!deviceId) return new Response('Missing deviceId', { status: 400 })
      
      const body = await request.text() 
      let isDelivered = false

      for (const [ws, data] of this.sessions.entries()) {
        if (data.role === 'iot' && data.deviceId === deviceId) {
          ws.send(body)
          isDelivered = true
        }
      }

      return new Response(JSON.stringify({ 
        success: isDelivered, 
        message: isDelivered ? 'Perintah tersampaikan ke Rin-chan' : 'Rin-chan sedang offline/tidur'
      }), { 
        status: isDelivered ? 200 : 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ==========================================
    // ✨ 2. PINTU MASUK WEBSOCKET (Dari Postman / ESP32)
    // ==========================================
    if (request.headers.get('Upgrade') === 'websocket') {
      if (!deviceId) return new Response('Missing deviceId', { status: 400 })
      
      // Ambil role dari query (default: 'iot' jika tidak ada)
      const role = (url.searchParams.get('role') as 'iot' | 'web') || 'iot'

      // Buat sepasang WebSocket (Satu untuk DO, satu dikembalikan ke Postman)
      const webSocketPair = new WebSocketPair()
      const [client, server] = Object.values(webSocketPair)

      // Suruh DO menerima koneksi di sisi server
      this.state.acceptWebSocket(server)

      // Daftarkan ke buku tamu (Map sessions)
      this.sessions.set(server, { role, deviceId })

      // Wajib! Kembalikan client-side WebSocket dengan status 101 Switching Protocols
      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    }

    // ==========================================
    // 3. FALLBACK: Jika ada request nyasar
    // ==========================================
    return new Response('Not Found', { status: 404 })
  }
  // ✨ Fungsi ini dipanggil otomatis setiap ada pesan masuk dari klien
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const sender = this.sessions.get(ws)
    if (!sender) return

    // 1. Tangani Ping
    if (typeof message === 'string' && message === 'ping') {
      ws.send('pong')
      return 
    }

    // 2. Tangani Data JSON dari IoT (Telemetri 30 Detik)
    if (typeof message === 'string' && sender.role === 'iot') {
        const data = JSON.parse(message)
        if (data.type === 'TELEMETRY_UPDATE') {
            await saveTelemetryAndRollingLimit({
              deviceId: sender.deviceId,
              temperature: data.payload.temperature,
              lightLux: data.payload.lightLux,
              noiseLevel: data.payload.noiseLevel
            })
            logger.debug('Telemetri WS berhasil disimpan')
            return
        }
    }
  }      

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    this.sessions.delete(ws)
  }

  async webSocketError(ws: WebSocket, error: any) {
    this.sessions.delete(ws)
  }
}