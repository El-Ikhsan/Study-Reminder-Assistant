import { Hono } from 'hono'
import { getPreferences, updatePreferences } from './preferences.controller'
import { authMiddleware } from '@/middleware/auth'

const router = new Hono()

router.get('/pomodoro', authMiddleware, getPreferences)
router.patch('/pomodoro', authMiddleware, updatePreferences)

export default router
