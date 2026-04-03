import { saveTelemetryAndRollingLimit } from '@/modules/sensor/sensor.repo'
import { processSensorReportForAI, processTimePhaseReport } from '@/modules/pomodoro/pomodoro.service'
import { updateSessionStatusForDO } from '@/modules/pomodoro/pomodoro.repo' // ✨ IMPORT INI DITAMBAHKAN
import { logger } from '@/utils/logger'

// Tipe data untuk KTP - HANYA IOT
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
    const role: 'iot' = 'iot'

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

    //  PINTU MASUK WEBSOCKET
    if (request.headers.get('Upgrade') === 'websocket') {
      if (!deviceId) {
        logger.warn("[DO] Koneksi ditolak: DeviceId kosong")
        return new Response('Missing deviceId', { status: 400 })
      }
      
      const pair = new WebSocketPair()
      const client = pair[0]
      const server = pair[1]

      try {
        server.serializeAttachment({ role, deviceId })
        this.state.acceptWebSocket(server)
        return new Response(null, { status: 101, webSocket: client })
      } catch (err) {
        logger.error("[DO] Gagal inisialisasi WebSocket:", err)
        return new Response('Internal Error', { status: 500 })
      }
    }

    return new Response('Not Found', { status: 404 })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
        const attachment = ws.deserializeAttachment() as SessionAttachment | null
        if (!attachment || typeof message !== 'string') return

        if (message === 'ping') {
            ws.send('pong')
            return
        }

        if (attachment.role === 'iot') {
            const data = JSON.parse(message)
            
            // ROUTER WEBSOCKET ESP32
            switch (data.type) {
                
                case 'TELEMETRY_UPDATE':
                    await saveTelemetryAndRollingLimit(this.env, {
                        deviceId: attachment.deviceId,
                        temperature: data.payload.temperature,
                        lightLux: data.payload.lightLux,
                        noiseLevel: data.payload.noiseLevel
                    })
                    break

                case 'SENSOR_REPORT_FOR_AI':
                    logger.info(`[WS] Menerima request AI (Sensor) dari ${attachment.deviceId}`)
                    const sensorRes = await processSensorReportForAI(attachment.deviceId, data.payload, this.env)
                    
                    if (sensorRes.aiHandled) {
                        ws.send(JSON.stringify({
                            type: 'AI_RESPONSE',
                            payload: { emotion: sensorRes.emotion, text: sensorRes.text }
                        }))
                    }
                    break

                case 'PHASE_REPORT':
                    logger.info(`[WS] Menerima request AI (Perubahan Fase Waktu) dari ${attachment.deviceId}`)
                    const phaseRes = await processTimePhaseReport(
                        data.payload.sessionId, attachment.deviceId, data.payload.currentCycle,
                        data.payload.mode, data.payload.durationMin, data.payload.remainingMin, 
                        data.payload.condition, this.env
                    )
                    
                    ws.send(JSON.stringify({
                        type: 'AI_RESPONSE',
                        payload: { emotion: phaseRes.emotion, text: phaseRes.text }
                    }))
                    break

                case 'SESSION_COMPLETED':
                    logger.info(`[WS] Sesi Pomodoro ${data.payload.sessionId} selesai natural dari ${attachment.deviceId}`)
                    await updateSessionStatusForDO(this.env, data.payload.sessionId, 'completed')
                    ws.send(JSON.stringify({
                        type: 'AI_RESPONSE',
                        payload: { emotion: 'happy', text: 'Kerja bagus, Master. Kamu berhasil bertahan sampai akhir.' }
                    }))
                    break

                case 'SESSION_STOPPED':
                    logger.info(`[WS] Sesi Pomodoro ${data.payload.sessionId} dihentikan manual dari ${attachment.deviceId}`)
                    await updateSessionStatusForDO(this.env, data.payload.sessionId, 'cancelled')
                    break

                default:
                    logger.warn(`[DO] Tipe pesan tidak dikenal dari IoT: ${data.type}`)
            }
        }
    } catch (e: any) {
        logger.error("[DO] Error di webSocketMessage:", e.message || e)
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    logger.info(`[DO] WebSocket ditutup: ${code} - ${reason}`)
  }      

  async webSocketError(ws: WebSocket, error: any) {
    logger.error("WebSocket Error:", error)
  }
}