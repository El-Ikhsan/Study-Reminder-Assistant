import { createMiddleware } from 'hono/factory'
import { extractTokenFromHeader, verifyAccessToken, TokenPayload } from '@/utils/jwt'
import { ResponseError } from '@/utils/responseError'
import { getConfig, type Bindings } from '@/config/env' // Pastikan type Bindings di-import

// 1. Deklarasikan tipe Variables DAN Bindings khusus untuk middleware ini
type AuthEnv = {
  Bindings: Bindings // ✨ Tambahkan ini agar c.env dikenali oleh getConfig!
  Variables: {
    user: TokenPayload
  }
}

// 2. Gunakan createMiddleware agar Hono tahu 'c.set' dan 'c.get' aman
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('authorization')
  const token = extractTokenFromHeader(authHeader)
  
  if (!token) {
    throw new ResponseError(401, 'Akses token tidak ditemukan. Silakan login kembali.')
  }
  
  try {
    // ✨ getConfig sekarang tahu c.env itu isinya Bindings
    const config = getConfig()
    const payload = await verifyAccessToken(token, config.jwt.secret)
    
    if (!payload) {
      throw new ResponseError(401, 'Akses token tidak valid atau sudah kadaluarsa.')
    }
    
    // Simpan ke context. TypeScript sekarang tahu 'user' itu ada!
    c.set('user', payload)
    
    await next()
  } catch (error) {
    throw new ResponseError(401, 'Sesi telah berakhir atau token tidak valid.')
  }
})

// Optional auth middleware
export const optionalAuthMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('authorization')
  const token = extractTokenFromHeader(authHeader)
  
  if (token) {
    try {
      // ✨ PERBAIKAN: Gunakan getConfig() secara konsisten!
      const config = getConfig()
      const payload = await verifyAccessToken(token, config.jwt.secret)
      if (payload) {
        c.set('user', payload)
      }
    } catch (error) {
      console.warn('Optional auth token invalid:', error)
    }
  }
  
  await next()
})