import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { userPomodoroPreferences } from '@/db/schema'


export type PomodoroPreferencesPayload = {
  focusDuration: number
  breakDuration: number
  totalCycles: number
  learningMedia: 'Buku' | 'Laptop' | 'HP' | 'Komputer'
}

export const findPreferencesByUserId = async (userId: string) => {
  const db = getDb()
  const result = await db
    .select()
    .from(userPomodoroPreferences)
    .where(eq(userPomodoroPreferences.userId, userId))
    .limit(1)
  return result[0] || null
}

export const upsertPreferences = async (userId: string, data: PomodoroPreferencesPayload) => {
  const db = getDb()

  const existing = await findPreferencesByUserId(userId)

  if (existing) {
    await db
      .update(userPomodoroPreferences)
      .set({
        focusDuration: data.focusDuration,
        breakDuration: data.breakDuration,
        totalCycles: data.totalCycles,
        learningMedia: data.learningMedia,
      })
      .where(eq(userPomodoroPreferences.userId, userId))
  } else {
    await db.insert(userPomodoroPreferences).values({
      id: crypto.randomUUID(),
      userId,
      focusDuration: data.focusDuration,
      breakDuration: data.breakDuration,
      totalCycles: data.totalCycles,
      learningMedia: data.learningMedia,
    })
  }

  return findPreferencesByUserId(userId)
}
