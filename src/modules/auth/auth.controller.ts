import { Context } from 'hono'
import { validateBody } from '@/utils/validation'
import { ResponseError } from '@/utils/responseError'
import { registerSchema, loginSchema } from './auth.validation'
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
  const user = c.get('user')
  const refreshToken = c.get('refreshToken')
  const result = await authService.refreshUserToken(user, refreshToken)
  return c.json({ success: true, message: 'Token diperbarui', data: result })
}

export const logout = async (c: Context) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')
  
  await authService.logoutUser(user.userId)
  return c.json({ success: true, message: 'Logout berhasil' })
}