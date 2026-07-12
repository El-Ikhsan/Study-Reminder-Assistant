import { getDb } from '@/db/client'
import { pomodoroSessions, aiPomodoroLogs, aiSensorLogs, devices } from '@/db/schema'
import { eq, inArray, desc, sql } from 'drizzle-orm'
import { ResponseError } from '@/utils/responseError'
import { logger } from '@/utils/logger'

export const createSession = async (data: {
  id: string;
  deviceId: string;
  focusDuration: number;
  restDuration: number;
  targetCycles: number;
  media: 'Buku' | 'Laptop' | 'HP' | 'Komputer';
  startedAt?: Date; // ✨ Sinkronisasi waktu akurat dari service
}) => {
  try {
    const db = getDb()

    // Langsung tembak ke database, murni tanpa embel-embel!
    await db.insert(pomodoroSessions).values(data)

  } catch (error) {
    logger.error('Gagal membuat sesi Pomodoro baru', error)
    throw new ResponseError(500, 'Terjadi kesalahan saat menyimpan sesi Pomodoro.')
  }
}

export const updateSessionStatus = async (sessionId: string, newStatus: 'running' | 'completed' | 'stopped') => {
  try {
    const db = getDb()
    await db.update(pomodoroSessions).set({ status: newStatus }).where(eq(pomodoroSessions.id, sessionId))
    logger.info(`Sesi Pomodoro ${sessionId} mengubah status menjadi: ${newStatus}.`)
  } catch (error) {
    logger.error(`Gagal mengubah status sesi ${sessionId}`, error)
    throw new ResponseError(500, 'Gagal mengubah status sesi Pomodoro.')
  }
}

export const findPomodoroLogsBySessionId = async (sessionId: string) => {
  const db = getDb()
  return await db.select().from(aiPomodoroLogs).where(eq(aiPomodoroLogs.sessionId, sessionId))
}

export const findSensorLogsBySessionId = async (sessionId: string) => {
  const db = getDb()
  return await db.select().from(aiSensorLogs).where(eq(aiSensorLogs.sessionId, sessionId))
}

export const findAllPomodoroSessions = async (userId: string) => {
  const db = getDb()
  const userDevices = await db.select({ id: devices.id }).from(devices).where(eq(devices.userId, userId))
  const deviceIds = userDevices.map(d => d.id)
  if (deviceIds.length === 0) return []
  return await db.select().from(pomodoroSessions).where(inArray(pomodoroSessions.deviceId, deviceIds)).orderBy(desc(pomodoroSessions.startedAt))
}

export const findPomodoroSessionById = async (sessionId: string) => {
  const db = getDb()
  const result = await db.select().from(pomodoroSessions).where(eq(pomodoroSessions.id, sessionId)).limit(1)
  return result[0] || null
}

export const deleteSessionById = async (sessionId: string) => {
  const db = getDb()
  await db.delete(pomodoroSessions).where(eq(pomodoroSessions.id, sessionId))
}

/**
 * Ambil semua sensor logs milik user (lewat join devices → sessions → sensor_logs).
 * Tidak perlu skema baru — cukup gunakan tabel yang sudah ada.
 */
export const findAllSensorLogsByUserId = async (userId: string) => {
  const db = getDb()
  const userDevices = await db.select({ id: devices.id }).from(devices).where(eq(devices.userId, userId))
  const deviceIds = userDevices.map(d => d.id)
  if (deviceIds.length === 0) return []

  const userSessions = await db
    .select({ id: pomodoroSessions.id })
    .from(pomodoroSessions)
    .where(inArray(pomodoroSessions.deviceId, deviceIds))

  const sessionIds = userSessions.map(s => s.id)
  if (sessionIds.length === 0) return []

  return await db
    .select()
    .from(aiSensorLogs)
    .where(inArray(aiSensorLogs.sessionId, sessionIds))
    .orderBy(desc(aiSensorLogs.createdAt))
}

/**
 * Ambil sessions + sensor logs milik user dalam rentang [fromUnixSec, toUnixSec).
 * Filter dilakukan langsung di SQL (integer unix seconds) — tidak ada konversi tipe
 * di lapisan aplikasi, sehingga aman untuk D1/SQLite Drizzle.
 */
export const findSessionsAndSensorLogsBetween = async (
  userId: string,
  fromUnixSec: number,
  toUnixSec: number
) => {
  const db = getDb()

  // 1. Device IDs milik user
  const userDevices = await db.select({ id: devices.id }).from(devices).where(eq(devices.userId, userId))
  const deviceIds = userDevices.map(d => d.id)
  if (deviceIds.length === 0) return { sessions: [], sensorLogs: [] }

  // 2. Sessions dalam rentang [from, to) — filter keduanya di SQL
  const filteredSessions = await db
    .select()
    .from(pomodoroSessions)
    .where(
      sql`${pomodoroSessions.deviceId} IN (${sql.join(deviceIds.map(id => sql`${id}`), sql`, `)})
          AND ${pomodoroSessions.startedAt} >= ${fromUnixSec}
          AND ${pomodoroSessions.startedAt} < ${toUnixSec}`
    )
    .orderBy(desc(pomodoroSessions.startedAt))

  if (filteredSessions.length === 0) return { sessions: filteredSessions, sensorLogs: [] }

  // 3. Sensor logs untuk sesi-sesi tersebut
  const sessionIds = filteredSessions.map(s => s.id)
  const filteredSensorLogs = await db
    .select()
    .from(aiSensorLogs)
    .where(inArray(aiSensorLogs.sessionId, sessionIds))
    .orderBy(desc(aiSensorLogs.createdAt))

  return { sessions: filteredSessions, sensorLogs: filteredSensorLogs }
}
