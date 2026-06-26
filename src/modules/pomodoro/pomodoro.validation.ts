import { z } from 'zod'

export const startPomodoroSchema = z.object({
  deviceId: z.string()
    .length(36, 'ID perangkat harus 36 karakter.'),
  recipe: z.object({
    focusDuration: z.number().int().positive('Durasi fokus harus lebih dari 0.'),
    breakDuration: z.number().int().positive('Durasi istirahat harus lebih dari 0.'),
    cycles: z.number().int().positive('Jumlah siklus harus lebih dari 0.'),
    media: z.enum(['Buku', 'Laptop', 'HP', 'Komputer']),
  }),
})

export const pomodoroIdParamSchema = z.object({
  pomodoroId: z.string()
    .length(36, 'ID pomodoro harus 36 karakter.'),
})

export const stopPomodoroSchema = z.object({
  sessionId: z.string().length(36, 'Session ID harus 36 karakter.'),
  deviceId: z.string().length(36, 'ID perangkat harus 36 karakter.'),
})
