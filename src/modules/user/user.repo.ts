import { eq } from 'drizzle-orm'
import { users } from '@/db/schema'
import { getDb } from '@/db/client' 
import { getStorage } from "@/storage/client" 

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

export type UserUpdatePayload = Partial<typeof users.$inferInsert>
export const updateUserData = async (userId: string, data: Partial<typeof users.$inferInsert>) => {
  const db = getDb()
  await db.update(users).set(data).where(eq(users.id, userId))
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