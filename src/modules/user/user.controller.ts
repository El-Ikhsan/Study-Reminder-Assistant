import { Context } from 'hono'
import { validateBody } from '@/utils/validation'
import { ResponseError } from '@/utils/responseError'
import { updateUserSchema } from '@/modules/user/user.validation'
import * as userService from './user.service'

export const updateUser = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const data = await validateBody(c, updateUserSchema)
  const result = await userService.updateUser(user.userId, data)
  return c.json({ success: true, message: 'Data profil berhasil diperbarui', data: { user: result } })
}

export const getUserProfile = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const result = await userService.getUserProfile(user.userId)
  return c.json({ success: true, data: { user: result } })
}

export const addAvatar = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const body = await c.req.parseBody()
  const file = body['avatar'] as File
  if (!file) throw new ResponseError(400, 'File avatar wajib diunggah')

  const result = await userService.uploadUserAvatar(user.userId, file)
  return c.json({ success: true, message: 'Avatar berhasil diperbarui', data: result })
}

export const removeAvatar = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  await userService.removeUserAvatar(user.userId)
  return c.json({ success: true, message: 'Avatar berhasil dihapus' })
}
