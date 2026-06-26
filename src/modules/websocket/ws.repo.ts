import { getDbForDO } from '@/db/client'
import { aiPomodoroLogs, aiSensorLogs, pomodoroSessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/utils/logger'

export const saveAiPomodoroLogForDO = async (env: any, data: {
  sessionId: string;
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
    logger.debug(`[ws.repo] AI Pomodoro Log disimpan`)
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
    await db.insert(aiSensorLogs).values({
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
  newStatus: 'running' | 'completed' | 'stopped'
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

// updateSessionProgressForDO dihapus: kolom currentCycle, currentMode, currentPhase
// tidak ada di schema pomodoroSessions. Progress dilacak via aiPomodoroLogs.