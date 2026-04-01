import { saveTelemetryAndRollingLimit } from '@/modules/sensor/sensor.repo'


// Bikin tipe data untuk KTP - HANYA IOT
type SessionAttachment = { role: 'iot', deviceId: string }

export class DeviceRoom {
  state: DurableObjectState
  env: any

  constructor(state: DurableObjectState, env: any) {
    this.state = state
    this.env = env 
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('deviceId')
    
    // Paksa role hanya jadi 'iot'
    const role: 'iot' = 'iot'

    console.log(`[DO] Request masuk - Role: ${role}, DeviceId: ${deviceId}`)

    if (request.method === 'POST' && url.pathname.endsWith('/internal/command')) {
      if (!deviceId) return new Response('Missing deviceId', { status: 400 })
      
      const body = await request.text() 
      let isDelivered = false

      const sockets = this.state.getWebSockets()
      
      for (const ws of sockets) {
        const data = ws.deserializeAttachment() as SessionAttachment | null
        if (data && data.role === 'iot' && data.deviceId === deviceId) {
          ws.send(body)
          isDelivered = true
        }
      }

      return new Response(JSON.stringify({ 
        success: isDelivered, 
        message: isDelivered ? 'Perintah tersampaikan' : 'Rin-chan offline'
      }), { 
        status: isDelivered ? 200 : 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // ==========================================
    // ✨ 2. PINTU MASUK WEBSOCKET
    // ==========================================
    if (request.headers.get('Upgrade') === 'websocket') {
      if (!deviceId) {
        console.error("[DO] Koneksi ditolak: DeviceId kosong")
        return new Response('Missing deviceId', { status: 400 })
      }
      
      const pair = new WebSocketPair()
      const client = pair[0]
      const server = pair[1]

      try {
        server.serializeAttachment({ role, deviceId })
        this.state.acceptWebSocket(server)

        return new Response(null, {
          status: 101,
          webSocket: client,
        })
      } catch (err) {
        console.error("[DO] Gagal inisialisasi WebSocket:", err)
        return new Response('Internal Error', { status: 500 })
      }
    }

    return new Response('Not Found', { status: 404 })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
        const attachment = ws.deserializeAttachment() as SessionAttachment | null
        if (!attachment) return

        if (typeof message === 'string' && message === 'ping') {
            ws.send('pong')
            return
        }

        if (typeof message === 'string' && attachment.role === 'iot') {
            const data = JSON.parse(message)
            if (data.type === 'TELEMETRY_UPDATE') {
                
                // KUNCI JAWABAN: Lempar this.env ke dalam repo!
                await saveTelemetryAndRollingLimit(this.env, {
                    deviceId: attachment.deviceId,
                    temperature: data.payload.temperature,
                    lightLux: data.payload.lightLux,
                    noiseLevel: data.payload.noiseLevel
                })
                
                console.log(`[DO] Telemetri WS dari ${attachment.deviceId} berhasil disimpan ke D1`)
            }
        }
    } catch (e: any) {
        // Biar error database-nya ketahuan jelas di terminal Wrangler
        console.error("[DO] Error DB/Parsing di webSocketMessage:", e.message || e)
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    console.log(`[DO] WebSocket ditutup: ${code} - ${reason}`)
  }      

  async webSocketError(ws: WebSocket, error: any) {
    console.error("WebSocket Error:", error)
  }
}