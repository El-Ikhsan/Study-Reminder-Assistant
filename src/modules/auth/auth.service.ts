import * as authRepo from './auth.repo'
import { hashPassword, comparePassword } from '@/utils/password'
import { generateAccessToken, generateTokens, TokenPayload } from '@/utils/jwt'
import { ResponseError } from '@/utils/responseError'
import { getConfig } from '@/config/env'
import type { RegisterInput, LoginInput } from './auth.validation'

export const registerUser = async (data: RegisterInput) => {
  const existingUser = await authRepo.findUserByEmail(data.email)
  if (existingUser) throw new ResponseError(400, 'Email ini sudah terdaftar.')

  const hashedPassword = await hashPassword(data.password)
  const userId = crypto.randomUUID()

  const newUser = await authRepo.createUser({
    id: userId,
    email: data.email,
    name: data.name,
    password: hashedPassword,
  })

  const { password, ...userWithoutPassword } = newUser
  return { user: userWithoutPassword}
}

export const loginUser = async (data: LoginInput) => {
  const config = getConfig()
  const user = await authRepo.findUserByEmail(data.email)
  if (!user) throw new ResponseError(401, 'Email atau password salah.')

  const isMatch = await comparePassword(data.password, user.password)
  if (!isMatch) throw new ResponseError(401, 'Email atau password salah.')
  
  await authRepo.deleteRefreshTokensByUserId(user.id)
  
  const tokens = await generateTokens(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    config.jwt.refreshSecret
  )

  await authRepo.saveRefreshToken({
    id: crypto.randomUUID(),
    userId: user.id,
    token: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  const { password, ...userWithoutPassword } = user
  return { user: userWithoutPassword, tokens }
}

export const refreshUserToken = async (user: TokenPayload, oldToken: string) => {
  const config = getConfig()
  const payload = await authRepo.findRefreshToken(oldToken)
  if (!payload)  throw new ResponseError(401, 'Refresh token tidak valid atau sudah kadaluarsa.')

  if (payload.userId !== user.userId) {
    throw new ResponseError(401, 'Refresh token tidak valid untuk pengguna ini.')
  }

  const tokens = await generateAccessToken(
    { userId: user.userId, email: user.email },
    config.jwt.secret,
  )

  return { accessToken: tokens }
}

export const logoutUser = async (userId: string) => {
  await authRepo.deleteRefreshTokensByUserId(userId)
  return { success: true }
}