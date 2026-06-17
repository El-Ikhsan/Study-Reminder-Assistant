import { Context } from 'hono'
import { validateBody } from '@/utils/validation'
import { ResponseError } from '@/utils/responseError'
import { updatePreferencesSchema } from './preferences.validation'
import * as preferencesService from './preferences.service'

export const getPreferences = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const result = await preferencesService.getPreferences(user.userId)
  return c.json({ success: true, data: { preferences: result } })
}

export const updatePreferences = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const data = await validateBody(c, updatePreferencesSchema)
  const result = await preferencesService.updatePreferences(user.userId, data)
  return c.json({ success: true, message: 'Preferensi pomodoro berhasil diperbarui', data: { preferences: result } })
}
