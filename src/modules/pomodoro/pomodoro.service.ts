import { ResponseError } from '@/utils/responseError'
import { logger } from '@/utils/logger'
import type { Bindings } from '@/config/env'
import { analyzeEnvironment, analyzeTimePhase, type SensorData, type TimeCondition, type TimeMode } from '@/modules/classifier/classifier.service'
import * as pomodoroRepo from './pomodoro.repo' 
import { getConfig } from '@/config/env'


const askRinchanAI = async (prompt: string, instruction: string, params: { temperature: number, topK: number }) => {
  try {
    // ✨ LOGIKA MOCK UNTUK TESTING ALUR ✨
    logger.info(`[MOCK AI] Menerima prompt: ${prompt}`)
    
    // Kita kembalikan teks palsu yang membuktikan bahwa Classifier berhasil mengirim prompt ke sini
    return `[System Mock]: Rin-chan menerima instruksi untuk kondisi '${prompt}'. (AI asli belum nyala, Master!)`

    /* 
    --- KODE ASLI DIMATIKAN SEMENTARA ---
    const config = getConfig()
    const aiUrl = config.ai.rinchanUrl 
    
    if (!aiUrl) throw new Error('URL Model AI belum dikonfigurasi.')

    const response = await fetch(aiUrl, { ... })
    // ...
    */
  } catch (error) {
    logger.error('Koneksi ke Model AI gagal', error)
    return "Layanan sistem pakar sedang tidak dapat diakses saat ini." 
  }
}

// ==========================================
// 🤖 HELPER: PANGGIL MODEL AI FINE-TUNED
// ==========================================
// const askRinchanAI = async (prompt: string, instruction: string, params: { temperature: number, topK: number }) => {
//   try {
//     const config = getConfig()
//     const aiUrl = config.ai.rinchanUrl
    
//     const response = await fetch(aiUrl, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         prompt: prompt,
//         system_instruction: instruction,
//         temperature: params.temperature,
//         top_k: params.topK
//       })
//     })

//     if (!response.ok) {
//       throw new Error(`API Model AI membalas dengan status: ${response.status}`)
//     }
    
//     const data = await response.json() as any
//     return data.text || "..."
//   } catch (error) {
//     // Tangkap error spesifik dari koneksi AI agar mudah dilacak
//     logger.error('Koneksi ke Model AI gagal', error)
    
//     // Jangan throw ResponseError agar ESP32 tidak crash, cukup berikan string balasan fallback
//     return "Layanan sistem pakar sedang tidak dapat diakses saat ini." 
//   }
// }

// ==========================================
// 🌉 HELPER: KIRIM PESAN KE IOT VIA DURABLE OBJECT
// ==========================================
const sendToIoT = async (deviceId: string, type: string, payload: any, env: Bindings) => {
  const roomId = env.DEVICE_ROOM.idFromName(deviceId)
  const roomStub = env.DEVICE_ROOM.get(roomId)
  
  const internalRequest = new Request(`http://internal/command?deviceId=${deviceId}`, {
    method: 'POST',
    body: JSON.stringify({ type, payload })
  })

  const response = await roomStub.fetch(internalRequest)
  const result = await response.json() as any
  
  if (!result.success) {
    // Karena ini adalah validasi sistem terhadap status perangkat, kita gunakan ResponseError
    throw new ResponseError(404, `Perangkat IoT dengan ID ${deviceId} sedang tidak terhubung ke jaringan.`)
  }
  
  logger.debug(`Perintah ${type} berhasil diteruskan ke DO untuk perangkat ${deviceId}`)
  return true
}

// ==========================================
// 🍅 1. START POMODORO (Dipanggil Web)
// ==========================================
export const startSession = async (deviceId: string, recipe: any, env: Bindings) => {
  const sessionId = crypto.randomUUID()

  await pomodoroRepo.createSession({
    id: sessionId,
    deviceId: deviceId,
    focusDuration: recipe.focusDuration,
    restDuration: recipe.breakDuration,
    targetCycles: recipe.cycles,
    
    // ✨ Tegaskan tipenya dengan 'as'
    condition: (recipe.mode || 'normal') as 'normal' | 'marathon' | 'deadline',
    
    currentCycle: recipe.currentCycle || 1,
    currentMode: (recipe.currentMode || 'fokus') as 'fokus' | 'istirahat',
    currentPhase: (recipe.currentPhase || 'awal') as 'awal' | 'tengah' | 'akhir',
    status: (recipe.status || 'running') as 'running' | 'paused' | 'completed' | 'cancelled'
  })

  await sendToIoT(deviceId, "CMD_START_POMODORO", {
    sessionId,
    ...recipe
  }, env)

  logger.info(`Sesi Pomodoro [${sessionId}] dimulai untuk perangkat ${deviceId}`)
  return { sessionId, message: 'Data konfigurasi berhasil dikirim ke perangkat IoT.' }
}

// ==========================================
// 🌡️ 2. PROCESS SENSOR UNTUK AI (Dipanggil IoT via HTTP POST)
// ==========================================
export const processSensorReportForAI = async (deviceId: string, sensor: SensorData, env: Bindings) => {
  
  const anomalies = analyzeEnvironment(sensor)

  if (anomalies.length > 0) {
    let aiResponses: string[] = []

    for (const payload of anomalies) {
      const rinchanText = await askRinchanAI(payload.input, payload.instruction, payload.inferenceParams)
      aiResponses.push(rinchanText)
    }

    const finalMessage = aiResponses.join(' ')
    const mimikWajah = anomalies[0].emotion

    await pomodoroRepo.saveRinchanLogAndRollingLimit({
      deviceId: deviceId,
      triggerContext: anomalies.map(a => a.input).join(', '),
      aiResponse: finalMessage,
      emotion: mimikWajah,
      temperatureAtTime: sensor.temperature,
      lightAtTime: sensor.lightLux,
      noiseAtTime: sensor.noiseLevel
    })

    logger.info(`Sensor anomali diproses untuk ${deviceId}. AI Response dikirim.`)
    return { success: true, aiHandled: true, emotion: mimikWajah, text: finalMessage }
  }

  logger.debug(`Sensor normal untuk ${deviceId}. Tidak ada intervensi AI.`)
  return { success: true, aiHandled: false, emotion: 'neutral', text: 'Kondisi lingkungan normal.' }
}

// ==========================================
// ⏱️ 3. PROCESS TIME PHASE (Dipanggil IoT via HTTP POST)
// ==========================================
export const processTimePhaseReport = async (
  sessionId: string, 
  deviceId: string, 
  mode: TimeMode, 
  durationMin: number, 
  remainingMin: number, 
  condition: TimeCondition,
  env: Bindings
) => {
  
  const timeData = analyzeTimePhase(mode, durationMin, remainingMin, condition)
  
  const rinchanText = await askRinchanAI(timeData.descriptor, timeData.instruction, timeData.inferenceParams)
  const mimikWajah = timeData.emotion

  const phaseExtracted = timeData.descriptor.includes("awal") ? "awal" : timeData.descriptor.includes("tengah") ? "tengah" : "akhir"
  await pomodoroRepo.updateSessionPhase(sessionId, mode, phaseExtracted)

  logger.info(`Fase Pomodoro diproses: [${mode} - ${phaseExtracted}] untuk ${deviceId}`)
  return { success: true, emotion: mimikWajah, text: rinchanText }
}

// ==========================================
// 🛑 4. STOP SESSION (Dipanggil Web)
// ==========================================
export const stopSession = async (sessionId: string, deviceId: string, env: Bindings) => {
  
  await pomodoroRepo.updateSessionStatus(sessionId, 'completed')

  try {
    await sendToIoT(deviceId, "CMD_STOP_POMODORO", {}, env)
    logger.info(`Perintah stop berhasil dikirim ke perangkat ${deviceId}`)
  } catch (error) {
    // Karena kegagalan menghentikan alat tidak boleh menggagalkan fungsi stop di DB,
    // kita cukup mencatat warning (peringatan) di sistem.
    logger.warn(`Perangkat ${deviceId} offline saat instruksi stop dikirim. Sesi tetap dihentikan di database.`, error)
  }

  return { success: true, message: 'Sesi Pomodoro berhasil dihentikan.' }
}