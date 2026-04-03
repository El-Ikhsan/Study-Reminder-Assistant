import { writeFileSync } from 'fs'
// Sesuaikan import ini dengan letak fungsi hash milikmu
import { hashPassword } from '../src/utils/password' 

async function generateSeed() {
  console.log('⏳ Memulai proses pembuatan Seed D1 dengan UUID valid...')

  const plainPassword = 'password'
  const validHashedPassword = await hashPassword(plainPassword)
  
  // UUID v4 valid yang mudah di-copy untuk Postman:
  const USER_ID = '11111111-1111-4111-8111-111111111111'
  const DEVICE_ID = 'RINCHAN-ESP-001'


  const sql = `
DELETE FROM devices;
DELETE FROM users;

-- A. Buat Akun User (Password Valid!)
INSERT INTO users (id, email, name, password, avatar_url) 
VALUES (
  '${USER_ID}', 
  'user@example.com', 
  'Master Engineer', 
  '${validHashedPassword}', 
  'https://ui-avatars.com/api/?name=Master'
);

-- B. Buat Device tanpa user terdaftar
INSERT INTO devices (id, uuid, user_id, device_name, token_version, status) 
VALUES (
  '${DEVICE_ID}', 
  'RINCHAN-SEED-001', 
  NULL, 
  'Rin-chan Meja Belajar', 
  1, 
  'unclaimed'
);
`

  writeFileSync('seed.sql', sql.trim())
  console.log('🎉 File seed.sql berhasil dibuat! Zod tidak akan marah lagi.')
  console.log('--------------------------------------------------')
  console.log(`🔑 Gunakan Email: master@rinchan.com | Pass: ${plainPassword}`)
  console.log(`📡 Gunakan Device ID untuk Telemetry: ${DEVICE_ID}`)
}

generateSeed().catch(console.error)