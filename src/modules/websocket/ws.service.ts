import { logger } from '@/utils/logger'
import type { Bindings } from '@/config/env'
import { analyzeEnvironment, analyzeTimePhase, type TimeCondition } from '@/modules/classifier/classifier.service'
import * as wsRepo from './ws.repo'

// --- AI CALLER KHUSUS WS ---
const askRinchanAIForDO = async (prompt: string, instruction: string, params: { temperature: number, topK: number }, env: Bindings) => {
  try {
    const aiUrl = env.RINCHAN_MODEL_URL 
    
    if (!aiUrl || aiUrl === 'undefined') {
      logger.warn('[AI] RINCHAN_MODEL_URL belum di-set di env!')
      return "Zzz... (Sistem AI sedang tidur, Master)."
    }

    logger.info(`[AI] Meminta respons Rin-chan untuk: ${prompt}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

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

export const processSensorReport = async (
  deviceId: string, 
  sensor: {
    sessionId: string;
    currentCycle: number;                    
    mode: 'fokus' | 'istirahat';             
    phase: 'awal' | 'tengah' | 'akhir';      
    temperature: number;
    lightLux: number;
    noiseLevel: number;
  }, 
  env: Bindings
) => {
  const anomalyData = analyzeEnvironment(sensor)

  if (anomalyData) {
    // 1. Tembak AI cukup 1 kali dengan input tunggal
    const rinchanText = await askRinchanAIForDO(
      anomalyData.input, 
      anomalyData.instruction, 
      anomalyData.inferenceParams, 
      env
    )

    const mimikWajah = anomalyData.emotion

    // 2. Simpan ke database dengan rapi
    await wsRepo.saveRinchanLogForDO(env, {
      deviceId: deviceId,
      sessionId: sensor.sessionId, 
      currentCycle: sensor.currentCycle,      
      pomodoroMode: sensor.mode,              
      timePhase: sensor.phase,                
      triggerContext: anomalyData.input,      // ✨ FIX: Hanya simpan string input-nya
      aiResponse: rinchanText,                // ✨ FIX: Langsung simpan hasil teks AI
      emotion: mimikWajah,                    // ✨ FIX: Ambil dari anomalyData
      temperatureAtTime: sensor.temperature,
      lightAtTime: sensor.lightLux,
      noiseAtTime: sensor.noiseLevel
    })

    logger.info(`Sensor anomali diproses untuk ${deviceId}. AI Response dikirim.`)
    return { success: true, aiHandled: true, emotion: mimikWajah, text: rinchanText }
  }

  logger.debug(`Sensor normal untuk ${deviceId}. Tidak ada intervensi AI.`)
  return { success: true, aiHandled: false, emotion: 'neutral', text: 'Kondisi lingkungan normal.' }
}

export const processPhaseReport = async (
  sessionId: string, 
  deviceId: string, 
  currentCycle: number, 
  mode: 'fokus' | 'istirahat', 
  durationMin: number, 
  remainingMin: number, 
  condition: TimeCondition,
  env: Bindings
) => {
  const timeData = analyzeTimePhase(mode, durationMin, remainingMin, condition)
  
  const rinchanText = await askRinchanAIForDO(timeData.descriptor, timeData.instruction, timeData.inferenceParams, env)
  const mimikWajah = timeData.emotion

  const phaseExtracted = timeData.descriptor.includes("awal") ? "awal" : timeData.descriptor.includes("tengah") ? "tengah" : "akhir"

  //  1. UPDATE STATE UNTUK DASHBOARD WEB (Cepat & Real-time)
  await wsRepo.updateSessionProgressForDO(env, sessionId, currentCycle, mode, phaseExtracted)

  //  2. REKAM KE HISTORY AI (Single Source of Truth Sejarah AI)
  await wsRepo.saveRinchanLogForDO(env, {
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

export async function processVoiceChat(chunks: Uint8Array[], env: Bindings): Promise<{ emotion: string, text: string }> {
    try {
        // 1. JAHIT AUDIO (Raw PCM -> WAV)
        const wavData = buildWavFile(chunks, 16000);
        const fileBlob = new File([wavData as any], 'audio.wav', { type: 'audio/wav' });

        const formData = new FormData();
        formData.append('file', fileBlob);
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'id'); // Paksa Bahasa Indonesia agar sangat cepat

        logger.info(`[🎤] Mengirim audio ke Groq STT...`);


        const sttRes = await fetch(env.STT_MODEL_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.STT_MODEL_KEY}` },
            body: formData
        });

        if (!sttRes.ok) {
            const errText = await sttRes.text();
            logger.error(`[GROQ API ERROR] ${sttRes.status} - ${errText}`);
            return { emotion: 'HOT', text: 'Maaf, telingaku sedang berdengung (Sistem Groq sibuk).' };
        }

        const sttResponse = (await sttRes.json()) as { text: string };
        const userText = sttResponse.text?.trim();
        logger.info(`[🗣️] User berkata: "${userText}"`);

        if (!userText) {
            return { emotion: 'SURPRISED', text: 'Eh? Aku tidak mendengar apapun.' };
        }

        // 3. LEMPAR KE OTAK RINCHAN (LLM)
        const systemInstruction = "Kamu adalah Rinchan, teman yang tenang, pendiam (kuudere), dan selalu menghemat energi. Mode General: Berikan tanggapan logis, singkat, dan praktis untuk obrolan atau keluhan sehari-hari. Pengecualian: Jika topik berkaitan dengan hobimu (seperti camping, alam, buku, atau touring solo), berikan penjelasan yang lebih detail dan sedikit antusias. Batasan: Jika ditanya hal rumit, berat, akademis, medis, atau hukum, tolaklah dengan santai dan datar dengan alasan malas mikir, pusing, atau suruh cari ahlinya. Jika diminta hal berbahaya, ilegal, atau tidak senonoh, tolaklah dengan tegas namun tetap dengan nada datar dan dingin.";
        
        const aiReply = await askRinchanAIForDO(userText, systemInstruction, { temperature: 0.7, topK: 0 }, env);
        logger.info(`[🤖] Rin-chan membalas: "${aiReply}"`);

        // Sementara kita set default mimik wajah 'happy' atau 'listening'
        // (Nanti LLM-mu bisa diatur agar membalas dengan JSON yang berisi emosi dinamis)
        return { emotion: 'COLD', text: aiReply };

    } catch (error: any) {
        logger.error("[AI] Error di processVoiceChat:", error);
        return { emotion: 'HOT', text: 'Aduh, kepalaku pusing (Terjadi kesalahan sistem).' };
    }
}

// ==========================================
// 🛠️ HELPER: PENJAHIT HEADER WAV
// ==========================================
function buildWavFile(chunks: Uint8Array[], sampleRate: number): Uint8Array {
    let totalLength = 0;
    for (const chunk of chunks) totalLength += chunk.length;

    const wavBuffer = new Uint8Array(44 + totalLength);
    const view = new DataView(wavBuffer.buffer);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + totalLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, totalLength, true);

    let offset = 44;
    for (const chunk of chunks) {
        wavBuffer.set(chunk, offset);
        offset += chunk.length;
    }

    return wavBuffer;
}