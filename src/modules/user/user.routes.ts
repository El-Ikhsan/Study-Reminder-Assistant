import { Hono } from 'hono'
import {
  getUserProfile,
  addAvatar,
  removeAvatar,
  updateUser
} from './user.controller'
import { authMiddleware } from '@/middleware/auth'

const router = new Hono()

router.get('/me', authMiddleware, getUserProfile)
router.patch('/me', authMiddleware, updateUser)
router.post('/me/avatar', authMiddleware, addAvatar)
router.delete('/me/avatar', authMiddleware, removeAvatar)

export default router
