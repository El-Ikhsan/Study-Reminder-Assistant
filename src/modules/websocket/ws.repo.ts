import { getDbForDO } from '@/db/client'
import { aiPomodoroLogs, aiSensorEvents, pomodoroSessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/utils/logger'

export const saveAiPomodoroLogForDO = async (env: any, data: {
  sessionId: string;
  logType: 'phase_alert' | 'voice_chat' | 'system_alert';
  currentCycle: number;
  pomodoroMode: 'fokus' | 'istirahat';
  triggerContext: string;
  aiResponse: string;
  emotion: string;
}) => {
  try {
    const db = getDbForDO(env)
    await db.insert(aiPomodoroLogs).values({
      id: crypto.randomUUID(),
      ...data
    })
    logger.debug(`[ws.repo] AI Pomodoro Log disimpan (Type: ${data.logType})`)
  } catch (error) {
    logger.error(`[ws.repo] Gagal menyimpan AI Pomodoro Log untuk sesi ${data.sessionId}`, error)
  }
}

export const saveAiSensorEventForDO = async (env: any, data: {
  sessionId: string;
  eventType: 'interupsi' | 'pemulihan';
  triggerContext: string;
  aiResponse: string;
  emotion: string;
  temperatureAtTime: number;
  lightAtTime: number;
  noiseAtTime: number;
}) => {
  try {
    const db = getDbForDO(env)
    await db.insert(aiSensorEvents).values({
      id: crypto.randomUUID(),
      ...data
    })
    logger.debug(`[ws.repo] AI Sensor Event disimpan (Type: ${data.eventType})`)
  } catch (error) {
    logger.error(`[ws.repo] Gagal menyimpan AI Sensor Event untuk sesi ${data.sessionId}`, error)
  }
}

export const updateSessionStatusForDO = async (
  env: any,
  sessionId: string,
  newStatus: 'running' | 'paused' | 'completed' | 'cancelled'
) => {
  try {
    const db = getDbForDO(env)
    await db.update(pomodoroSessions)
      .set({ status: newStatus })
      .where(eq(pomodoroSessions.id, sessionId))

    logger.info(`[WS] Status sesi ${sessionId} diupdate dari IoT menjadi: ${newStatus}`)
  } catch (error) {
    logger.error(`[WS] Gagal update status sesi ${sessionId} dari DO`, error)
  }
}

export const updateSessionProgressForDO = async (
  env: any,
  sessionId: string,
  cycle: number,
  mode: 'fokus' | 'istirahat',
  phase: 'awal' | 'tengah' | 'akhir'
) => {
  try {
    const db = getDbForDO(env)
    await db.update(pomodoroSessions)
      .set({ currentCycle: cycle, currentMode: mode, currentPhase: phase })
      .where(eq(pomodoroSessions.id, sessionId))

    logger.debug(`[Dashboard State] Sesi ${sessionId} update ke: Siklus ${cycle}, ${mode}-${phase}`)
  } catch (error) {
    logger.error(`Gagal update state dashboard untuk sesi ${sessionId}`, error)
  }
}