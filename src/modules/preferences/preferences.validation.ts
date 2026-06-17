import { z } from 'zod'

export const updatePreferencesSchema = z.object({
  focusDuration: z.number().int().min(1, 'Durasi fokus minimal 1 menit.').max(120, 'Durasi fokus maksimal 120 menit.').optional(),
  breakDuration: z.number().int().min(1, 'Durasi istirahat minimal 1 menit.').max(60, 'Durasi istirahat maksimal 60 menit.').optional(),
  totalCycles: z.number().int().min(1, 'Siklus minimal 1.').max(20, 'Siklus maksimal 20.').optional(),
  learningMedia: z.enum(['Buku', 'Laptop', 'HP', 'Komputer']).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'Minimal satu preferensi harus diubah.',
})

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
