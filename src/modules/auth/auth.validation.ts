import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string()
    .min(2, 'Nama minimal terdiri dari 2 karakter.')
    .max(100, 'Nama terlalu panjang.'),
  email: z.string()
    .email('Format email tidak valid.'),
  password: z.string()
    .min(8, 'Password minimal terdiri dari 8 karakter.')
    .max(100, 'Password terlalu panjang.')
})

export const loginSchema = z.object({
  email: z.string()
    .email('Format email tidak valid.'),
  password: z.string()
    .min(1, 'Password wajib diisi.') // Saat login, cukup pastikan tidak kosong
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>