import { logger } from '@/utils/logger'
import * as wsService from './ws.service'
import * as wsRepo from './ws.repo'

type SessionAttachment = { role: 'iot', deviceId: string }


export class DeviceRoom {
  state: DurableObjectState
  env: any
  audioStreams: Map<string, Uint8Array[]> = new Map()

  constructor(state: DurableObjectState, env: any) { this.state = state; this.env = env }

  async fetch(request: Request) {
    const url = new URL(request.url)
    const deviceId = url.searchParams.get('deviceId')

    if (request.method === 'POST' && url.pathname.endsWith('/internal/command')) {
      if (!deviceId) return new Response('Missing deviceId', { status: 400 })
      const body = await request.text() 
      let isDelivered = false
      for (const ws of this.state.getWebSockets()) {
        const data = ws.deserializeAttachment() as SessionAttachment | null
        if (data && data.role === 'iot' && data.deviceId === deviceId) { ws.send(body); isDelivered = true }
      }
      return new Response(JSON.stringify({ success: isDelivered }), { status: isDelivered ? 200 : 404 })
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      if (!deviceId) return new Response('Missing deviceId', { status: 400 })
      const pair = new WebSocketPair()
      try {
        pair[1].serializeAttachment({ role: 'iot', deviceId })
        this.state.acceptWebSocket(pair[1])
        return new Response(null, { status: 101, webSocket: pair[0] })
      } catch (err) { return new Response('Internal Error', { status: 500 }) }
    }
    return new Response('Not Found', { status: 404 })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
        const attachment = ws.deserializeAttachment() as SessionAttachment | null
        if (!attachment) return

        // ==========================================
        // 🎤 PENERIMA DATA MENTAH (BINARY AUDIO CHUNKS)
        // ==========================================
        if (typeof message !== 'string') {
            const chunks = this.audioStreams.get(attachment.deviceId)
            if (chunks) {
                chunks.push(new Uint8Array(message))
            }
            return // Keluar, jangan teruskan ke parsing JSON!
        }
        if (message === 'ping') { ws.send('pong'); return }

        if (attachment.role === 'iot') {
            const data = JSON.parse(message)
            switch (data.type) {
                case 'TELEMETRY_UPDATE':
                    await wsRepo.saveTelemetryForDO(this.env, { deviceId: attachment.deviceId, ...data.payload })
                    break
                case 'SENSOR_REPORT_FOR_AI':
                    const sensorRes = await wsService.processSensorReport(attachment.deviceId, data.payload, this.env)
                    if (sensorRes.aiHandled) ws.send(JSON.stringify({ type: 'AI_RESPONSE', payload: { emotion: sensorRes.emotion, text: sensorRes.text } }))
                    break
                case 'PHASE_REPORT':
                    const phaseRes = await wsService.processPhaseReport(data.payload.sessionId, attachment.deviceId, data.payload.currentCycle, data.payload.mode, data.payload.durationMin, data.payload.remainingMin, data.payload.condition, this.env)
                    ws.send(JSON.stringify({ type: 'AI_RESPONSE', payload: { emotion: phaseRes.emotion, text: phaseRes.text } }))
                    break
                case 'SESSION_COMPLETED':
                    await wsRepo.updateSessionStatusForDO(this.env, data.payload.sessionId, 'completed')
                    ws.send(JSON.stringify({ type: 'AI_RESPONSE', payload: { emotion: 'happy', text: 'Kerja bagus. Kamu berhasil bertahan sampai akhir.' } }))
                    break
                case 'SESSION_STOPPED':
                    await wsRepo.updateSessionStatusForDO(this.env, data.payload.sessionId, 'cancelled')
                    break
                case 'AUDIO_STREAM_START':
                    logger.info(`[🎤] Membuka buffer audio untuk device: ${attachment.deviceId}`);
                    this.audioStreams.set(attachment.deviceId, []);
                    break;
                case 'AUDIO_STREAM_END':
                    logger.info(`[🎤] Menutup buffer audio dan memulai transkripsi & pemikiran AI...`);
                    const chunks = this.audioStreams.get(attachment.deviceId);
                    
                    if (chunks && chunks.length > 0) {
                        
                        // ✨ Panggil fungsi raksasa yang baru kita buat
                        const chatResult = await wsService.processVoiceChat(chunks, this.env);

                        // Kirim jawaban AI langsung ke ESP32
                        ws.send(JSON.stringify({ 
                            type: 'AI_RESPONSE', 
                            payload: { 
                                emotion: chatResult.emotion, 
                                text: chatResult.text 
                            } 
                        }));
                    }
                    
                    this.audioStreams.delete(attachment.deviceId);
                    break;
            }
        }
    } catch (e: any) { logger.error("[DO] Error:", e.message || e) }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
      // Bersihkan memori jika device tiba-tiba disconnect saat merekam
      const attachment = ws.deserializeAttachment() as SessionAttachment | null
      if (attachment) this.audioStreams.delete(attachment.deviceId);
  }     
  async webSocketError(ws: WebSocket, error: any) {}
}
