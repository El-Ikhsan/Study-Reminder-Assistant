import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { extractTokenFromHeader, verifyAccessToken, verifyRefreshToken, type TokenPayload } from '@/utils/jwt'
import { ResponseError } from '@/utils/responseError'
import { getConfig, type Bindings } from '@/config/env'
import { findDeviceById } from '@/modules/device/device.repo'

type AuthEnv = {
  Bindings: Bindings
  Variables: {
    user: TokenPayload
    refreshToken: string
  }
}

/**
 * Standard Auth Middleware (Support Header & Cookie)
 */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('authorization')
  
  // 1. Coba ambil dari Header dulu
  let token: any = extractTokenFromHeader(authHeader)
  
  // 2. Jika header kosong, coba ambil dari Cookie 'authToken'
  if (!token) {
    token = getCookie(c, 'authToken')
  }
  
  if (!token) {
    throw new ResponseError(401, 'Akses token tidak ditemukan. Silakan login kembali.')
  }
  
  try {
    const config = getConfig()
    const payload = await verifyAccessToken(token, config.jwt.secret)
    
    if (!payload) {
      throw new ResponseError(401, 'Akses token tidak valid atau sudah kadaluarsa.')
    }
    
    c.set('user', payload)
    await next()
  } catch (error) {
    throw new ResponseError(401, 'Sesi telah berakhir atau token tidak valid.')
  }
})

export const refreshTokenMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  // 1. Coba ambil dari Header dulu
  let token= c.req.header('X-Refresh-Token')
  
  // 2. Jika header kosong, coba ambil dari Cookie 'authToken'
  if (!token) {
    token = getCookie(c, 'refreshToken')
  }
  
  if (!token) {
    throw new ResponseError(401, 'Refresh token tidak ditemukan. Silakan login kembali.')
  }
  
  try {
    const config = getConfig()
    const payload = await verifyRefreshToken(token, config.jwt.refreshSecret)
    
    if (!payload) {
      throw new ResponseError(401, 'Refresh token tidak valid atau sudah kadaluarsa.')
    }
    
    c.set('refreshToken', token)
    c.set('user', payload)
    await next()
  } catch (error) {
    throw new ResponseError(401, 'Sesi telah berakhir atau token tidak valid.')
  }
})

export const deviceAuthMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('authorization')
  const queryToken = c.req.query('token')
  const token = extractTokenFromHeader(authHeader) || queryToken

  if (!token) throw new ResponseError(401, 'Device unauthorized: Token missing.')

  try {
    const config = getConfig()
    const payload = await verifyAccessToken(token, config.jwt.secret) as any
    
    if (payload.type === 'iot' && payload.deviceId) {
      const device = await findDeviceById(payload.deviceId)
      
      if (!device || device.tokenVersion !== payload.version) {

        throw new ResponseError(401, 'Device unauthorized: Token revoked or device deleted.')
      }
    }

    c.set('user', payload)
    await next()
  } catch (error) {
    //  Jika error-nya adalah ResponseError buatan kita, langsung lempar!
    if (error instanceof ResponseError) {
      throw error; 
    }

    throw new ResponseError(401, 'Device unauthorized: Invalid token format.')
  }
})