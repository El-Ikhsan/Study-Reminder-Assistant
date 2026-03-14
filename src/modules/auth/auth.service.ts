import * as authRepo from './auth.repo'
import { hashPassword, comparePassword } from '@/utils/password'
import { generateTokens, verifyRefreshToken } from '@/utils/jwt'
import { ResponseError } from '@/utils/responseError'
import type { DB } from '@/db/client'
import type { AppConfig } from '@/config/env'
import type { RegisterInput, LoginInput, UpdateUserInput } from './auth.validation'
import type { UserUpdatePayload } from './auth.repo'

export const registerUser = async (db: DB, config: AppConfig, data: RegisterInput) => {
  const existingUser = await authRepo.findUserByEmail(db, data.email)
  if (existingUser) throw new ResponseError(400, 'Email ini sudah terdaftar. Gunakan email lain.')

  const hashedPassword = await hashPassword(data.password)
  const userId = crypto.randomUUID()

  const newUser = await authRepo.createUser(db, {
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

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await authRepo.saveRefreshToken(db, {
    id: crypto.randomUUID(),
    userId: newUser.id,
    token: tokens.refreshToken,
    expiresAt,
  })

  const { password, ...userWithoutPassword } = newUser
  return { user: userWithoutPassword, tokens }
}

export const loginUser = async (db: DB, config: AppConfig, data: LoginInput) => {
  const user = await authRepo.findUserByEmail(db, data.email)
  if (!user) throw new ResponseError(401, 'Email atau password salah.')

  const isMatch = await comparePassword(data.password, user.password)
  if (!isMatch) throw new ResponseError(401, 'Email atau password salah.')

  const tokens = await generateTokens(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    config.jwt.refreshSecret
  )

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await authRepo.saveRefreshToken(db, {
    id: crypto.randomUUID(),
    userId: user.id,
    token: tokens.refreshToken,
    expiresAt,
  })

  const { password, ...userWithoutPassword } = user
  return { user: userWithoutPassword, tokens }
}

export const refreshUserToken = async (db: DB, config: AppConfig, oldToken: string) => {
  const payload = await verifyRefreshToken(oldToken, config.jwt.refreshSecret)
  if (!payload) throw new ResponseError(401, 'Refresh token tidak valid.')

  const storedToken = await authRepo.findRefreshToken(db, oldToken)
  if (!storedToken) throw new ResponseError(401, 'Sesi telah berakhir.')

  // Rotasi token untuk keamanan
  await authRepo.deleteRefreshToken(db, oldToken)

  const user = await authRepo.findUserById(db, payload.userId)
  if (!user) throw new ResponseError(404, 'User tidak ditemukan.')

  const tokens = await generateTokens(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    config.jwt.refreshSecret
  )

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await authRepo.saveRefreshToken(db, {
    id: crypto.randomUUID(),
    userId: user.id,
    token: tokens.refreshToken,
    expiresAt,
  })

  return tokens
}

export const updateUser = async (db: DB, userId: string, data: UpdateUserInput) => {
  const updatePayload: UserUpdatePayload = {}

  if (data.email) {
    const existing = await authRepo.findUserByEmail(db, data.email)
    if (existing && existing.id !== userId) {
      throw new ResponseError(400, 'Email sudah digunakan oleh pengguna lain.')
    }
    updatePayload.email = data.email
  }

  if (data.name) {
    updatePayload.name = data.name
  }

  if (data.newPassword && data.oldPassword) {
    const user = await authRepo.findUserById(db, userId)
    if (!user) throw new ResponseError(404, 'User tidak ditemukan.')

    const isMatch = await comparePassword(data.oldPassword, user.password)
    if (!isMatch) throw new ResponseError(400, 'Password lama tidak sesuai.')

    updatePayload.password = await hashPassword(data.newPassword)
  }

  if (Object.keys(updatePayload).length > 0) {
    await authRepo.updateUserData(db, userId, updatePayload)
  }

  const updatedUser = await authRepo.findUserById(db, userId)
  if (!updatedUser) throw new ResponseError(404, 'User tidak ditemukan.')

  const { password, ...userProfile } = updatedUser
  return userProfile
}

export const getUserProfile = async (db: DB, userId: string) => {
  const user = await authRepo.findUserById(db, userId)
  if (!user) throw new ResponseError(404, 'User tidak ditemukan.')
  
  const { password, ...userProfile } = user
  return userProfile
}

export const logoutUser = async (db: DB, refreshToken: string) => {
  await authRepo.deleteRefreshToken(db, refreshToken)
  return { success: true }
}

export const uploadUserAvatar = async (db: DB, config: AppConfig, userId: string, file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new ResponseError(400, 'File harus berupa gambar yang valid.')
  }

  const ext = file.name.split('.').pop()
  const fileName = `avatars/${userId}-${Date.now()}.${ext}`

  await authRepo.uploadFileToR2(config.bucket, fileName, file)

  const publicUrl = `https://pub-xxxxxx.r2.dev/${fileName}` 
  await authRepo.updateUserAvatarUrl(db, userId, publicUrl)

  return { avatarUrl: publicUrl }
}

export const removeUserAvatar = async (db: DB, config: AppConfig, userId: string) => {
  const user = await authRepo.findUserById(db, userId)
  if (!user || !user.avatarUrl) return { success: true }

  const urlParts = user.avatarUrl.split('/')
  const fileName = `avatars/${urlParts[urlParts.length - 1]}`

  await authRepo.deleteFileFromR2(config.bucket, fileName)
  await authRepo.updateUserAvatarUrl(db, userId, null)

  return { success: true }
}