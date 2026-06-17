import { ResponseError } from '@/utils/responseError'
import * as preferencesRepo from './preferences.repo'
import type { UpdatePreferencesInput } from './preferences.validation'

const DEFAULT_PREFERENCES = {
  focusDuration: 25,
  breakDuration: 5,
  totalCycles: 4,
  learningMedia: 'Laptop' as const,
}

export const getPreferences = async (userId: string) => {
  const prefs = await preferencesRepo.findPreferencesByUserId(userId)

  if (!prefs) {
    // Kembalikan default tanpa menyimpan — akan disimpan saat user pertama kali update
    return DEFAULT_PREFERENCES
  }

  return {
    focusDuration: prefs.focusDuration,
    breakDuration: prefs.breakDuration,
    totalCycles: prefs.totalCycles,
    learningMedia: prefs.learningMedia,
  }
}

export const updatePreferences = async (userId: string, data: UpdatePreferencesInput) => {
  const current = await preferencesRepo.findPreferencesByUserId(userId)

  const merged = {
    focusDuration: data.focusDuration ?? current?.focusDuration ?? DEFAULT_PREFERENCES.focusDuration,
    breakDuration: data.breakDuration ?? current?.breakDuration ?? DEFAULT_PREFERENCES.breakDuration,
    totalCycles: data.totalCycles ?? current?.totalCycles ?? DEFAULT_PREFERENCES.totalCycles,
    learningMedia: data.learningMedia ?? current?.learningMedia ?? DEFAULT_PREFERENCES.learningMedia,
  }

  const result = await preferencesRepo.upsertPreferences(userId, merged)
  if (!result) throw new ResponseError(500, 'Gagal menyimpan preferensi pomodoro.')

  return {
    focusDuration: result.focusDuration,
    breakDuration: result.breakDuration,
    totalCycles: result.totalCycles,
    learningMedia: result.learningMedia,
  }
}
