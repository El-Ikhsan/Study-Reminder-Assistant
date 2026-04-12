import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string()
    .min(2, 'Nama minimal terdiri dari 2 karakter.')
    .max(60, 'Nama maksimal 60 karakter.'),
  email: z.string()
    .max(70, 'Email maksimal 70 karakter.')
    .email('Format email tidak valid.'),
  password: z.string()
    .min(8, 'Password minimal terdiri dari 8 karakter.')
    .max(255, 'Password maksimal 255 karakter.')
})

export const loginSchema = z.object({
  email: z.string()
    .max(70, 'Email maksimal 70 karakter.')
    .email('Format email tidak valid.'),
  password: z.string()
    .min(8, 'Password minimal terdiri dari 8 karakter.')
    .max(255, 'Password maksimal 255 karakter.')
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>