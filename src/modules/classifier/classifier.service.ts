// ============================================================================
// 🧠 RINCHAN CLASSIFIER SERVICE (V3 GGUF ARCHITECTURE - TYPESCRIPT)
// ============================================================================

export type SensorData = {
  temperature: number;
  lightLux: number;
  noiseLevel: number;
  sessionId: string;
};

export type InferencePayload = {
  systemPrompt: string;
  userPrompt: string;
  inferenceParams: {
    temperature: number;
    topK: number;
  };
  emotion: string;
};

export type TimeMode = "fokus" | "istirahat";
export type TimePhase = "awal" | "tengah" | "akhir";

// ----------------------------------------------------------------------------
// 1. KAMUS MIMIK (EMOTION MAPPING)
// ----------------------------------------------------------------------------

const SENSOR_EMOTIONS: Record<string, string[]> = {
  "Interupsi: Suhu Panas": ["HOT"],
  "Interupsi: Suhu Dingin": ["COLD"],
  "Interupsi: Suara Bising": ["NOISY"],
  "Interupsi: Cahaya Gelap": ["DARK"],
  "Interupsi: Cahaya Silau": ["GLARE"],

  // TRANSISI PEMULIHAN
  "Transisi: Suhu Panas ke Sejuk": ["IDLE", "NEUTRAL"],
  "Transisi: Suhu Panas ke Hangat": ["IDLE"],
  "Transisi: Suhu Dingin ke Sejuk": ["IDLE"],
  "Transisi: Suara Bising ke Ramai": ["IDLE"],
  "Transisi: Suara Bising ke Sunyi": ["IDLE", "NEUTRAL"],
  "Transisi: Suara Ramai ke Normal": ["IDLE"],
  "Transisi: Suara Ramai ke Sunyi": ["IDLE", "NEUTRAL"],
  "Transisi: Cahaya Gelap ke Redup": ["IDLE"],
  "Transisi: Cahaya Gelap ke Terang": ["IDLE", "NEUTRAL"],
  "Transisi: Cahaya Redup ke Terang": ["IDLE", "NEUTRAL"],
  "Transisi: Cahaya Silau ke Terang": ["IDLE", "NEUTRAL"]
};

// Map mimik waktu sekarang murni disesuaikan dengan Trigger Prompt
const TIME_EMOTIONS: Record<string, string[]> = {
  "Fase Awal Fokus": ["IDLE"],
  "Fase Pertengahan Fokus": ["IDLE"],
  "Fase Akhir Fokus": ["SURPRISED", "IDLE"], // Ekspresi terdesak/serius
  "Fase Istirahat Pendek": ["DARK", "IDLE"],
  "Fase Istirahat Panjang": ["SLEEPY"],
  "Fase Peringatan Istirahat Akhir": ["SLEEPY", "IDLE"],
  "Pomodoro Selesai": ["IDLE", "NEUTRAL"]
};

const getMimikSensor = (userPromptKey: string): string => {
  if (SENSOR_EMOTIONS[userPromptKey]) {
    const emotions = SENSOR_EMOTIONS[userPromptKey];
    return emotions[Math.floor(Math.random() * emotions.length)];
  }

  const text = userPromptKey.toLowerCase();
  if (text.includes("optimal") || text.includes("sejuk") || text.includes("sunyi")) return "IDLE";
  if (text.includes("panas")) return "HOT";
  if (text.includes("dingin")) return "COLD";
  if (text.includes("bising") || text.includes("ramai")) return "NOISY";
  if (text.includes("gelap")) return "DARK";
  if (text.includes("redup")) return "SLEEPY";
  if (text.includes("silau")) return "GLARE";

  return "UNCOMFOTABLE";
};

const getMimikWaktu = (userPromptKey: string): string => {
  const emotions = TIME_EMOTIONS[userPromptKey] || ["neutral"];
  return emotions[Math.floor(Math.random() * emotions.length)];
};

// ==========================================
// 🧠 HELPER: PENERJEMAH NILAI MENTAH KE KATA
// ==========================================
const getTempString = (temp: number) => {
  if (temp >= 31) return "Panas";
  if (temp >= 28) return "Hangat";
  if (temp >= 22) return "Sejuk";
  return "Dingin";
};

const getLightString = (lux: number) => {
  if (lux >= 700) return "Silau";
  if (lux >= 150) return "Terang";
  if (lux >= 50) return "Redup";
  return "Gelap";
};

const getNoiseString = (noise: number) => {
  if (noise >= 80) return "Bising";
  if (noise >= 65) return "Ramai";
  if (noise >= 50) return "Normal";
  return "Sunyi";
};
// ============================================================================
// 🌡️ A. DETEKTOR KONDISI RUANGAN (Logika Prioritas Mutlak)
// ============================================================================

export const checkSensorCondition = (temperature: number, lightLux: number, noiseLevel: number): string => {
  let lightKey = "Cahaya Terang"; let lightPoint = 3;
  if (lightLux >= 700) { lightKey = "Cahaya Silau"; lightPoint = 1; }
  else if (lightLux >= 150 && lightLux < 700) { lightKey = "Cahaya Terang"; lightPoint = 3; }
  else if (lightLux >= 50 && lightLux < 150) { lightKey = "Cahaya Redup"; lightPoint = 2; }
  else if (lightLux < 50) { lightKey = "Cahaya Gelap"; lightPoint = 1; }

  let tempKey = "Suhu Sejuk"; let tempPoint = 3;
  if (temperature >= 31) { tempKey = "Suhu Panas"; tempPoint = 1; }
  else if (temperature >= 28 && temperature < 31) { tempKey = "Suhu Hangat"; tempPoint = 2; }
  else if (temperature >= 22 && temperature < 28) { tempKey = "Suhu Sejuk"; tempPoint = 3; }
  else if (temperature < 22) { tempKey = "Suhu Dingin"; tempPoint = 2; }

  let noiseKey = "Suara Normal"; let noisePoint = 3;
  if (noiseLevel >= 80) { noiseKey = "Suara Bising"; noisePoint = 1; }
  else if (noiseLevel >= 65 && noiseLevel < 80) { noiseKey = "Suara Ramai"; noisePoint = 2; }
  else if (noiseLevel >= 50 && noiseLevel < 65) { noiseKey = "Suara Normal"; noisePoint = 3; }
  else if (noiseLevel < 50) { noiseKey = "Suara Sunyi"; noisePoint = 3; }

  const results = [
    { point: tempPoint, key: tempKey },
    { point: noisePoint, key: noiseKey },
    { point: lightPoint, key: lightKey }
  ];

  if (tempPoint === 3 && noisePoint === 3 && lightPoint === 3) {
    return "Kondisi Optimal";
  }

  const point1s = results.filter(r => r.point === 1);
  const point2s = results.filter(r => r.point === 2);

  if (point1s.length > 0) return point1s[0].key;
  if (point2s.length > 0) return point2s[0].key;

  return "Kondisi Optimal";
};

// Helper untuk mendapatkan bobot poin dari string kondisi
const getConditionPoint = (condition: string): number => {
  if (condition === "Kondisi Optimal") return 3;

  if (condition.includes("Panas") || condition.includes("Bising") ||
    condition.includes("Silau") || condition.includes("Gelap")) return 1;

  if (condition.includes("Hangat") || condition.includes("Dingin") ||
    condition.includes("Ramai") || condition.includes("Redup")) return 2;

  return 3;
};

// ============================================================================
// 🌡️ B. PEMBUAT PROMPT INTERUPSI (Kondisi Memburuk)
// ============================================================================

export const getInterruptionPayload = (
  badConditionKey: string,
  temperature: number,
  lightLux: number,
  noiseLevel: number,
  aktivitas: string,
  media: string
): InferencePayload => {
  const currentTriggerKey = `Interupsi: ${badConditionKey}`;
  const systemPrompt = [
    `[MODE: INTERUPSI LINGKUNGAN] Kamu adalah Rinchan. PERAN: Pengawas Lingkungan Belajar.`,
    `SIFAT: Kuudere, logis, dan blak-blakan.`,
    `KONDISI SAAT INI: Suhu ${Math.round(temperature)}C, Cahaya ${Math.round(lightLux)} lux, Suara ${Math.round(noiseLevel)} dB.`,
    `Pengguna sedang ${aktivitas} menggunakan ${media}.`,
    `TUGAS UTAMA: Berikan perintah fisik untuk mengatasi masalah utama lingkungan, dan tegur/senggol aktivitas pengguna jika dirasa relevan dengan kondisi ruangan.`,
    `ATURAN KETAT:`,
    `1. Maksimal 1-2 kalimat (sekitar 15-20 kata).`,
    `2. DILARANG KERAS menyebutkan angka sensor dalam bentuk apapun.`,
    `3. DILARANG membahas manajemen waktu/Pomodoro di mode ini.`
  ].join(" ");

  return {
    systemPrompt: systemPrompt,
    userPrompt: currentTriggerKey,
    inferenceParams: { temperature: 0.5, topK: 40 },
    emotion: getMimikSensor(currentTriggerKey)
  };
};

// ============================================================================
// 🌡️ C. PEMBUAT PROMPT PEMULIHAN (Kondisi Membaik / Optimal)
// ============================================================================

const getTransitionTrigger = (previousCondition: string, currentCondition: string): string => {
  // 1. TANGANI TRANSISI SUHU
  if (previousCondition.includes("Panas")) {
    if (currentCondition.includes("Hangat")) return "Transisi: Suhu Panas ke Hangat";
    return "Transisi: Suhu Panas ke Sejuk"; // Lari ke optimal
  }
  if (previousCondition.includes("Dingin")) {
    return "Transisi: Suhu Dingin ke Sejuk";
  }

  // 2. TANGANI TRANSISI SUARA
  if (previousCondition.includes("Bising")) {
    if (currentCondition.includes("Ramai")) return "Transisi: Suara Bising ke Ramai";
    return "Transisi: Suara Bising ke Sunyi";
  }
  if (previousCondition.includes("Ramai")) {
    if (currentCondition.includes("Normal")) return "Transisi: Suara Ramai ke Normal";
    return "Transisi: Suara Ramai ke Sunyi";
  }

  // 3. TANGANI TRANSISI CAHAYA
  if (previousCondition.includes("Gelap")) {
    if (currentCondition.includes("Redup")) return "Transisi: Cahaya Gelap ke Redup";
    return "Transisi: Cahaya Gelap ke Terang";
  }
  if (previousCondition.includes("Redup")) {
    return "Transisi: Cahaya Redup ke Terang";
  }
  if (previousCondition.includes("Silau")) {
    return "Transisi: Cahaya Silau ke Terang";
  }

  // Fallback Darurat
  return "Transisi: Kondisi ke Optimal";
};

export const getRecoveryPayload = (
  previousConditionKey: string,
  currentConditionKey: string,
  temperature: number,
  lightLux: number,
  noiseLevel: number,
  aktivitas: string,
  media: string
): InferencePayload => {
  const currentTriggerKey = getTransitionTrigger(previousConditionKey, currentConditionKey);
  const systemPrompt = [
    `[MODE: PEMULIHAN LINGKUNGAN] Kamu adalah Rinchan. PERAN: Merespons Pemulihan Ruangan.`,
    `SIFAT: Kuudere, merasa lega, dan sedikit gengsi.`,
    `KONDISI SAAT INI: Suhu ${Math.round(temperature)}C, Cahaya ${Math.round(lightLux)} lux, Suara ${Math.round(noiseLevel)} dB.`,
    `Pengguna sedang ${aktivitas} menggunakan ${media}.`,
    `TUGAS UTAMA: Akui bahwa kondisi ruangan sudah membaik, lalu berikan arahan tegas untuk kembali mengerjakan tugas.`,
    `ATURAN KETAT:`,
    `1. Maksimal 1-2 kalimat (sekitar 15-20 kata).`,
    `2. DILARANG KERAS menyebutkan angka sensor dalam bentuk apapun.`,
    `3. JANGAN mengulangi peringatan, cukup nyatakan kelegaan.`
  ].join(" ");

  return {
    systemPrompt: systemPrompt,
    userPrompt: currentTriggerKey,
    inferenceParams: { temperature: 0.6, topK: 40 },
    emotion: getMimikSensor(currentTriggerKey)
  };
};

// ==========================================
// ⚙️ FUNGSI UTAMA ANALISIS LINGKUNGAN
// ==========================================
export const analyzeEnvironment = (sensor: any) => {
  const { temperature, lightLux, noiseLevel, aktivitas, media, lastCondition } = sensor;

  const currentCondition = checkSensorCondition(temperature, lightLux, noiseLevel);

  // Jika kondisi sama persis, abaikan agar tidak spam
  if (currentCondition === lastCondition) return null;

  const currentPoint = getConditionPoint(currentCondition);

  // Bersihkan lastCondition jika ada prefix untuk perbandingan poin yang akurat
  const cleanLastCondition = lastCondition ? lastCondition.replace("Interupsi: ", "").replace("Transisi: ", "") : "Kondisi Optimal";
  const lastPoint = getConditionPoint(cleanLastCondition);

  // 1. LOGIKA PEMULIHAN (Point naik: 1 -> 2, 1 -> 3, 2 -> 3)
  if (currentPoint > lastPoint) {
    let recoveryTrigger = "";
    if (cleanLastCondition === "Kondisi Sangat Buruk") {
      recoveryTrigger = currentPoint === 3 ? "Transisi: Sangat Buruk ke Optimal" : "Transisi: Sangat Buruk ke Kurang Nyaman";
    } else if (cleanLastCondition === "Kondisi Kurang Nyaman") {
      recoveryTrigger = "Transisi: Kurang Nyaman ke Optimal";
    } else {
      // Pemulihan spesifik (misal Panas ke Sejuk)
      // Ambil kata kunci masalah sebelumnya (hapus prefix Suhu/Suara/Cahaya)
      const prevProblem = cleanLastCondition.replace("Suhu ", "").replace("Suara ", "").replace("Cahaya ", "");

      // Tentukan label kondisi sekarang sesuai jenis sensor yang membaik
      let currentLabel = "Optimal";
      if (cleanLastCondition.includes("Suhu")) currentLabel = getTempString(temperature);
      else if (cleanLastCondition.includes("Suara")) currentLabel = getNoiseString(noiseLevel);
      else if (cleanLastCondition.includes("Cahaya")) currentLabel = getLightString(lightLux);

      recoveryTrigger = `Transisi: ${prevProblem} ke ${currentLabel}`;
    }

    console.log(`[AI Trigger] Menjalankan pemulihan (${lastPoint} -> ${currentPoint}): ${recoveryTrigger}`);
    const payload = getRecoveryPayload(cleanLastCondition, currentCondition, temperature, lightLux, noiseLevel, aktivitas, media);

    return {
      input: recoveryTrigger,
      instruction: payload.systemPrompt,
      inferenceParams: payload.inferenceParams,
      emotion: payload.emotion,
      newCondition: currentCondition
    };
  }

  // 2. LOGIKA INTERUPSI (Point turun: 3 -> 2, 3 -> 1, 2 -> 1 ATAU Point tetap rendah tapi masalah berubah)
  // Contoh: Point sama tapi berubah (misal Panas ke Silau, keduanya Point 1) tetap dianggap Interupsi baru.
  if (currentPoint === 1 && currentCondition !== cleanLastCondition) {
    console.log(`[AI Trigger] Menjalankan Interupsi (Kritis): ${currentCondition}`);
    const payload = getInterruptionPayload(currentCondition, temperature, lightLux, noiseLevel, aktivitas, media);

    return {
      input: currentCondition,
      instruction: payload.systemPrompt,
      inferenceParams: payload.inferenceParams,
      emotion: payload.emotion,
      newCondition: currentCondition
    };
  }

  // Jika kondisinya Point 2 tapi tidak membaik dari Point 1 (artinya dari Optimal -> Point 2)
  // Maka abaikan (diam saja). AI menghargai toleransi pengguna!
  return null;
}


// ============================================================================
// ⏱️ D. PEMBUAT PROMPT POMODORO (Manajemen Waktu)
// ============================================================================



const translatePhaseToPrompt = (mode: TimeMode, phase: TimePhase, durationMin: number): string => {
  if (mode === "fokus") {
    if (phase === "awal") return "Fase Awal Fokus";
    if (phase === "tengah") return "Fase Pertengahan Fokus";
    return "Fase Akhir Fokus";
  } else {
    if (phase === "akhir") return "Fase Peringatan Istirahat Akhir";
    if (durationMin >= 15) return "Fase Istirahat Panjang";
    return "Fase Istirahat Pendek"; // Sekarang 'awal' dan 'tengah' istirahat akan masuk ke sini
  }
};

export const getPomodoroEnvString = (temperature: number, lightLux: number, noiseLevel: number): string => {
  let tempKey = "Sejuk"; let tempPoint = 3;
  if (temperature >= 31) { tempKey = "Panas"; tempPoint = 1; }
  else if (temperature >= 28 && temperature < 31) { tempKey = "Hangat"; tempPoint = 2; }
  else if (temperature >= 22 && temperature < 28) { tempKey = "Sejuk"; tempPoint = 3; }
  else if (temperature < 22) { tempKey = "Dingin"; tempPoint = 2; }

  let noiseKey = "Sunyi"; let noisePoint = 3;
  if (noiseLevel >= 80) { noiseKey = "Bising"; noisePoint = 1; }
  else if (noiseLevel >= 65 && noiseLevel < 80) { noiseKey = "Ramai"; noisePoint = 2; }
  else if (noiseLevel >= 50 && noiseLevel < 65) { noiseKey = "Normal"; noisePoint = 3; }
  else if (noiseLevel < 50) { noiseKey = "Sunyi"; noisePoint = 3; }

  let lightKey = "Terang"; let lightPoint = 3;
  if (lightLux >= 700) { lightKey = "Silau"; lightPoint = 1; }
  else if (lightLux >= 150 && lightLux < 700) { lightKey = "Terang"; lightPoint = 3; }
  else if (lightLux >= 50 && lightLux < 150) { lightKey = "Redup"; lightPoint = 2; }
  else if (lightLux < 50) { lightKey = "Gelap"; lightPoint = 1; }

  const results = [
    { point: tempPoint, key: tempKey },
    { point: noisePoint, key: noiseKey },
    { point: lightPoint, key: lightKey }
  ];

  if (tempPoint === 3 && noisePoint === 3 && lightPoint === 3) return "Optimal";

  const point1s = results.filter(r => r.point === 1);
  const point2s = results.filter(r => r.point === 2);

  if (point1s.length > 0) return point1s[0].key;
  if (point2s.length > 0) return point2s[0].key;

  return "Optimal";
};

export const getPomodoroPayload = (
  rawMode: string,
  phase: TimePhase,
  durationMin: number,
  remainingMin: number,
  cycle: number,
  media: string,
  sensorStatus: string
): InferencePayload => {
  const mode: TimeMode = (rawMode === "fokus" || rawMode === "istirahat") ? rawMode : "fokus";

  let waktuStr = remainingMin < 1 ? `${Math.round(remainingMin * 60)} Detik` : `${Math.round(remainingMin)} Menit`;

  let userPrompt = translatePhaseToPrompt(mode, phase, durationMin);
  if (remainingMin === 0) userPrompt = "Pomodoro Selesai";

  let putaranStr = "";
  if (cycle > 0) {
    if (userPrompt === "Fase Awal Fokus") putaranStr = `Putaran Saat Ini: ${cycle}. `;
    else if (userPrompt === "Fase Peringatan Istirahat Akhir") putaranStr = `Sisa Putaran: ${cycle}. `;
    else if (userPrompt === "Pomodoro Selesai") putaranStr = `Total Putaran: ${cycle}. `;
  }

  const systemPrompt = [
    `[MODE: MANAJEMEN WAKTU] Kamu adalah Rinchan. PERAN: Pengatur Waktu Pomodoro.`,
    `SIFAT: Kuudere, dingin, tegas, dan disiplin soal waktu.`,
    `KONDISI SAAT INI: Waktu ${waktuStr}. Pengguna berinteraksi dengan ${media}. Status Lingkungan: ${sensorStatus}.`,
    `TUGAS UTAMA: Berikan instruksi waktu yang tegas sesuai fase pengguna. Jadikan KONDISI SAAT INI sebagai referensi percakapan jika dirasa perlu.`,
    `ATURAN KETAT:`,
    `1. Maksimal 1-2 kalimat (perintah langsung).`,
    `2. FOKUS MURNI pada manajemen waktu.`,
    `3. DILARANG KERAS menyuruh pengguna untuk memperbaiki lingkungan fisik di mode ini.`
  ].join(" ");

  return {
    systemPrompt: systemPrompt,
    userPrompt: userPrompt,
    inferenceParams: { temperature: 0.5, topK: 40 },
    emotion: getMimikWaktu(userPrompt)
  };
};
