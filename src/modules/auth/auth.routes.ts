import { Hono } from 'hono'
import {
  registerUser,
  login,
  refreshToken,
  logout,
  getUserProfile,
  addAvatar,
  removeAvatar,
  updateUser
} from './auth.controller'
import { authMiddleware } from '@/middleware/auth'

const router = new Hono()

router.post('/register', registerUser)
router.post('/login', login)
router.post('/refresh', refreshToken)

router.post('/get-user', authMiddleware, getUserProfile)
router.post("/update", authMiddleware, updateUser)
router.post('/add-avatar', authMiddleware, addAvatar)
router.post('/remove-avatar', authMiddleware, removeAvatar)
router.post('/logout', authMiddleware, logout)

export default router