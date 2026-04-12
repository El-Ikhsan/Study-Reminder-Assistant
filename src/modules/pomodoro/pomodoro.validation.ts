import { z } from 'zod'

export const startPomodoroSchema = z.object({
  deviceId: z.string().min(1, 'Device ID wajib diisi'),
  recipe: z.object({
    focusDuration: z.number().int().positive('Focus duration harus lebih dari 0'),
    breakDuration: z.number().int().positive('Break duration harus lebih dari 0'),
    cycles: z.number().int().positive('Cycles harus lebih dari 0'),
    mode: z.enum(['normal', 'panjang', 'deadline']).optional(),
    sensorIntervalSec: z.number().int().positive('Sensor interval harus di isi'),
    currentCycle: z.number().int().positive().optional(),
    currentMode: z.enum(['fokus', 'istirahat']).optional(),
    currentPhase: z.enum(['awal', 'tengah', 'akhir']).optional(),
    status: z.enum(['running', 'paused', 'completed', 'cancelled']).optional(),
  }),
})

export const pomodoroIdParamSchema = z.object({
  pomodoroId: z.string().min(1, 'Pomodoro ID wajib diisi'),
})
