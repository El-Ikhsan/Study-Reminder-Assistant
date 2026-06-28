// ============================================================================
// 🧠 RINCHAN CLASSIFIER SERVICE (FINAL V8 - GGUF 0.5 + GACHA 70/30 + UPDATED PROMPT)
// ============================================================================

export type SensorData = {
  temperature: number;
  lightLux: number;
  noiseLevel: number;
  sessionId: string;
};

export type InferencePayload = {
  instruction: string;
  input: string;
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
  // Interupsi (Kondisi Buruk)
  "Interupsi: Suhu Panas": ["HOT"],
  "Interupsi: Suhu Dingin Extrem": ["COLD"],
  "Interupsi: Suara Bising": ["NOISY"],
  "Interupsi: Cahaya Gelap": ["DARK"],
  "Interupsi: Cahaya Silau": ["GLARE"],

  // Transisi (Pemulihan ke Kondisi Optimal)
  "Transisi: Suhu Panas ke Sejuk": ["SMILE"],
  "Transisi: Suhu Panas ke Hangat": ["SMILE"],
  "Transisi: Suhu Dingin Extrem ke Sejuk": ["SMILE"],
  "Transisi: Suhu Dingin Extrem ke Dingin": ["SMILE"],
  "Transisi: Suara Bising ke Ramai": ["SMILE"],
  "Transisi: Suara Bising ke Normal": ["SMILE"],
  "Transisi: Suara Bising ke Sunyi": ["SMILE"],
  "Transisi: Cahaya Gelap ke Redup": ["SMILE"],
  "Transisi: Cahaya Gelap ke Terang": ["SMILE"],
  "Transisi: Cahaya Silau ke Terang": ["SMILE"]
};

const TIME_EMOTIONS: Record<string, string[]> = {
  // Pomodoro Fokus
  "Pomodoro: Fase Awal Fokus": ["IDLE"],
  "Pomodoro: Fase Pertengahan Fokus": ["IDLE"],
  "Pomodoro: Fase Akhir Fokus": ["IDLE"],

  // Pomodoro Istirahat (Cocok menggunakan GIF Smile)
  "Pomodoro: Fase Istirahat Pendek": ["SMILE"],
  "Pomodoro: Fase Istirahat Panjang": ["SMILE"],
  "Pomodoro: Fase Peringatan Istirahat Akhir": ["IDLE"],
  "Pomodoro: Sesi Selesai": ["SMILE", "IDLE"]
};

const getMimikSensor = (key: string): string => {
  const cleanKey = key.split(" [")[0];
  const emotions = SENSOR_EMOTIONS[cleanKey] || ["IDLE"];
  return emotions[Math.floor(Math.random() * emotions.length)];
};

const getMimikWaktu = (key: string): string => {
  const cleanKey = key.split(" [")[0];
  const emotions = TIME_EMOTIONS[cleanKey] || ["IDLE"];
  return emotions[Math.floor(Math.random() * emotions.length)];
};

// ============================================================================
// 🌡️ DETEKTOR KONDISI RUANGAN (SINGLE PRIORITY LOCK)
// ============================================================================

const getTempString = (t: number) => t >= 31 ? "Panas" : t >= 28 ? "Hangat" : t >= 22 ? "Sejuk" : "Dingin";
const getLightString = (l: number) => l >= 700 ? "Silau" : l >= 150 ? "Terang" : l >= 50 ? "Redup" : "Gelap";
const getNoiseString = (n: number) => n >= 80 ? "Bising" : n >= 65 ? "Ramai" : n >= 50 ? "Normal" : "Sunyi";

export const checkSensorCondition = (temperature: number, lightLux: number, noiseLevel: number): string => {

  let lightKey = "Cahaya Terang"; let lightPoint = 3;
  if (lightLux >= 700) { lightKey = "Cahaya Silau"; lightPoint = 1; }
  else if (lightLux >= 50 && lightLux < 150) { lightKey = "Cahaya Redup"; lightPoint = 2; }
  else if (lightLux < 50) { lightKey = "Cahaya Gelap"; lightPoint = 1; }

  let tempKey = "Suhu Sejuk"; let tempPoint = 3;
  if (temperature >= 31) { tempKey = "Suhu Panas"; tempPoint = 1; }
  else if (temperature >= 28 && temperature < 31) { tempKey = "Suhu Hangat"; tempPoint = 2; }
  else if (temperature < 22) { tempKey = "Suhu Dingin Extrem"; tempPoint = 1; }

  let noiseKey = "Suara Normal"; let noisePoint = 3;
  if (noiseLevel >= 80) { noiseKey = "Suara Bising"; noisePoint = 1; }
  else if (noiseLevel >= 65 && noiseLevel < 80) { noiseKey = "Suara Ramai"; noisePoint = 2; }

  const point1s = [
    { point: lightPoint, key: lightKey }, // Prioritas 1
    { point: tempPoint, key: tempKey },   // Prioritas 2
    { point: noisePoint, key: noiseKey }  // Prioritas 3
  ].filter(r => r.point === 1);

  const point2s = [
    { point: lightPoint, key: lightKey },
    { point: tempPoint, key: tempKey },
    { point: noisePoint, key: noiseKey }
  ].filter(r => r.point === 2);


  if (point1s.length > 0) return point1s[0].key;
  if (point2s.length > 0) return point2s[0].key;
  return "Kondisi Optimal";
};

const getConditionPoint = (condition: string): number => {
  if (condition === "Kondisi Optimal") return 3;
  if (condition.includes("Panas") || condition.includes("Dingin Extrem") || condition.includes("Bising") ||
    condition.includes("Silau") || condition.includes("Gelap")) return 1;
  return 2;
};

// ============================================================================
// ⚙️ FUNGSI ANALISIS SENSOR (INTERUPSI & PEMULIHAN YANG DISEMPURNAKAN)
// ============================================================================
export const analyzeEnvironment = (sensor: any) => {
  const { temperature, lightLux, noiseLevel, media, lastCondition } = sensor;
  const cleanLastCondition = lastCondition ? lastCondition.replace("Interupsi: ", "").replace("Transisi: ", "").split(" [")[0] : "Kondisi Optimal";

  // =====================================
  // 1. CEK SPESIFIK UNTUK PEMULIHAN
  // (Mengabaikan sistem poin agar tidak bentrok dengan sensor lain)
  // =====================================
  if (cleanLastCondition !== "Kondisi Optimal") {
    let currentLabel = "Optimal";
    let displayLabel = "Optimal";
    let isRecovered = false;

    if (cleanLastCondition.includes("Suhu")) {
      currentLabel = getTempString(temperature);
      // Pulih jika sudah tidak Panas dan tidak Dingin Extrem
      if (currentLabel !== "Panas" && currentLabel !== "Dingin Extrem") {
        displayLabel = `Suhu ${currentLabel}`;
        isRecovered = true;
      }
    }
    else if (cleanLastCondition.includes("Suara")) {
      currentLabel = getNoiseString(noiseLevel);
      // Pulih jika sudah tidak Bising
      if (currentLabel !== "Bising") {
        displayLabel = `Suara ${currentLabel}`;
        isRecovered = true;
      }
    }
    else if (cleanLastCondition.includes("Cahaya")) {
      currentLabel = getLightString(lightLux);
      // Pulih jika sudah membaik dari kondisi buruk sebelumnya
      if (cleanLastCondition === "Cahaya Gelap" && currentLabel !== "Gelap") {
        displayLabel = `Cahaya ${currentLabel}`;
        isRecovered = true;
      } else if (cleanLastCondition === "Cahaya Silau" && currentLabel !== "Silau") {
        displayLabel = `Cahaya ${currentLabel}`;
        isRecovered = true;
      }
    }

    if (isRecovered) {
      let llmTargetLabel = currentLabel;

      // ✨ FIX: Normalisasi overshoot agar sesuai dengan dataset training LLM
      if (cleanLastCondition === "Suhu Panas" && currentLabel === "Dingin") llmTargetLabel = "Sejuk";
      if (cleanLastCondition === "Suhu Dingin Extrem" && currentLabel === "Hangat") llmTargetLabel = "Sejuk";
      if (cleanLastCondition === "Cahaya Gelap" && currentLabel === "Silau") llmTargetLabel = "Terang";
      if (cleanLastCondition === "Cahaya Silau" && (currentLabel === "Redup" || currentLabel === "Gelap")) llmTargetLabel = "Terang";

      const recoveryKey = `Transisi: ${cleanLastCondition} ke ${llmTargetLabel}`;

      // ✨ Sinkronisasi UI IOT dengan pemahaman LLM
      // Ambil prefix sensor (Suhu/Cahaya/Suara) dari kondisi terakhir
      const categoryPrefix = cleanLastCondition.split(" ")[0]; 
      const finalDisplayLabel = `${categoryPrefix} ${llmTargetLabel}`;

      const allowedTransitions = [
        "Transisi: Suhu Panas ke Hangat", "Transisi: Suhu Panas ke Sejuk",
        "Transisi: Suhu Dingin Extrem ke Dingin", "Transisi: Suhu Dingin Extrem ke Sejuk",
        "Transisi: Cahaya Gelap ke Redup", "Transisi: Cahaya Gelap ke Terang",
        "Transisi: Cahaya Silau ke Terang", "Transisi: Suara Bising ke Ramai",
        "Transisi: Suara Bising ke Normal", "Transisi: Suara Bising ke Sunyi"
      ];

      // Jika transisi sah, langsung kembalikan payload Pemulihan!
      if (allowedTransitions.includes(recoveryKey)) {
        const useMedia = Math.random() < 0.7;
        const mediaStr = (useMedia && media) ? ` [Media: ${media}]` : "";
        const finalUserPrompt = `${recoveryKey}${mediaStr}`;

        const sysPrompt = [
          "[MODE: PEMULIHAN LINGKUNGAN]",
          "Kamu adalah Rinchan. PERAN: Merespons Pemulihan Ruangan.",
          "SIFAT: Kuudere, merasa lega, dan sedikit gengsi.",
          "TUGAS UTAMA: Akui bahwa kondisi transisi ruangan sudah membaik berdasarkan input, lalu berikan arahan tegas untuk kembali mengerjakan tugas.",
          "ATURAN KETAT:",
          "1. Maksimal 1-2 kalimat (sekitar 10-15 kata).",
          "2. DILARANG KERAS menyebutkan angka sensor dalam bentuk apapun.",
          "3. JANGAN mengulangi peringatan, cukup nyatakan kelegaan."
        ].join(" ");

        return {
          input: finalUserPrompt,
          instruction: sysPrompt,
          inferenceParams: { temperature: 0.5, topK: 50 },
          emotion: getMimikSensor(recoveryKey),
          newCondition: finalDisplayLabel
        };
      }
    }
    return null;
  }

  // =====================================
  // 2. CEK INTERUPSI BARU (Jika tidak ada pemulihan)
  // =====================================
  const currentCondition = checkSensorCondition(temperature, lightLux, noiseLevel);

  if (currentCondition === lastCondition || currentCondition === "Kondisi Optimal") return null;

  const currentPoint = getConditionPoint(currentCondition);

  // Jika poinnya 1, berarti ada masalah lingkungan baru!
  if (currentPoint === 1) {
    const interupsiKey = `Interupsi: ${currentCondition}`;
    const useMedia = Math.random() < 0.7;
    const mediaStr = (useMedia && media) ? ` [Media: ${media}]` : "";

    const finalUserPrompt = `${interupsiKey}${mediaStr}`;

    const sysPrompt = [
      "[MODE: INTERUPSI LINGKUNGAN]",
      "Kamu adalah Rinchan. PERAN: Pengawas Lingkungan Belajar.",
      "SIFAT: Kuudere, logis, dan blak-blakan.",
      "TUGAS UTAMA: Berikan perintah fisik untuk mengatasi masalah utama lingkungan berdasarkan input, dan tegur/senggol aktivitas pengguna jika relevan dengan media yang digunakan.",
      "ATURAN KETAT:",
      "1. Maksimal 1-2 kalimat (sekitar 10-15 kata).",
      "2. DILARANG KERAS menyebutkan angka sensor dalam bentuk apapun.",
      "3. DILARANG membahas manajemen waktu/Pomodoro di mode ini."
    ].join(" ");

    return {
      input: finalUserPrompt,
      instruction: sysPrompt,
      inferenceParams: { temperature: 0.5, topK: 50 },
      emotion: getMimikSensor(interupsiKey),
      newCondition: currentCondition
    };
  }

  return null;
};



// ============================================================================
// ⏱️ PEMBUAT PROMPT POMODORO (Manajemen Waktu)
// ============================================================================

export const getPomodoroPayload = (
  rawMode: string,
  phase: TimePhase,
  durationMin: number,
  remainingMin: number,
  cycle: number,
  media: string
): InferencePayload => {
  const mode: TimeMode = (rawMode === "fokus" || rawMode === "istirahat") ? rawMode : "fokus";

  let basePrompt = "";
  if (mode === "fokus") {
    if (phase === "awal") basePrompt = "Pomodoro: Fase Awal Fokus";
    else if (phase === "tengah") basePrompt = "Pomodoro: Fase Pertengahan Fokus";
    else basePrompt = "Pomodoro: Fase Akhir Fokus";
  } else {
    if (phase === "akhir") basePrompt = "Pomodoro: Fase Peringatan Istirahat Akhir";
    else if (durationMin >= 15) basePrompt = "Pomodoro: Fase Istirahat Panjang";
    else basePrompt = "Pomodoro: Fase Istirahat Pendek";
  }

  if (remainingMin === 0) basePrompt = "Pomodoro: Sesi Selesai";

  // 🎲 RATE GACHA (70% Peluang)
  const useWaktu = Math.random() < 0.7;
  const useMedia = Math.random() < 0.7;

  let finalUserPrompt = basePrompt;

  // ✨ LOGIKA REKAP SESI SELESAI
  if (remainingMin === 0) {
    if (cycle > 0) finalUserPrompt += ` [Putaran: ${cycle}]`;
    if (useMedia && media) finalUserPrompt += ` [Media: ${media}]`;
  }
  // ✨ LOGIKA FASE NORMAL
  else {
    let waktuStr = remainingMin < 1 ? `${Math.round(remainingMin * 60)} Detik` : `${Math.round(remainingMin)} Menit`;
    if (useWaktu) finalUserPrompt += ` [Waktu: ${waktuStr}]`;
    if (useMedia && media) finalUserPrompt += ` [Media: ${media}]`;
  }

  const sysPrompt = [
    "[MODE: MANAJEMEN WAKTU]",
    "Kamu adalah Rinchan. PERAN: Pengatur Waktu Pomodoro.",
    "SIFAT: Kuudere, dingin, tegas, dan disiplin soal waktu.",
    "TUGAS UTAMA: Berikan instruksi waktu yang tegas sesuai fase. Gunakan parameter waktu, putaran, dan media dari input pengguna SEBAGAIMANA ADANYA, berapapun angkanya.",
    "ATURAN KETAT:",
    "1. Maksimal 1-2 kalimat (perintah langsung).",
    "2. FOKUS MURNI pada manajemen waktu.",
    "3. DILARANG KERAS menyuruh pengguna untuk memperbaiki lingkungan fisik di mode ini.",
    "4. DILARANG KERAS berasumsi/menggunakan durasi standar Pomodoro (seperti 25 menit). Jika input waktu hanya hitungan detik untuk demo, anggap itu normal. Jika input tidak menyebut waktu sama sekali, JANGAN menebak angka."
  ].join(" ");

  return {
    instruction: sysPrompt,
    input: finalUserPrompt,
    inferenceParams: { temperature: 0.5, topK: 50 },
    emotion: getMimikWaktu(basePrompt)
  };
};