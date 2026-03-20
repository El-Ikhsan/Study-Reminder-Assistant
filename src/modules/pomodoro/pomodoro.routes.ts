import { Hono } from 'hono'
import { startPomodoro, stopPomodoro, reportSensorToAI, reportTimePhase } from './pomodoro.controller'
import { deviceAuthMiddleware } from '@/middleware/auth' // Asumsi kamu punya middleware ini

const pomodoroRoutes = new Hono()

// Rute untuk Web Dashboard (Bisa digabung dengan Auth User Middleware kalau ada)
pomodoroRoutes.post('/start', startPomodoro)
pomodoroRoutes.post('/stop', stopPomodoro)

// Rute khusus untuk IoT (ESP32)
// Gunakan middleware untuk validasi Token/Secret dari ESP32
pomodoroRoutes.post('/iot/sensor', deviceAuthMiddleware, reportSensorToAI)
pomodoroRoutes.post('/iot/phase', deviceAuthMiddleware, reportTimePhase)

export default pomodoroRoutes