import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
})

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  rinchanId: text("uuid").notNull().unique(),
  userId: text("user_id").references(() => users.id),
  deviceName: text("device_name").notNull().default("Unnamed Device"),
  tokenVersion: integer("token_version").default(1).notNull(),
  status: text("status", { enum: ["claimed", "unclaimed"] }).default("unclaimed"),
  lastSeen: integer("last_seen", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
})

export const pomodoroSessions = sqliteTable("pomodoro_sessions", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").references(() => devices.id).notNull(),
  focusDuration: integer("focus_duration").notNull(),
  restDuration: integer("rest_duration").notNull(),
  targetCycles: integer("target_cycles").notNull(),
  condition: text("condition", { enum: ["normal", "marathon", "deadline"] }).default("normal"),
  currentCycle: integer("current_cycle").default(1),
  currentMode: text("current_mode", { enum: ["fokus", "istirahat"] }).default("fokus"),
  currentPhase: text("current_phase", { enum: ["awal", "tengah", "akhir"] }).default("awal"),
  status: text("status", { enum: ["running", "paused", "completed", "cancelled"] }).default("running"),
  startedAt: integer("started_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  endedAt: integer("ended_at", { mode: "timestamp" }),
})

export const sensorTelemetry = sqliteTable('sensor_telemetry', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  temperature: real('temperature').notNull(),
  lightLux: real('light_lux').notNull(),
  noiseLevel: real('noise_level').notNull(),
  createdAt: integer('created_at', { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull()
})

export const rinchanLogs = sqliteTable('rinchan_logs', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').references(() => pomodoroSessions.id, { onDelete: 'cascade' }), 
  currentCycle: integer('current_cycle'),                               // Tambahan baru
  pomodoroMode: text('pomodoro_mode', { enum: ["fokus", "istirahat"] }), // Tambahan baru
  timePhase: text('time_phase', { enum: ["awal", "tengah", "akhir"] }),  // Tambahan baru
  triggerContext: text('trigger_context').notNull(), 
  aiResponse: text('ai_response').notNull(),         
  emotion: text('emotion').notNull(),                
  temperatureAtTime: real('temperature_at_time'),
  lightAtTime: real('light_at_time'),
  noiseAtTime: real('noise_at_time'),
  createdAt: integer('created_at', { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull()
})

export const refreshTokens = sqliteTable("refresh_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
})