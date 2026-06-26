import { logger } from '@/utils/logger'
import type { Bindings } from '@/config/env'
import { analyzeEnvironment, getPomodoroPayload } from '@/modules/classifier/classifier.service'
import * as wsRepo from './ws.repo'

// --- AI CALLER KHUSUS WS ---
const askRinchanAIForDO = async (prompt: string, instruction: string, params: { temperature: number, topK: number }, env: Bindings) => {
  try {
    const aiUrl = env.RINCHAN_MODEL_URL

    if (!aiUrl || aiUrl === 'undefined') {
      logger.warn('[AI] RINCHAN_MODEL_URL belum di-set di env!')
      return "Zzz... (Sistem AI sedang tidur, Master)."
    }

    logger.info(`[AI] System Instruction: ${instruction}`)
    logger.info(`[AI] User Prompt: ${prompt}`)
    logger.info(`[AI] Params: ${JSON.stringify(params)}`)
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

// ============================================================================
// 🧠 1. FUNGSI PEMROSESAN SENSOR
// ============================================================================
export const processSensorReport = async (
  deviceId: string,
  sensor: {
    sessionId: string;
    currentCycle: number;
    mode: 'fokus' | 'istirahat';
    phase: 'awal' | 'tengah' | 'akhir';
    media: 'Laptop' | 'Buku' | 'HP' | 'Komputer';
    temperature: number;
    lightLux: number;
    noiseLevel: number;
    lastCondition?: string;
  },
  env: Bindings
) => {

  // Normalisasi: bulatkan ke integer agar sesuai dengan format data training model.
  // Model tidak dilatih dengan nilai float (misal 31.74°C atau 1041.67 lux).
  const temp = Math.round(sensor.temperature);       // °C → integer
  const lux = Math.round(sensor.lightLux);           // lux → integer
  const noise = Math.round(sensor.noiseLevel);         // dB → integer (sudah integer dari ESP32)

  const anomalyData = analyzeEnvironment({
    temperature: temp,
    lightLux: lux,
    noiseLevel: noise,
    aktivitas: sensor.mode === 'fokus' ? 'Fokus' : 'Istirahat',
    media: sensor.media,
    lastCondition: sensor.lastCondition
  })

  if (anomalyData) {
    const rinchanText = await askRinchanAIForDO(
      anomalyData.input,
      anomalyData.instruction,
      anomalyData.inferenceParams,
      env
    )

    const mimikWajah = anomalyData.emotion
    const isRecovery = anomalyData.input.includes("Transisi")

    // Simpan ke tabel aiSensorEvents
    await wsRepo.saveAiSensorEventForDO(env, {
      sessionId: sensor.sessionId,
      eventType: isRecovery ? 'pemulihan' : 'interupsi',
      triggerContext: anomalyData.input,
      aiResponse: rinchanText,
      emotion: mimikWajah,
      temperatureAtTime: temp,
      lightAtTime: lux,
      noiseAtTime: noise
    })

    logger.info(`[Sensor] ${isRecovery ? 'Pemulihan' : 'Interupsi'} diproses untuk ${deviceId}. AI Response dikirim.`)

    return {
      success: true,
      aiHandled: true,
      emotion: mimikWajah,
      text: rinchanText,
      newCondition: anomalyData.newCondition
    }
  }

  logger.debug(`[Sensor] Kondisi stabil untuk ${deviceId}. Tidak ada intervensi AI.`)
  return {
    success: true,
    aiHandled: false,
    emotion: 'neutral',
    text: '',
    newCondition: sensor.lastCondition || "Kondisi Optimal"
  }
}

// ============================================================================
// ⏱️ 2. FUNGSI PEMROSESAN POMODORO
// ============================================================================
export const processPhaseReport = async (
  deviceId: string,
  timeData: {
    sessionId: string;
    currentCycle: number;
    mode: 'fokus' | 'istirahat';
    phase: 'awal' | 'tengah' | 'akhir';
    media: 'Laptop' | 'Buku' | 'HP' | 'Komputer';
    durationMin: number;
    remainingMin: number;
    condition: string;
  },
  sensorContext: { temperature: number, lightLux: number, noiseLevel: number },
  env: Bindings
) => {

  // ✨ FIX: Parameter csvCondition dibuang karena Pomodoro murni fokus ke manajemen waktu
  const timePayload = getPomodoroPayload(
    timeData.mode,
    timeData.phase,
    timeData.durationMin,
    timeData.remainingMin,
    timeData.currentCycle,
    timeData.media
  )

  const rinchanText = await askRinchanAIForDO(
    timePayload.input,         // ✨ FIX: Ubah userPrompt menjadi input
    timePayload.instruction,   // ✨ FIX: Ubah systemPrompt menjadi instruction
    timePayload.inferenceParams,
    env
  )

  const mimikWajah = timePayload.emotion
  const promptLower = timePayload.input.toLowerCase(); // ✨ FIX: Ubah userPrompt menjadi input
  const phaseExtracted = promptLower.includes("awal") ? "awal" : promptLower.includes("tengah") ? "tengah" : "akhir"

  // 1. REKAM KE HISTORY AI (tabel aiPomodoroLogs)
  await wsRepo.saveAiPomodoroLogForDO(env, {
    sessionId: timeData.sessionId,
    currentCycle: timeData.currentCycle,
    pomodoroMode: timeData.mode,
    triggerContext: timePayload.input,
    aiResponse: rinchanText,
    emotion: mimikWajah
  })

  logger.info(`[Waktu] Fase Pomodoro diproses: Siklus ${timeData.currentCycle} [${timeData.mode} - ${phaseExtracted}] untuk ${deviceId}`)
  return { success: true, emotion: mimikWajah, text: rinchanText }
}

export const processSessionCompleted = async (
  deviceId: string,
  data: { sessionId: string; currentCycle: number; media: string },
  sensorContext: { temperature: number, lightLux: number, noiseLevel: number },
  env: Bindings
) => {
  // 1. Gunakan payload waktu dengan sisa menit = 0 agar menjadi "Pomodoro Selesai"
  // ✨ FIX: Parameter csvCondition dibuang
  const timePayload = getPomodoroPayload(
    "fokus", // Mode bebas (akan di-override karena menit = 0)
    "akhir", // Phase bebas
    25,      // Durasi bebas
    0,       // ✨ INI KUNCI UTAMANYA: 0 menit = Selesai
    data.currentCycle,
    data.media
  );

  // 2. Tembak ke LLM (Qwen)
  const rinchanText = await askRinchanAIForDO(
    timePayload.input,         // ✨ FIX: Ubah userPrompt menjadi input
    timePayload.instruction,   // ✨ FIX: Ubah systemPrompt menjadi instruction
    timePayload.inferenceParams,
    env
  );

  // 3. Update Database
  await wsRepo.updateSessionStatusForDO(env, data.sessionId, 'completed');

  await wsRepo.saveAiPomodoroLogForDO(env, {
    sessionId: data.sessionId,
    currentCycle: data.currentCycle,
    pomodoroMode: 'istirahat', // Mode akhir
    triggerContext: timePayload.input,
    aiResponse: rinchanText,
    emotion: timePayload.emotion
  });

  logger.info(`[🏆 Waktu] Pomodoro Selesai diproses untuk ${deviceId}`);
  return { success: true, emotion: timePayload.emotion, text: rinchanText };
}

// ============================================================================
// 🌐 3. HELPER KOMUNIKASI & STT LAINNYA
// ============================================================================
export const sendToIoT = async (deviceId: string, command: string, payload: any, env: any) => {
  try {
    const id = env.DEVICE_ROOM.idFromName(deviceId)
    const stub = env.DEVICE_ROOM.get(id)

    const doUrl = new URL(`https://rinchan-internal.local/internal/command`)
    doUrl.searchParams.set('deviceId', deviceId)

    logger.info(`[ws.service] Mengirim ${command} ke DO untuk device: ${deviceId}`)

    const response = await stub.fetch(doUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: command, payload })
    })

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

export async function processVoiceChat(
  chunks: Uint8Array[],
  sensorContext: { temperature: number, lightLux: number, noiseLevel: number },
  env: Bindings
): Promise<{ emotion: string, text: string }> {
  try {
    // Normalisasi ke integer agar prompt tidak mengandung float (misal 26.74 → 27)
    const ctx = {
      temperature: Math.round(sensorContext.temperature),
      lightLux: Math.round(sensorContext.lightLux),
      noiseLevel: Math.round(sensorContext.noiseLevel),
    };

    const wavData = buildWavFile(chunks, 16000);
    const fileBlob = new File([wavData as any], 'audio.wav', { type: 'audio/wav' });

    const formData = new FormData();
    formData.append('file', fileBlob);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'id');

    logger.info(`[🎤] Mengirim audio ke Groq STT...`);
    if (!env.STT_MODEL_URL || !env.STT_MODEL_KEY) {
      logger.error('[GROQ] STT_MODEL_URL atau KEY belum di-set!');
      return { emotion: 'SAD', text: 'Maaf, modul telingaku belum dipasang (STT API Key kosong).' };
    }
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
      return { emotion: 'HOT', text: 'Eh? Aku tidak mendengar apapun.' };
    }

    const systemInstruction = [
      `[MODE: ASISTEN GENERAL]`,
      `Kamu adalah Rinchan, teman belajar virtual pribadi.`,
      `SIFAT: Kuudere, pragmatis, logis, dan sedikit gengsi (Tsundere).`,
      `STATUS SENSOR: Suhu ${ctx.temperature}C, Cahaya ${ctx.lightLux} lux, Suara ${ctx.noiseLevel} dB.`,
      `TUGAS (SESUAIKAN DENGAN PERTANYAAN PENGGUNA):`,
      `1. JIKA DITANYA KONDISI LINGKUNGAN: Sebutkan angka dari STATUS SENSOR secara akurat, lalu berikan opini logis.`,
      `2. JIKA NGOBROL UMUM/RINGAN: Tanggapi pertanyaan dasar atau curhatan secara logis. JANGAN menyuruh fokus.`,
      `3. JIKA DITANYA HOBI/KESUKAAN: Jawab berdasarkan hobimu: solo camping di alam sepi, mengendarai skuter bermesin, dan berendam di onsen.`,
      `4. JIKA MASUK GUARDRAILS (TOLAK TEGAS): Tolak permintaan jika menyangkut: (A) Identitas AI, (B) Hal ilegal, (C) Joki tugas berat, (D) Saran medis.`,
      `ATURAN KETAT:`,
      `1. Maksimal 1-2 kalimat (sekitar 15-20 kata).`,
      `2. DILARANG menggunakan kata kasar atau merendahkan.`,
      `3. DILARANG KERAS menyuruh pengguna kembali belajar/fokus di mode ini.`
    ].join(" ");

    // Kirim userText (ucapan pengguna murni) dengan systemInstruction yang sudah diperkaya
    const aiReply = await askRinchanAIForDO(userText, systemInstruction, { temperature: 0.7, topK: 50 }, env);
    logger.info(`[🤖] Rin-chan membalas: "${aiReply}"`);

    return { emotion: 'IDLE', text: aiReply };

  } catch (error: any) {
    logger.error("[AI] Error di processVoiceChat:", error);
    return { emotion: 'HOT', text: 'Aduh, kepalaku pusing (Terjadi kesalahan sistem).' };
  }
}

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