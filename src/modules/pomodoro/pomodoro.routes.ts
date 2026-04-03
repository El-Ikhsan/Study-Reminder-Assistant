import { Hono } from 'hono'
import { startPomodoro, stopPomodoro} from './pomodoro.controller'

const pomodoroRoutes = new Hono()

// Rute untuk Web Dashboard (Bisa digabung dengan Auth User Middleware kalau ada)
pomodoroRoutes.post('/start', startPomodoro)
pomodoroRoutes.post('/stop', stopPomodoro)

export default pomodoroRoutes