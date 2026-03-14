import { sign, verify, decode } from 'hono/jwt'
import { logger } from './logger'

export interface TokenPayload {
  userId: string
  email: string
  role?: string
  exp?: number // Diperlukan oleh hono/jwt untuk waktu kadaluarsa
  iat?: number
}

export interface JWTTokens {
  accessToken: string
  refreshToken: string
}

// ✨ Fungsi sekarang ASYNC dan meminta 'secret' dari luar
export const generateAccessToken = async (payload: object, secret: string): Promise<string> => {
  // Tambahkan kadaluarsa 15 menit dari sekarang (dalam detik)
  const exp = Math.floor(Date.now() / 1000) + (15 * 60)
  return await sign({ ...payload, exp }, secret)
}

export const generateRefreshToken = async (payload: object, secret: string): Promise<string> => {
  // Tambahkan kadaluarsa 7 hari (dalam detik)
  const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
  return await sign({ ...payload, exp }, secret)
}

export const generateTokens = async (
  payload: Omit<TokenPayload, 'exp' | 'iat'>, 
  accessSecret: string, 
  refreshSecret: string
): Promise<JWTTokens> => {
  const accessToken = await generateAccessToken(payload, accessSecret)
  const refreshToken = await generateRefreshToken(payload, refreshSecret)
  
  return {
    accessToken,
    refreshToken,
  }
}

export const verifyAccessToken = async (token: string, secret: string): Promise<TokenPayload | null> => {
  try {
    const decoded = await verify(token, secret, 'HS256') as unknown as TokenPayload
    return decoded
  } catch (error) {
    logger.error('Access token verification failed:', error)
    return null
  }
}

export const verifyRefreshToken = async (token: string, secret: string): Promise<TokenPayload | null> => {
  try {
    const decoded = await verify(token, secret, 'HS256') as unknown as TokenPayload
    return decoded
  } catch (error) {
    logger.error('Refresh token verification failed:', error)
    return null
  }
}

export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null
  }
  
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }
  
  return parts[1]
}

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const { payload } = decode(token)
    return payload as unknown as TokenPayload
  } catch (error) {
    logger.error('Failed to decode token:', error)
    return null
  }
}

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeToken(token)
  if (!payload || !payload.exp) return true
  
  return Date.now() >= payload.exp * 1000
}