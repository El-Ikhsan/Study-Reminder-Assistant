import * as userRepo from '@/modules/user/user.repo'
import { hashPassword, comparePassword } from '@/utils/password'
import { ResponseError } from '@/utils/responseError'
import { getConfig } from '@/config/env'
import type { UpdateUserInput } from '@/modules/user/user.validation'
import type { UserUpdatePayload } from '@/modules/user/user.repo'

export const updateUser = async (userId: string, data: UpdateUserInput) => {
  const updatePayload: UserUpdatePayload = {}

  if (data.email) {
    const existing = await userRepo.findUserByEmail(data.email)
    if (existing && existing.id !== userId) {
      throw new ResponseError(400, 'Email sudah digunakan.')
    }
    updatePayload.email = data.email
  }

  if (data.name) updatePayload.name = data.name

  if (data.newPassword && data.oldPassword) {
    const user = await userRepo.findUserById(userId)
    if (!user) throw new ResponseError(404, 'User tidak ditemukan.')

    const isMatch = await comparePassword(data.oldPassword, user.password)
    if (!isMatch) throw new ResponseError(400, 'Password lama tidak sesuai.')

    updatePayload.password = await hashPassword(data.newPassword)
  }

  if (Object.keys(updatePayload).length > 0) {
    await userRepo.updateUserData(userId, updatePayload)
  }

  const updatedUser = await userRepo.findUserById(userId)
  if (!updatedUser) throw new ResponseError(404, 'User tidak ditemukan.')

  const { password, ...userProfile } = updatedUser
  return userProfile
}

export const getUserProfile = async (userId: string) => {
  const user = await userRepo.findUserById(userId)
  if (!user) throw new ResponseError(404, 'User tidak ditemukan.')
  const { password, ...userProfile } = user
  return userProfile
}

export const uploadUserAvatar = async (userId: string, file: File) => {
  const config = getConfig()
  if (!file.type.startsWith('image/')) throw new ResponseError(400, 'File tidak valid.')

  const ext = file.name.split('.').pop()
  const fileName = `avatars/${userId}.${ext}`

  await userRepo.uploadFileToR2(fileName, file)

  const publicUrl = `${config.r2.publicUrl}/${fileName}`
  await userRepo.updateUserAvatarUrl(userId, publicUrl)

  return { avatarUrl: publicUrl }
}

export const removeUserAvatar = async (userId: string) => {
  const user = await userRepo.findUserById(userId)
  if (!user || !user.avatarUrl) return { success: true }

  const urlParts = user.avatarUrl.split('/')
  const fileNameWithExt = urlParts[urlParts.length - 1]
  const fileName = `avatars/${fileNameWithExt}`

  await userRepo.deleteFileFromR2(fileName)
  await userRepo.updateUserAvatarUrl(userId, null)

  return { success: true }
}
