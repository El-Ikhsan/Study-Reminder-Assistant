// src/modules/websocket/ws.service.ts
import { logger } from '@/utils/logger'

// ==========================================
// 🌉 JEMBATAN HTTP KE DURABLE OBJECTS (WEBSOCKET)
// ==========================================
export const sendToIoT = async (deviceId: string, command: string, payload: any, env: any) => {
  try {
    const id = env.DEVICE_ROOM.idFromName(deviceId)
    const stub = env.DEVICE_ROOM.get(id)

    // 1. Buat URL absolut yang aman untuk internal fetch DO
    const doUrl = new URL(`https://rinchan-internal.local/internal/command`)
    doUrl.searchParams.set('deviceId', deviceId)

    logger.info(`[ws.service] Mengirim ${command} ke DO untuk device: ${deviceId}`)

    // 2. Ketuk pintu DO (/internal/command)
    const response = await stub.fetch(doUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: command, payload }) 
    })

    // 3. Baca respons sebagai teks dulu untuk mencegah crash JSON
    const textResponse = await response.text()

    if (!response.ok) {
      logger.error(`[ws.service] DO menolak request. Status: ${response.status}, Balasan: ${textResponse}`)
      throw new Error(`DO Error: ${textResponse}`)
    }

    return JSON.parse(textResponse)

  } catch (error: any) {
    logger.error(`[ws.service] Gagal menyambung ke Durable Object: ${error.message}`)
    throw new Error(error.message || 'Gagal berkomunikasi dengan IoT')
  }
}