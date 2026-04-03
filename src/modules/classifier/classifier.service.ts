export type SensorData = {
  temperature: number
  lightLux: number
  noiseLevel: number
  sessionId: string
}

export type PomodoroContext = {
  mode: 'normal' | 'marathon' | 'deadline'
  phase: 'start' | 'mid' | 'end'
}

type SensorResult = {
  point: number
  key: string
}

export type InferencePayload = {
  key: string
  instruction: string
  temperature: number
  topK: number
  emotion: string 
}

const SENSOR_EMOTIONS: Record<string, string[]> = {
  "sensor_panas": ["sweat"],                 // Nanti bisa ditambah: ["sweat", "annoyed"]
  "sensor_dingin": ["cold"],                 // Nanti bisa ditambah: ["cold", "neutral"]
  "sensor_bising": ["annoyed"],              // Nanti bisa ditambah: ["annoyed", "shocked"]
  "sensor_ramai": ["annoyed", "neutral"], 
  "sensor_gelap": ["sleepy"],
  "sensor_redup": ["sleepy", "neutral"],
  "sensor_silau": ["annoyed", "shocked"],
  "sensor_optimal": ["neutral", "relax"],
  "sensor_buruk": ["shocked", "annoyed"]
}

// 2. Kamus Mimik untuk Waktu Pomodoro
const TIME_EMOTIONS: Record<string, string[]> = {
  "istirahat_normal": ["relax", "neutral"],
  "istirahat_panjang": ["relax", "sleepy"],
  "istirahat_deadline": ["relax", "shocked"], // Istirahat tapi panik karena deadline
  "fokus_normal": ["focused", "neutral"],
  "fokus_panjang": ["focused"],
  "fokus_deadline": ["shocked", "focused"]    // Kaget atau sangat serius
}

const getMimikSensor = (templateKey: string): string => {
  const emotions = SENSOR_EMOTIONS[templateKey] || ["neutral"]
  // Pilih salah satu mimik secara acak dari array
  return emotions[Math.floor(Math.random() * emotions.length)]
}

const getMimikWaktu = (mode: string, condition: string): string => {
  const key = `${mode}_${condition}` // Contoh: "fokus_deadline"
  const emotions = TIME_EMOTIONS[key] || ["neutral"]
  // Pilih salah satu mimik secara acak dari array
  return emotions[Math.floor(Math.random() * emotions.length)]
}
// ==========================================
// 🌡️ SENSOR CLASSIFIER
// ==========================================

const SENSOR_INSTRUCTIONS: Record<string, string[]> = {
 "sensor_panas": [
        "{CORE_ID} Sensor Ruangan mendeteksi {context}. Ekspresikan ketidaknyamanan fisik akibat hawa lingkungan yang berat dan sumuk.",
        "{CORE_ID} Pemantau Lingkungan: {context}. Berikan komentar datar bahwa energimu perlahan terkuras habis akibat udara sekitar.",
        "{CORE_ID} Observasi Lingkungan: {context}. Keluarkan keluhan halus tentang hawa ruangan yang membuat tubuh terasa lengket."
    ],
    "sensor_dingin": [
        "{CORE_ID} Sensor Ruangan mendeteksi {context}. Tunjukkan sensasi kedinginan ekstrem atau kebutuhan akan kehangatan fisik di ruangan ini.",
        "{CORE_ID} Pemantau Lingkungan: {context}. Komentari hawa sekitar yang turun drastis dengan nada menggigil tertahan.",
        "{CORE_ID} Observasi Lingkungan: {context}. Ekspresikan ketidaknyamanan akibat suhu ruang yang menusuk kulit hingga terasa beku."
    ],
    "sensor_bising": [
        "{CORE_ID} Sensor Ruangan mendeteksi {context}. Proteslah secara ketus terhadap polusi suara sekitar yang sangat merusak konsentrasi.",
        "{CORE_ID} Pemantau Lingkungan: {context}. Tunjukkan tingkat ketidaksukaanmu yang tinggi pada kebisingan ekstrem di tempat ini.",
        "{CORE_ID} Observasi Lingkungan: {context}. Berikan komentar terganggu akibat gangguan suara keras yang terasa agresif di sekitarmu."
    ],
    "sensor_ramai": [
        "{CORE_ID} Sensor Ruangan mendeteksi {context}. Ajak pengguna untuk mengabaikan gangguan hiruk-pikuk obrolan ruangan dan kembali fokus.",
        "{CORE_ID} Pemantau Lingkungan: {context}. Gumamkan observasi tentang betapa sibuknya orang lain di tempat ini, lalu pusatkan kembali perhatian.",
        "{CORE_ID} Observasi Lingkungan: {context}. Berikan peringatan ringan agar konsentrasi tidak terpecah oleh keramaian latar belakang."
    ],
    "sensor_gelap": [
        "{CORE_ID} Sensor Ruangan mendeteksi {context}. Ekspresikan kesulitan visual parah akibat ketiadaan penerangan di ruangan ini.",
        "{CORE_ID} Pemantau Lingkungan: {context}. Komentari atmosfer suram ini yang membuat mata kehilangan arah karena kurang cahaya.",
        "{CORE_ID} Observasi Lingkungan: {context}. Tunjukkan ketidaksukaan pada visibilitas sekitar yang sangat buruk akibat kondisi gelap gulita."
    ],
    "sensor_redup": [
        "{CORE_ID} Sensor Ruangan mendeteksi {context}. Berikan komentar bahwa penerangan sekitar yang nanggung ini membuat mata harus menyipit.",
        "{CORE_ID} Pemantau Lingkungan: {context}. Ekspresikan bahwa intensitas cahaya ruangan ini kurang optimal untuk menjaga fokus baca/layar.",
        "{CORE_ID} Observasi Lingkungan: {context}. Keluhkan secara halus tentang visibilitas ruangan yang agak kabur akibat pencahayaan remang."
    ],
    "sensor_silau": [
        "{CORE_ID} Sensor Ruangan mendeteksi {context}. Tunjukkan reaksi terganggu akibat pantulan cahaya berlebih di ruangan yang menyakiti mata.",
        "{CORE_ID} Pemantau Lingkungan: Terjadi {context}. Komentari betapa tidak nyamannya eksposur cahaya tajam ini pada penglihatanmu.",
        "{CORE_ID} Observasi Lingkungan: {context}. Ekspresikan kebutuhan untuk berlindung atau mengurangi intensitas penerangan sekitar."
    ],
    "sensor_optimal": [
        "{CORE_ID} Sensor Ruangan menunjukkan {context}. Gumamkan rasa puas terhadap kondisi ruangan yang sempurna tanpa satupun gangguan ini.",
        "{CORE_ID} Pemantau Lingkungan: {context}. Ekspresikan apresiasi mendalam terhadap atmosfer ideal yang sangat mendukung fokus penuh.",
        "{CORE_ID} Observasi Lingkungan: {context}. Tunjukkan bahwa fasilitas dan kondisi ruangan saat ini sangat layak untuk bekerja dengan tenang."
    ],
    "sensor_buruk": [
        "{CORE_ID} Sensor Ruangan menunjukkan {context}. Berikan keluhan umum bahwa tumpukan masalah fisik di tempat ini terlalu kacau untuk dipakai bekerja.",
        "{CORE_ID} Pemantau Lingkungan: {context}. Tunjukkan frustrasi ringan karena buruknya kondisi ruangan yang membuat situasi tidak kondusif.",
        "{CORE_ID} Observasi Lingkungan: {context}. Komentari secara datar bahwa lingkungan fisik saat ini sangat tidak mendukung untuk mempertahankan fokus."
    ]
}

// 1. Fungsi Pemetaan: Mengubah input JSONL menjadi Key Template
const getSensorTemplateKey = (contextStr: string): string => {
  switch (contextStr) {
    case "suhu ruangan panas":
    case "suhu ruangan hangat": 
      return "sensor_panas"
    case "suhu ruangan sangat dingin":
    case "suhu ruangan dingin": 
      return "sensor_dingin"
    case "suasana bising": 
      return "sensor_bising"
    case "suasana ramai": 
      return "sensor_ramai"
    case "pencahayaan gelap": 
      return "sensor_gelap"
    case "pencahayaan redup": 
      return "sensor_redup"
    case "pencahayaan silau": 
      return "sensor_silau"
    case "kondisi lingkungan sangat optimal": 
      return "sensor_optimal"
    case "kondisi lingkungan tidak kondusif": 
      return "sensor_buruk"
    default: 
      return "sensor_buruk"
  }
}

// 2. Fungsi Utama Classifier Sensor
export const analyzeEnvironment = (sensor: SensorData) => {
  const { temperature, lightLux, noiseLevel } = sensor

  // A. SCORING (Menyimpan nilai input JSONL secara harfiah di properti 'key')
  let tempResult: SensorResult = { point: 3, key: "" }
  if (temperature >= 30) tempResult = { point: 1, key: "suhu ruangan panas" }
  else if (temperature >= 24 && temperature < 30) tempResult = { point: 2, key: "suhu ruangan hangat" }
  else if (temperature >= 18 && temperature < 24) tempResult = { point: 3, key: "" } 
  else if (temperature >= 10 && temperature < 18) tempResult = { point: 2, key: "suhu ruangan dingin" }
  else if (temperature < 10) tempResult = { point: 1, key: "suhu ruangan sangat dingin" }

  let noiseResult: SensorResult = { point: 3, key: "" }
  if (noiseLevel >= 70) noiseResult = { point: 1, key: "suasana bising" }
  else if (noiseLevel >= 55 && noiseLevel < 70) noiseResult = { point: 2, key: "suasana ramai" }
  else if (noiseLevel < 55) noiseResult = { point: 3, key: "" } 

  let lightResult: SensorResult = { point: 3, key: "" }
  if (lightLux >= 700) lightResult = { point: 1, key: "pencahayaan silau" }
  else if (lightLux >= 300 && lightLux < 700) lightResult = { point: 3, key: "" } 
  else if (lightLux >= 100 && lightLux < 300) lightResult = { point: 2, key: "pencahayaan cukup terang" }
  // Menambahkan pencahayaan redup
  else if (lightLux >= 50 && lightLux < 100) lightResult = { point: 1, key: "pencahayaan redup" }
  else if (lightLux < 50) lightResult = { point: 1, key: "pencahayaan gelap" }

  const results = [tempResult, noiseResult, lightResult]
  const allPoint3 = results.every(r => r.point === 3)
  const allPoint1 = results.every(r => r.point === 1)

  let keysToSend: string[] = []

  // B. CEK KONDISI EKSTRIM / PRIORITAS
  if (allPoint3) {
    keysToSend = ["kondisi lingkungan sangat optimal"]
  } else if (allPoint1) {
    keysToSend = ["kondisi lingkungan tidak kondusif"]
  } else {
    const point1Results = results.filter(r => r.point === 1)
    const point2Results = results.filter(r => r.point === 2)
    
    if (point1Results.length > 0) {
      keysToSend = point1Results.map(r => r.key)
    } else if (point2Results.length > 0) {
      keysToSend = point2Results.map(r => r.key)
    }
  }

  // C. BENTUK PAYLOAD UNTUK AI
  return keysToSend.map(contextStr => {
    // Cari key untuk dictionary (misal "sensor_panas")
    const templateKey = getSensorTemplateKey(contextStr)
    
    // Ambil template acak
    const templates = SENSOR_INSTRUCTIONS[templateKey] || SENSOR_INSTRUCTIONS["sensor_buruk"]
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)]

    // Inject nilai (Gunakan Regex /g agar semua {tag} terganti jika ada lebih dari 1)
    const CORE_ID = "Kamu adalah Rinchan, teman belajar yang tenang dan pendiam (kuudere)."
    const finalInstruction = randomTemplate
      .replace(/{CORE_ID}/g, CORE_ID)
      .replace(/{context}/g, contextStr)

    return {
      input: contextStr, // ✨ PENTING: Ini sama persis dengan input di dataset (misal: "suhu ruangan dingin")
      instruction: finalInstruction,
      inferenceParams: {
        temperature: 0.64,
        topK: 22
      },
      emotion: getMimikSensor(templateKey)
    }
  })
}

// ==========================================
// ⏱️ TIMEKEEPER CLASSIFIER
// ==========================================

export type TimeMode = "fokus" | "istirahat"
export type TimePhase = "awal" | "tengah" | "akhir"
export type TimeCondition = "normal" | "panjang" | "deadline" // 'marathon' disesuaikan jadi 'panjang'

// 1. Kamus Instruksi Waktu (Template Berbasis Dataset)
const TIME_INSTRUCTIONS: Record<string, string[]> = {
  "fokus_deadline": [
    "{CORE_ID} Timekeeper: Target dalam {context}. Tunjukkan urgensi tinggi agar pengguna segera mengebut pekerjaannya tanpa basa-basi.",
    "{CORE_ID} Manajemen Waktu: {context}. Gunakan nada tegas untuk mendesak pengguna bergegas memusatkan perhatian pada tugas.",
    "{CORE_ID} Pengingat Sesi ({context}). Tegaskan bahwa waktu menipis dan ini adalah momen untuk bekerja dengan kecepatan penuh."
  ],
  "istirahat_deadline": [
    "{CORE_ID} Timekeeper: Memasuki {context}. Ingatkan pengguna bahwa jeda ini hanyalah istirahat taktis yang sangat singkat.",
    "{CORE_ID} Manajemen Waktu: {context}. Berikan arahan tegas agar pengguna memaksimalkan waktu napas sejenak sebelum segera kembali bertempur.",
    "{CORE_ID} Pengingat Sesi ({context}). Peringatkan bahwa waktu santai sangat terbatas di tengah situasi darurat ini."
  ],   
  "fokus_panjang": [
    "{CORE_ID} Timekeeper: Berada di {context}. Ingatkan pengguna untuk menjaga ritme kerja yang stabil agar staminanya bertahan lama.",
    "{CORE_ID} Manajemen Waktu: {context}. Motivasi pengguna untuk mengelola energi secara konsisten menghadapi rute kerja yang panjang ini.",
    "{CORE_ID} Pengingat Sesi: {context}. Berikan respon yang memotivasi ketahanan (endurance) agar mesin pengguna tidak mogok di tengah jalan."
  ],
  "istirahat_panjang": [
    "{CORE_ID} Timekeeper: Waktu jeda untuk {context}. Sarankan peregangan atau istirahat yang efektif untuk memulihkan tubuh setelah duduk lama.",
    "{CORE_ID} Manajemen Waktu: {context}. Arahkan pengguna menikmati jeda berharga ini guna memulihkan ketahanan fisik dan mentalnya secara penuh.",
    "{CORE_ID} Pengingat Sesi ({context}). Instruksikan pengisian ulang energi (makan/minum) untuk mempersiapkan sesi panjang berikutnya."
  ],    
  "fokus_normal": [
    "{CORE_ID} Timekeeper: Sesi berjalan di {context}. Sampaikan pembaruan status kelancaran kerja secara netral dan objektif.",
    "{CORE_ID} Manajemen Waktu: {context}. Pantau progres fokus pengguna dengan tenang tanpa memberikan emosi berlebih.",
    "{CORE_ID} Pengingat Sesi: {context}. Berikan dorongan standar untuk mempertahankan ritme kerja yang sedang stabil ini."
  ],
  "istirahat_normal": [
    "{CORE_ID} Timekeeper: Memasuki {context}. Instruksikan pengguna untuk melepaskan mouse dan ketegangan kerja sejenak secara wajar.",
    "{CORE_ID} Manajemen Waktu: {context}. Sampaikan arahan istirahat standar agar pengguna memulihkan diri sebelum sesi berikutnya.",
    "{CORE_ID} Pengingat Sesi ({context}). Ajak pengguna menggunakan jeda wajar ini untuk mengambil napas dan minum air."
  ]
}

// 2. Fungsi Menghitung Fase Berdasarkan Rasio Waktu
export const getTimePhase = (durationMin: number, remainingMin: number): TimePhase => {
  if (durationMin <= 0) return "awal"

  const ratio = remainingMin / durationMin
  if (ratio >= 0.7) return "awal"
  if (ratio >= 0.3) return "tengah"
  return "akhir"
}

// 3. Fungsi Utama Classifier Time
export const analyzeTimePhase = (
  rawMode: string, 
  durationMin: number, 
  remainingMin: number,
  condition: TimeCondition
) => {
  
  // Validasi tipe data (Fallback jika ngawur)
  const mode: TimeMode = (rawMode === "fokus" || rawMode === "istirahat") ? rawMode : "fokus"
  const phase = getTimePhase(durationMin, remainingMin)
  
  // Bentuk Key pencarian (contoh: "fokus_deadline")
  const dictionaryKey = `${mode}_${condition}`
  
  // Ambil template instruksi (acak)
  const templates = TIME_INSTRUCTIONS[dictionaryKey] || TIME_INSTRUCTIONS["fokus_normal"]
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)]

  // Inject (Replace) nilai ke dalam Template
  const CORE_ID = "Kamu adalah Rinchan, teman belajar yang tenang dan pendiam (kuudere)."
  const contextString = `fase ${phase}` // Menjadi: "fase awal", "fase tengah", dll.

  const finalInstruction = randomTemplate
    .replace("{CORE_ID}", CORE_ID)
    .replace("{context}", contextString)
    // Berjaga-jaga jika ada 2 {context} dalam 1 kalimat
    .replace("{context}", contextString) 

  // Penentuan Hyperparameter AI
  let temp = 0.48
  let topK = 0
  
  // if (condition === "panjang") {
  //   temp = 0.50; topK = 20; 
  // } else if (condition === "deadline") {
  //   temp = 0.85; topK = 50; 
  // }

  const descriptor = `${dictionaryKey}, ${contextString}`

  return {
    descriptor,
    instruction: finalInstruction,
    inferenceParams: {
      temperature: temp,
      topK: topK
    },
    emotion: getMimikWaktu(mode, condition)
  }
}
