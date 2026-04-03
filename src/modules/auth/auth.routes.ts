import { Hono } from 'hono'
import {
  registerUser,
  login,
  refreshToken,
  logout
} from './auth.controller'
import { authMiddleware, refreshTokenMiddleware } from '@/middleware/auth'

const router = new Hono()

router.post('/register', registerUser)
router.post('/login', login)
router.post('/refresh', refreshTokenMiddleware, refreshToken)
router.delete('/logout', authMiddleware, logout)

export default router