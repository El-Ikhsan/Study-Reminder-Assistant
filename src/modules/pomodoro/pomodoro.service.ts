import { logger } from '@/utils/logger'
import type { Bindings } from '@/config/env'
import { analyzeEnvironment, analyzeTimePhase, type TimeCondition } from '@/modules/classifier/classifier.service'
import * as pomodoroRepo from './pomodoro.repo' 
import { sendToIoT } from '@/modules/websocket/ws.service'

// Tambahkan env: Bindings sebagai parameter keempat
const askRinchanAI = async (prompt: string, instruction: string, params: { temperature: number, topK: number }, env: Bindings) => {
  try {
    // ✨ PERBAIKAN: Ambil langsung dari env bawaan DO, lupakan getConfig()
    const aiUrl = env.RINCHAN_MODEL_URL 
    
    if (!aiUrl || aiUrl === 'undefined') {
      logger.warn('[AI] RINCHAN_MODEL_URL belum di-set di env!')
      return "Zzz... (Sistem AI sedang tidur, Master)."
    }

    logger.info(`[AI] Meminta respons Rin-chan untuk: ${prompt}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        system_instruction: instruction,
        temperature: params.temperature,
        top_k: params.topK
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API AI membalas dengan status: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json() as any
    return data.ai_response || "Rin-chan tidak tahu harus bilang apa..."
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      logger.error('[AI] Request ke Rin-chan Timeout! AI mungkin sedang mati.')
      return "Zzz... (Koneksi ke otak Rin-chan terputus)."
    }
    logger.error(`[AI] Koneksi ke Model AI gagal: ${error.message}`)
    return "Zzz... (Sistem pakar sedang offline)." 
  }
}

// ==========================================
// 🍅 1. START POMODORO (Dipanggil Web API)
// ==========================================
export const startSession = async (deviceId: string, recipe: any, env: Bindings) => {
  const sessionId = crypto.randomUUID()

  await pomodoroRepo.createSession({
    id: sessionId,
    deviceId: deviceId,
    focusDuration: recipe.focusDuration,
    restDuration: recipe.breakDuration,
    targetCycles: recipe.cycles,
    condition: (recipe.mode || 'normal') as 'normal' | 'marathon' | 'deadline',
    currentCycle: recipe.currentCycle || 1,
    currentMode: (recipe.currentMode || 'fokus') as 'fokus' | 'istirahat',
    currentPhase: (recipe.currentPhase || 'awal') as 'awal' | 'tengah' | 'akhir',
    status: (recipe.status || 'running') as 'running' | 'paused' | 'completed' | 'cancelled'
  })

  await sendToIoT(deviceId, "CMD_START_POMODORO", { sessionId, ...recipe }, env)

  logger.info(`Sesi Pomodoro [${sessionId}] dimulai untuk perangkat ${deviceId}`)
  return { sessionId, message: 'Data konfigurasi berhasil dikirim ke perangkat IoT.' }
}

// ==========================================
// 🛑 2. STOP SESSION (Dipanggil Web API)
// ==========================================
export const stopSession = async (sessionId: string, deviceId: string, env: Bindings) => {
  await pomodoroRepo.updateSessionStatus(sessionId, 'completed')

  try {
    await sendToIoT(deviceId, "CMD_STOP_POMODORO", {}, env)
    logger.info(`Perintah stop berhasil dikirim ke perangkat ${deviceId}`)
  } catch (error) {
    logger.warn(`Perangkat ${deviceId} offline saat instruksi stop dikirim. Sesi dihentikan di database.`, error)
  }

  return { success: true, message: 'Sesi Pomodoro berhasil dihentikan.' }
}

// ==========================================
// 🌡️ 3. PROCESS SENSOR UNTUK AI (Dipanggil DO WebSocket)
// ==========================================
export const processSensorReportForAI = async (
  deviceId: string, 
  sensor: {
    sessionId: string;
    currentCycle: number;                    // ✨ Wajib ada
    mode: 'fokus' | 'istirahat';             // ✨ Wajib ada
    phase: 'awal' | 'tengah' | 'akhir';      // ✨ Wajib ada
    temperature: number;
    lightLux: number;
    noiseLevel: number;
  }, 
  env: Bindings
) => {
  const anomalies = analyzeEnvironment(sensor)

  if (anomalies.length > 0) {
    let aiResponses: string[] = []

    for (const payload of anomalies) {
      const rinchanText = await askRinchanAI(payload.input, payload.instruction, payload.inferenceParams, env)
      aiResponses.push(rinchanText)
    }

    const finalMessage = aiResponses.join(' ')
    const mimikWajah = anomalies[0].emotion

    // ✨ Simpan ke Single Source of Truth dengan data super lengkap!
    await pomodoroRepo.saveRinchanLog(env, {
      deviceId: deviceId,
      sessionId: sensor.sessionId, 
      currentCycle: sensor.currentCycle,      // ✨ Disuntikkan ke Log
      pomodoroMode: sensor.mode,              // ✨ Disuntikkan ke Log
      timePhase: sensor.phase,                // ✨ Disuntikkan ke Log
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
// ⏱️ 4. PROCESS TIME PHASE (Dipanggil DO WebSocket)
// ==========================================
export const processTimePhaseReport = async (
  sessionId: string, 
  deviceId: string, 
  currentCycle: number, // Dari ESP32
  mode: 'fokus' | 'istirahat', 
  durationMin: number, 
  remainingMin: number, 
  condition: TimeCondition,
  env: Bindings
) => {
  const timeData = analyzeTimePhase(mode, durationMin, remainingMin, condition)
  
  const rinchanText = await askRinchanAI(timeData.descriptor, timeData.instruction, timeData.inferenceParams, env)
  const mimikWajah = timeData.emotion

  const phaseExtracted = timeData.descriptor.includes("awal") ? "awal" : timeData.descriptor.includes("tengah") ? "tengah" : "akhir"

  // ✨ 1. UPDATE STATE UNTUK DASHBOARD WEB (Cepat & Real-time)
  await pomodoroRepo.updateSessionProgress(env, sessionId, currentCycle, mode, phaseExtracted)

  // ✨ 2. REKAM KE HISTORY AI (Single Source of Truth Sejarah AI)
  await pomodoroRepo.saveRinchanLog(env, {
    deviceId: deviceId,
    sessionId: sessionId,
    currentCycle: currentCycle,
    pomodoroMode: mode,
    timePhase: phaseExtracted,
    triggerContext: timeData.descriptor,
    aiResponse: rinchanText,
    emotion: mimikWajah
  })

  logger.info(`Fase Pomodoro diproses: Siklus ${currentCycle} [${mode} - ${phaseExtracted}] untuk ${deviceId}`)
  return { success: true, emotion: mimikWajah, text: rinchanText }
}
