import * as authRepo from './auth.repo'
import { hashPassword, comparePassword } from '@/utils/password'
import { generateTokens, TokenPayload } from '@/utils/jwt'
import { ResponseError } from '@/utils/responseError'
import { getConfig } from '@/config/env' // 
import type { RegisterInput, LoginInput, UpdateUserInput } from './auth.validation'
import type { UserUpdatePayload } from './auth.repo'

export const registerUser = async (data: RegisterInput) => {
  const config = getConfig() // 🎯 Ambil config di sini
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

  const tokens = await generateTokens(
    { userId: newUser.id, email: newUser.email },
    config.jwt.secret,
    config.jwt.refreshSecret
  )

  await authRepo.saveRefreshToken({
    id: crypto.randomUUID(),
    userId: newUser.id,
    token: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  const { password, ...userWithoutPassword } = newUser
  return { user: userWithoutPassword, tokens }
}

export const loginUser = async (data: LoginInput) => {
  const config = getConfig()
  const user = await authRepo.findUserByEmail(data.email)
  if (!user) throw new ResponseError(401, 'Email atau password salah.')

  const isMatch = await comparePassword(data.password, user.password)
  if (!isMatch) throw new ResponseError(401, 'Email atau password salah.')

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

  await authRepo.deleteRefreshToken(oldToken)

  const tokens = await generateTokens(
    { userId: user.userId, email: user.email },
    config.jwt.secret,
    config.jwt.refreshSecret
  )

  await authRepo.saveRefreshToken({
    id: crypto.randomUUID(),
    userId: user.userId,
    token: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  return tokens
}

export const updateUser = async (userId: string, data: UpdateUserInput) => {
  const updatePayload: UserUpdatePayload = {}

  if (data.email) {
    const existing = await authRepo.findUserByEmail(data.email)
    if (existing && existing.id !== userId) {
      throw new ResponseError(400, 'Email sudah digunakan.')
    }
    updatePayload.email = data.email
  }

  if (data.name) updatePayload.name = data.name

  if (data.newPassword && data.oldPassword) {
    const user = await authRepo.findUserById(userId)
    if (!user) throw new ResponseError(404, 'User tidak ditemukan.')

    const isMatch = await comparePassword(data.oldPassword, user.password)
    if (!isMatch) throw new ResponseError(400, 'Password lama tidak sesuai.')

    updatePayload.password = await hashPassword(data.newPassword)
  }

  if (Object.keys(updatePayload).length > 0) {
    await authRepo.updateUserData(userId, updatePayload)
  }

  const updatedUser = await authRepo.findUserById(userId)
  if (!updatedUser) throw new ResponseError(404, 'User tidak ditemukan.')

  const { password, ...userProfile } = updatedUser
  return userProfile
}

export const getUserProfile = async (userId: string) => {
  const user = await authRepo.findUserById(userId)
  if (!user) throw new ResponseError(404, 'User tidak ditemukan.')
  const { password, ...userProfile } = user
  return userProfile
}

export const logoutUser = async (refreshToken: string) => {
  await authRepo.deleteRefreshToken(refreshToken)
  return { success: true }
}

export const uploadUserAvatar = async (userId: string, file: File) => {
  const config = getConfig()
  if (!file.type.startsWith('image/')) throw new ResponseError(400, 'File tidak valid.')

  const ext = file.name.split('.').pop()
  const fileName = `avatars/${userId}-${Date.now()}.${ext}`

  await authRepo.uploadFileToR2(fileName, file)

  const publicUrl = `${config.r2.publicUrl}/${fileName}` 
  await authRepo.updateUserAvatarUrl(userId, publicUrl)

  return { avatarUrl: publicUrl }
}

export const removeUserAvatar = async (userId: string) => {
  const user = await authRepo.findUserById(userId)
  if (!user || !user.avatarUrl) return { success: true }

  const urlParts = user.avatarUrl.split('/')
  const fileName = `avatars/${urlParts[urlParts.length - 1]}`

  await authRepo.deleteFileFromR2(fileName)
  await authRepo.updateUserAvatarUrl(userId, null)

  return { success: true }
}