import { eq } from 'drizzle-orm'
import { users, refreshTokens } from '@/db/schema'
import { getDb } from '@/db/client'

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

export const deleteRefreshTokensByUserId = async (userId: string) => {
  const db = getDb()
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
}

