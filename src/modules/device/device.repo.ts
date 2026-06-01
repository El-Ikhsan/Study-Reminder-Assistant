import { eq } from 'drizzle-orm'
import { devices, pomodoroSessions } from '@/db/schema'
import { getDb } from '@/db/client'

export const findDeviceByDeviceIotId = async (deviceIotId: string) => {
  const db = getDb()
  const result = await db.select().from(devices).where(eq(devices.deviceIotId, deviceIotId)).limit(1)
  return result[0] || null
}

export const insertDeviceIotId = async (data: { id: string, deviceIotId: string, status: 'unclaimed' }) => {
  const db = getDb()
  const result = await db.insert(devices).values(data).returning()
  return result[0]
}

export const findDeviceById = async (id: string) => {
  const db = getDb()
  const result = await db.select().from(devices).where(eq(devices.id, id)).limit(1)
  return result[0] || null
}

export const findDevicesByUserId = async (userId: string) => {
  const db = getDb()
  return await db.select().from(devices).where(eq(devices.userId, userId))
}

export const updateDeviceData = async (id: string, data: Partial<typeof devices.$inferInsert>) => {
  const db = getDb()
  await db.update(devices).set(data).where(eq(devices.id, id))
}

export const deletePomodoroSessionsByDeviceId = async (deviceId: string) => {
  const db = getDb()
  await db.delete(pomodoroSessions).where(eq(pomodoroSessions.deviceId, deviceId))
}

export const deleteDeviceById = async (id: string) => {
  const db = getDb()
  await db.delete(devices).where(eq(devices.id, id))
}