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

export const updateDeviceSchema = z.object({
  deviceName: z.string()
    .min(3, 'Nama perangkat minimal 3 karakter.')
    .max(20, 'Nama perangkat maksimal 20 karakter.')
    .optional(),
  tokenVersion: z.number().int().optional(),
})

export const deviceIdParamSchema = z.object({
  deviceId: z.string()
    .length(36, 'ID perangkat harus 36 karakter.'),
})

export const deviceIdRouteParamSchema = z.object({
  id: z.string()
    .length(36, 'ID perangkat harus 36 karakter.'),
})

// ====================================================
// 📡 SKEMA VALIDASI PENGATURAN HARDWARE (Brightness & Volume)
// ====================================================

export const setBrightnessSchema = z.object({
  deviceId: z.string().length(36, 'ID perangkat harus 36 karakter.'),
  value: z.number()
    .int('Nilai brightness harus bilangan bulat.')
    .min(0, 'Brightness minimal 0%.')
    .max(100, 'Brightness maksimal 100%.'),
})

export const setVolumeSchema = z.object({
  deviceId: z.string().length(36, 'ID perangkat harus 36 karakter.'),
  value: z.number()
    .int('Nilai volume harus bilangan bulat.')
    .min(0, 'Volume minimal 0%.')
    .max(100, 'Volume maksimal 100%.'),
})
