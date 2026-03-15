import { eq } from 'drizzle-orm'
import { users, refreshTokens } from '@/db/schema'
import { getDb } from '@/db/client' // ✨ Asumsi helper untuk ambil instance DB
import { getStorage } from "@/storage/client" // ✨ Asumsi helper untuk ambil instance R2


// --- USER REPOSITORY ---

export const findUserByEmail = async (email: string) => {
  const db = getDb()
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return result[0] || null
}

export const findUserById = async (id: string) => {
  const db = getDb()
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return result[0] || null
}

export const createUser = async (userData: typeof users.$inferInsert) => {
  const db = getDb()
  const result = await db.insert(users).values(userData).returning()
  return result[0]
}
export type UserUpdatePayload = Partial<typeof users.$inferInsert>
export const updateUserData = async (userId: string, data: Partial<typeof users.$inferInsert>) => {
  const db = getDb()
  await db.update(users).set(data).where(eq(users.id, userId))
}

// --- REFRESH TOKEN REPOSITORY ---

export const saveRefreshToken = async (tokenData: typeof refreshTokens.$inferInsert) => {
  const db = getDb()
  await db.insert(refreshTokens).values(tokenData)
}

export const findRefreshToken = async (token: string) => {
  const db = getDb()
  const result = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token)).limit(1)
  return result[0] || null
}

export const deleteRefreshToken = async (token: string) => {
  const db = getDb()
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token))
}

// --- AVATAR & STORAGE REPOSITORY ---

export const updateUserAvatarUrl = async (userId: string, url: string | null) => {
  const db = getDb()
  await db.update(users).set({ avatarUrl: url }).where(eq(users.id, userId))
}

export const uploadFileToR2 = async (fileName: string, file: File) => {
  const bucket = getStorage()
  await bucket.put(fileName, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  })
}

export const deleteFileFromR2 = async (fileName: string) => {
  const bucket = getStorage()
  await bucket.delete(fileName)
}