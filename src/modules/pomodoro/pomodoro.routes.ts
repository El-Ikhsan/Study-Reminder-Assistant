import { Hono } from 'hono'
import { authMiddleware } from '@/middleware/auth'
import { startPomodoro, stopPomodoro, getPomodoroHistory, deletePomodoroHistory, getAllPomodoro, getStats } from './pomodoro.controller'

const pomodoroRoutes = new Hono()

// Rute untuk Web Dashboard (Wajib Login)
pomodoroRoutes.post('/start', authMiddleware, startPomodoro)
pomodoroRoutes.post('/stop', authMiddleware, stopPomodoro)
pomodoroRoutes.get('/sessions', authMiddleware, getAllPomodoro)
pomodoroRoutes.get('/stats', authMiddleware, getStats)
pomodoroRoutes.get('/histories/:pomodoroId', authMiddleware, getPomodoroHistory)
pomodoroRoutes.delete('/histories/:pomodoroId', authMiddleware, deletePomodoroHistory)

export default pomodoroRoutes