import { Context } from 'hono'
import { validateBody } from '@/utils/validation'
import { ResponseError } from '@/utils/responseError'
import { registerSchema, loginSchema, updateUserSchema, refreshTokenSchema } from './auth.validation'
import * as authService from './auth.service'

export const registerUser = async (c: Context) => {
  const data = await validateBody(c, registerSchema)
  const result = await authService.registerUser(data)
  return c.json({ success: true, message: 'Registrasi berhasil', data: result }, 201)
}

export const login = async (c: Context) => {
  const data = await validateBody(c, loginSchema)
  const result = await authService.loginUser(data)
  return c.json({ success: true, message: 'Login berhasil', data: result })
}

export const refreshToken = async (c: Context) => {
  const data = await validateBody(c, refreshTokenSchema)
  const result = await authService.refreshUserToken(data.refreshToken)
  return c.json({ success: true, message: 'Token diperbarui', data: result })
}

export const updateUser = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const data = await validateBody(c, updateUserSchema)
  const result = await authService.updateUser(user.userId, data)
  return c.json({ success: true, message: 'Data profil berhasil diperbarui', data: { user: result } })
}

export const getUserProfile = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')
  
  const result = await authService.getUserProfile(user.userId)
  return c.json({ success: true, data: { user: result } })
}

export const addAvatar = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const body = await c.req.parseBody()
  const file = body['avatar'] as File
  if (!file) throw new ResponseError(400, 'File avatar wajib diunggah')

  const result = await authService.uploadUserAvatar(user.userId, file)
  return c.json({ success: true, message: 'Avatar berhasil diperbarui', data: result })
}

export const removeAvatar = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  await authService.removeUserAvatar(user.userId)
  return c.json({ success: true, message: 'Avatar berhasil dihapus' })
}

export const logout = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const body = await c.req.json()
  await authService.logoutUser(body.refreshToken)
  return c.json({ success: true, message: 'Logout berhasil' })
}