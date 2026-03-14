import { Context } from 'hono'
import { getConfig, type Bindings } from '@/config/env'
import type { DB } from '@/db/client'
import type { TokenPayload } from '@/utils/jwt'
import { ResponseError } from '@/utils/responseError'
import { validateBody } from '@/utils/validation'
import { registerSchema, loginSchema, updateUserSchema,refreshTokenSchema } from './auth.validation'
import * as authService from './auth.service'

type AuthContext = Context<{
  Bindings: Bindings
  Variables: {
    db: DB
    user?: TokenPayload
  }
}>

export const registerUser = async (c: AuthContext) => {
  const data = await validateBody(c, registerSchema)
  const db = c.get('db')
  const config = getConfig(c.env)

  const result = await authService.registerUser(db, config, data)

  return c.json({ success: true, message: 'Registrasi berhasil', data: result }, 201)
}

export const login = async (c: AuthContext) => {
  const data = await validateBody(c, loginSchema)
  const db = c.get('db')
  const config = getConfig(c.env)

  const result = await authService.loginUser(db, config, data)

  return c.json({ success: true, message: 'Login berhasil', data: result })
}

export const refreshToken = async (c: AuthContext) => {
  const data = await validateBody(c, refreshTokenSchema)
  const db = c.get('db')
  const config = getConfig(c.env)

  const result = await authService.refreshUserToken(db, config, data.refreshToken)

  return c.json({ success: true, message: 'Token diperbarui', data: result })
}

export const updateUser = async (c: AuthContext) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const data = await validateBody(c, updateUserSchema)
  const db = c.get('db')

  const result = await authService.updateUser(db, user.userId, data)

  return c.json({ success: true, message: 'Data profil berhasil diperbarui', data: { user: result } })
}

export const getUserProfile = async (c: AuthContext) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')
  
  const db = c.get('db')
  const result = await authService.getUserProfile(db, user.userId)

  return c.json({ success: true, data: { user: result } })
}

export const addAvatar = async (c: AuthContext) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const body = await c.req.parseBody()
  const file = body['avatar'] as File
  if (!file) throw new ResponseError(400, 'File avatar wajib diunggah')

  const db = c.get('db')
  const config = getConfig(c.env)
  
  // Asumsi fungsi ini akan diisi logika upload R2 di auth.service.ts
  const result = await authService.uploadUserAvatar(db, config, user.userId, file)

  return c.json({ success: true, message: 'Avatar berhasil diperbarui', data: result })
}

export const removeAvatar = async (c: AuthContext) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const db = c.get('db')
  const config = getConfig(c.env)

  // Asumsi fungsi ini akan diisi logika hapus R2 di auth.service.ts
  await authService.removeUserAvatar(db, config, user.userId)

  return c.json({ success: true, message: 'Avatar berhasil dihapus' })
}

export const logout = async (c: AuthContext) => {
  const user = c.get('user')
  if (!user) throw new ResponseError(401, 'Autentikasi diperlukan')

  const body = await c.req.json()
  if (!body.refreshToken) throw new ResponseError(400, 'Refresh token diperlukan')

  const db = c.get('db')
  await authService.logoutUser(db, body.refreshToken)

  return c.json({ success: true, message: 'Logout berhasil' })
}