import bcrypt from 'bcryptjs' 
import { logger } from './logger'

export const hashPassword = async (password: string, saltRounds = 10): Promise<string> => {
  try {
    return await bcrypt.hash(password, saltRounds)
  } catch (error) {
    logger.error('Failed to hash password:', error)
    throw new Error('Password hashing failed')
  }
}

export const comparePassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword)
  } catch (error) {
    logger.error('Failed to compare password:', error)
    throw new Error('Password comparison failed')
  }
}

export const generateRandomPassword = (length: number = 12): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  // ✨ Menggunakan Web Crypto API agar tidak bisa di-hack/ditebak
  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)
  
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length]
  }
  
  return password
}

export const validatePasswordStrength = (password: string): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  
  if (password.length < 8) errors.push('Password minimal 8 karakter.')
  if (!/[a-z]/.test(password)) errors.push('Password harus mengandung huruf kecil.')
  if (!/[A-Z]/.test(password)) errors.push('Password harus mengandung huruf besar.')
  if (!/\d/.test(password)) errors.push('Password harus mengandung angka.')
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password harus mengandung karakter spesial.')
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}