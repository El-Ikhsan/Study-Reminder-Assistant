import { z } from 'zod'

export const claimStatusCheckSchema = z.object({
  rinchanId: z.string().min(1, "ID Rinchan wajib diisi"),
})

export const claimDeviceSchema = z.object({
  rinchanId: z.string().min(1, "ID Rinchan wajib diisi"),
  deviceName: z.string().min(3, "Nama perangkat minimal 3 karakter").max(30),
})

export const deviceIdParamSchema = z.object({
  deviceId: z.string().min(1, 'Device ID wajib diisi'),
})
