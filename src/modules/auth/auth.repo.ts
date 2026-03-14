import { eq } from 'drizzle-orm'
import { users, refreshTokens } from '@/db/schema'
import type { DB } from '@/db/client'
import type { Storage } from "@/storage/client"

// --- USER REPOSITORY ---

export const findUserByEmail = async (db: DB, email: string) => {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return result[0] || null
}

export const findUserById = async (db: DB, id: string) => {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return result[0] || null
}

export const createUser = async (db: DB, userData: typeof users.$inferInsert) => {
  const result = await db.insert(users).values(userData).returning()
  return result[0]
}

export type UserUpdatePayload = Partial<typeof users.$inferInsert>
export const updateUserData = async (db: DB, userId: string, data: Partial<typeof users.$inferInsert>) => {
  await db.update(users).set(data).where(eq(users.id, userId))
}

// --- REFRESH TOKEN REPOSITORY ---

export const saveRefreshToken = async (db: DB, tokenData: typeof refreshTokens.$inferInsert) => {
  await db.insert(refreshTokens).values(tokenData)
}

export const findRefreshToken = async (db: DB, token: string) => {
  const result = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token)).limit(1)
  return result[0] || null
}

export const deleteRefreshToken = async (db: DB, token: string) => {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token))
}

// --- AVATAR & STORAGE REPOSITORY ---

export const updateUserAvatarUrl = async (db: DB, userId: string, url: string | null) => {
  await db.update(users).set({ avatarUrl: url }).where(eq(users.id, userId))
}

export const uploadFileToR2 = async (bucket: Storage, fileName: string, file: File) => {
  await bucket.put(fileName, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  })
}

export const deleteFileFromR2 = async (bucket: Storage, fileName: string) => {
  await bucket.delete(fileName)
}