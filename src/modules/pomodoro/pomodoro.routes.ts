import { Hono } from 'hono'
import { startPomodoro, stopPomodoro, getPomodoroHistory, deletePomodoroHistory, getAllPomodoro } from './pomodoro.controller'

const pomodoroRoutes = new Hono()

// Rute untuk Web Dashboard (Bisa digabung dengan Auth User Middleware kalau ada)
pomodoroRoutes.post('/start', startPomodoro)
pomodoroRoutes.post('/stop', stopPomodoro)
pomodoroRoutes.get('/sessions', getAllPomodoro)
pomodoroRoutes.get('/histories/:pomodoroId', getPomodoroHistory)
pomodoroRoutes.delete('/histories/:pomodoroId', deletePomodoroHistory)

export default pomodoroRoutes