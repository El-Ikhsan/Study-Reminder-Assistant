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

export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token wajib disertakan.')
})

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter.').max(100).optional(),
  email: z.string().email('Format email tidak valid.').optional(),
  oldPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter.').max(100).optional(),
})
.refine(data => {
  if (data.newPassword && !data.oldPassword) return false;
  return true;
}, { message: "Password lama wajib diisi jika ingin mengganti password baru.", path: ["oldPassword"] })
.refine(data => data.name || data.email || data.newPassword, {
  message: "Minimal satu data (nama, email, atau password) harus diubah."
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>