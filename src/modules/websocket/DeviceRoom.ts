import { logger } from '@/utils/logger'
import * as wsService from './ws.service'
import * as wsRepo from './ws.repo'

type SessionAttachment = { role: 'iot' | 'web', deviceId: string }


export class DeviceRoom {
  state: DurableObjectState
  env: any
  audioStreams: Map<string, Uint8Array[]> = new Map()
  latestSensor: { temperature: number, lightLux: number, noiseLevel: number } = { temperature: 0, lightLux: 0, noiseLevel: 0 }

  constructor(state: DurableObjectState, env: any) { this.state = state; this.env = env }

  // ==========================================
  // 🔧 HELPER: Broadcast ke semua Web Client
  // ==========================================
  private broadcastToWeb(deviceId: string, message: string) {
    for (const ws of this.state.getWebSockets()) {
      const data = ws.deserializeAttachment() as SessionAttachment | null
      if (data && data.role === 'web' && data.deviceId === deviceId) {
        try { ws.send(message) } catch (_) { /* client mungkin sudah disconnect */ }
      }
    }
  }

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
      const role = (url.searchParams.get('role') || 'iot') as 'iot' | 'web'
      const pair = new WebSocketPair()
      try {
        pair[1].serializeAttachment({ role, deviceId })
        this.state.acceptWebSocket(pair[1])
        logger.info(`[DO] WebSocket ${role} terhubung untuk device: ${deviceId}`)
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
            this.latestSensor = {
              temperature: data.payload.temperature,
              lightLux: data.payload.lightLux,
              noiseLevel: data.payload.noiseLevel
            };
            // 📡 Broadcast data telemetri ke semua Web Client yang terhubung
            // (Catatan: wsRepo.saveTelemetryForDO sudah dihapus sesuai schema baru)
            this.broadcastToWeb(attachment.deviceId, JSON.stringify({
              type: 'TELEMETRY_UPDATE',
              payload: data.payload
            }))
            break

          case 'SENSOR_REPORT_FOR_AI':
            const sensorRes = await wsService.processSensorReport(attachment.deviceId, data.payload, this.env)

            if (sensorRes.aiHandled) {
              // 1. KONDISI BERUBAH: Kirim teks AI dan update memori
              ws.send(JSON.stringify({
                type: 'AI_RESPONSE',
                payload: {
                  emotion: sensorRes.emotion,
                  text: sensorRes.text,
                  newCondition: sensorRes.newCondition // ✨ WAJIB DIKIRIM KE ESP32
                }
              }))
            } else {
              // 2. KONDISI SAMA: AI Diam, TAPI kita wajib update memori di ESP32
              ws.send(JSON.stringify({
                type: 'UPDATE_SENSOR_STATE',
                payload: {
                  newCondition: sensorRes.newCondition // ✨ WAJIB DIKIRIM KE ESP32
                }
              }))
            }
            break

          case 'PHASE_REPORT':
            const phaseRes = await wsService.processPhaseReport(attachment.deviceId, data.payload, this.latestSensor, this.env)
            ws.send(JSON.stringify({ type: 'AI_RESPONSE', payload: { emotion: phaseRes.emotion, text: phaseRes.text } }))
            break

          case 'SESSION_COMPLETED':
            const finishRes = await wsService.processSessionCompleted(attachment.deviceId, data.payload, this.latestSensor, this.env)
            ws.send(JSON.stringify({
              type: 'AI_RESPONSE',
              payload: { emotion: finishRes.emotion, text: finishRes.text }
            }))
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
              const chatResult = await wsService.processVoiceChat(chunks, this.latestSensor, this.env);

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

      // Web client cukup kirim 'ping' saja, tidak perlu logic lain
      // (semua data mengalir satu arah: IoT → Web)

    } catch (e: any) { logger.error("[DO] Error:", e.message || e) }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    // Bersihkan memori jika device tiba-tiba disconnect saat merekam
    const attachment = ws.deserializeAttachment() as SessionAttachment | null
    if (attachment) {
      if (attachment.role === 'iot') this.audioStreams.delete(attachment.deviceId);
      logger.info(`[DO] WebSocket ${attachment.role} terputus untuk device: ${attachment.deviceId}`)
    }
  }
  async webSocketError(ws: WebSocket, error: any) { }
}