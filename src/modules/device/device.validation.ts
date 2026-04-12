import { z } from 'zod'

export const claimStatusCheckSchema = z.object({
  deviceIotId: z.string()
    .length(10, 'ID Device IoT harus 10 karakter.'),
})

export const claimDeviceSchema = z.object({
  deviceIotId: z.string()
    .length(10, 'ID Device IoT harus 10 karakter.'),
  deviceName: z.string()
    .min(3, 'Nama perangkat minimal 3 karakter.')
    .max(20, 'Nama perangkat maksimal 20 karakter.'),
})

export const deviceIdParamSchema = z.object({
  deviceId: z.string()
    .length(36, 'ID perangkat harus 36 karakter.'),
})
