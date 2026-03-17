import { writeFileSync } from 'fs'
// Sesuaikan import ini dengan letak fungsi hash milikmu
import { hashPassword } from '../src/utils/password' 

async function generateSeed() {
  console.log('⏳ Memulai proses pembuatan Seed D1 dengan UUID valid...')

  const plainPassword = 'password123'
  const validHashedPassword = await hashPassword(plainPassword)
  
  // UUID v4 valid yang mudah di-copy untuk Postman:
  const USER_ID = '11111111-1111-4111-8111-111111111111'
  const DEVICE_ID = '22222222-2222-4222-8222-222222222222'
  const TELEMETRY_ID = '33333333-3333-4333-8333-333333333333'
  const POMODORO_ID = '44444444-4444-4444-8444-444444444444'

  const sql = `
DELETE FROM sensor_telemetry;
DELETE FROM interactions;
DELETE FROM pomodoro_sessions;
DELETE FROM webhooks;
DELETE FROM refresh_tokens;
DELETE FROM devices;
DELETE FROM users;

-- A. Buat Akun User (Password Valid!)
INSERT INTO users (id, email, name, password, avatar_url) 
VALUES (
  '${USER_ID}', 
  'master@rinchan.com', 
  'Master Engineer', 
  '${validHashedPassword}', 
  'https://ui-avatars.com/api/?name=Master'
);

-- B. Buat Rin-chan Device (Hardware UUID bebas, tapi primary key ID harus UUIDv4)
INSERT INTO devices (id, uuid, user_id, device_name, token_version, status) 
VALUES (
  '${DEVICE_ID}', 
  'RINCHAN-SEED-001', 
  '${USER_ID}', 
  'Rin-chan Meja Belajar', 
  1, 
  'online'
);

-- C. Buat Data Telemetri Awal
INSERT INTO sensor_telemetry (id, device_id, temperature, light_lux, noise_level)
VALUES (
  '${TELEMETRY_ID}', 
  '${DEVICE_ID}', 
  26, 
  350, 
  45
);

-- D. Buat Histori Pomodoro Dummy
INSERT INTO pomodoro_sessions (
  id, device_id, focus_duration, rest_duration, target_cycles, 
  condition, current_cycle, current_mode, current_phase, status
)
VALUES (
  '${POMODORO_ID}', 
  '${DEVICE_ID}', 
  1500, 
  300,  
  4, 
  'normal', 
  4, 
  'istirahat', 
  'akhir', 
  'completed'
);
`

  writeFileSync('seed.sql', sql.trim())
  console.log('🎉 File seed.sql berhasil dibuat! Zod tidak akan marah lagi.')
  console.log('--------------------------------------------------')
  console.log(`🔑 Gunakan Email: master@rinchan.com | Pass: ${plainPassword}`)
  console.log(`📡 Gunakan Device ID untuk Telemetry: ${DEVICE_ID}`)
}

generateSeed().catch(console.error)