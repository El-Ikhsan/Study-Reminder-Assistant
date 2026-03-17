import { eq } from 'drizzle-orm'
import { devices, sensorTelemetry } from '@/db/schema'
import { getDb } from '@/db/client'

export const findDeviceByUuid = async (uuid: string) => {
  const db = getDb()
  const result = await db.select().from(devices).where(eq(devices.uuid, uuid)).limit(1)
  return result[0] || null
}

export const insertDevice = async (data: typeof devices.$inferInsert) => {
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

export const insertTelemetry = async (data: typeof sensorTelemetry.$inferInsert) => {
  const db = getDb()
  return await db.insert(sensorTelemetry).values(data)
}

export const updateDeviceData = async (id: string, data: Partial<typeof devices.$inferInsert>) => {
  const db = getDb()
  await db.update(devices).set(data).where(eq(devices.id, id))
}