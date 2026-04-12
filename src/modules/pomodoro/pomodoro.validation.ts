import { z } from 'zod'

export const startPomodoroSchema = z.object({
  deviceId: z.string()
    .length(36, 'ID perangkat harus 36 karakter.'),
  recipe: z.object({
    focusDuration: z.number().int().positive('Durasi fokus harus lebih dari 0.'),
    breakDuration: z.number().int().positive('Durasi istirahat harus lebih dari 0.'),
    cycles: z.number().int().positive('Jumlah siklus harus lebih dari 0.'),
    mode: z.enum(['normal', 'panjang', 'deadline']).optional(),
    sensorIntervalSec: z.number().int().positive('Interval sensor harus lebih dari 0.'),
    currentCycle: z.number().int().positive().optional(),
    currentMode: z.enum(['fokus', 'istirahat']).optional(),
    currentPhase: z.enum(['awal', 'tengah', 'akhir']).optional(),
    status: z.enum(['running', 'paused', 'completed', 'cancelled']).optional(),
  }),
})

export const pomodoroIdParamSchema = z.object({
  pomodoroId: z.string()
    .length(36, 'ID pomodoro harus 36 karakter.'),
})
