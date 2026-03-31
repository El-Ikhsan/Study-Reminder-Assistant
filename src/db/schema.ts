import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
})

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  rinchanId: text("uuid").notNull().unique(),
  userId: text("user_id").references(() => users.id),
  deviceName: text("device_name").notNull().default("Unnamed Device"),
  tokenVersion: integer("token_version").default(1).notNull(),
  status: text("status", { enum: ["claimed", "unclaimed"] }).default("unclaimed"),
  lastSeen: integer("last_seen", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
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
  startedAt: integer("started_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  endedAt: integer("ended_at", { mode: "timestamp" }),
})

export const sensorTelemetry = sqliteTable('sensor_telemetry', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  temperature: real('temperature').notNull(),
  lightLux: real('light_lux').notNull(),
  noiseLevel: real('noise_level').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
})

export const rinchanLogs = sqliteTable('rinchan_logs', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  triggerContext: text('trigger_context').notNull(), // Contoh: "suhu ruangan panas", atau "fase tengah fokus"
  aiResponse: text('ai_response').notNull(),         // Teks yang diucapkan AI
  emotion: text('emotion').notNull(),                // Mimik wajah saat kejadian
  // Snapshot sensor saat Rin-chan ngomel (Boleh null kalau trigger-nya dari Pomodoro Time)
  temperatureAtTime: real('temperature_at_time'),
  lightAtTime: real('light_at_time'),
  noiseAtTime: real('noise_at_time'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
})

export const interactions = sqliteTable("interactions", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").references(() => devices.id).notNull(),
  userInput: text("user_input").notNull(),
  aiResponse: text("ai_response").notNull(),
  emotion: text("emotion", {
    enum: ["neutral", "happy", "thinking", "surprised", "sad"],
  }).default("neutral"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
})

export const refreshTokens = sqliteTable("refresh_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
})

export const webhooks = sqliteTable("webhooks", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").references(() => devices.id).notNull(),
  url: text("url").notNull(),
  secret: text("secret"),
  events: text("events").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
})