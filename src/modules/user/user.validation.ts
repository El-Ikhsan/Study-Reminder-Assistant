import { z } from 'zod'

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter.').max(60, 'Nama maksimal 60 karakter.').optional(),
  email: z.string().max(70, 'Email maksimal 70 karakter.').email('Format email tidak valid.').optional(),
  oldPassword: z.string().min(8, 'Password lama minimal 8 karakter.').max(255, 'Password lama maksimal 255 karakter.').optional(),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter.').max(255, 'Password baru maksimal 255 karakter.').optional(),
})
.refine(data => {
  if (data.newPassword && !data.oldPassword) return false;
  return true;
}, { message: "Password lama wajib diisi jika ingin mengganti password baru.", path: ["oldPassword"] })
.refine(data => data.name || data.email || data.newPassword, {
  message: "Minimal satu data (nama, email, atau password) harus diubah."
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>