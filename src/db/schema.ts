import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

// ==========================================
// 1. USERS TABLE
// ==========================================
export const users = sqliteTable("users", {
  id: text("id", { length: 36 }).primaryKey(),
  email: text("email", { length: 70 }).notNull().unique(),
  name: text("name", { length: 60 }).notNull(),
  password: text("password", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url", { length: 255 }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

// ==========================================
// 2. DEVICES TABLE
// ==========================================
export const devices = sqliteTable("devices", {
  id: text("id", { length: 36 }).primaryKey(),
  deviceIotId: text("device_iot_id", { length: 10 }).notNull().unique(), // Contoh: RC-v1-A3B9
  userId: text("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  deviceName: text("device_name", { length: 20 }).notNull().default("Unnamed Device"),
  tokenVersion: integer("token_version").notNull().default(1),
  status: text("status", { enum: ["claimed", "unclaimed"] }).default("unclaimed"),
  lastSeen: integer("last_seen", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

// ==========================================
// 3. POMODORO SESSIONS TABLE
// ==========================================
export const pomodoroSessions = sqliteTable("pomodoro_sessions", {
  id: text("id", { length: 36 }).primaryKey(),
  deviceId: text("device_id", { length: 36 }).references(() => devices.id, { onDelete: "cascade" }).notNull(),
  focusDuration: integer("focus_duration").notNull(),
  restDuration: integer("rest_duration").notNull(),
  targetCycles: integer("target_cycles").notNull(),
  condition: text("condition", { enum: ["normal", "panjang", "deadline"] }).default("normal"),
  sensorIntervalSec: integer("sensor_interval_sec").default(60),
  currentCycle: integer("current_cycle").default(1),
  currentMode: text("current_mode", { enum: ["fokus", "istirahat"] }).default("fokus"),
  currentPhase: text("current_phase", { enum: ["awal", "tengah", "akhir"] }).default("awal"),
  status: text("status", { enum: ["running", "paused", "completed", "cancelled"] }).default("running"),
  startedAt: integer("started_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  endedAt: integer("ended_at", { mode: "timestamp" }),
});

// ==========================================
// 4. SENSOR TELEMETRY TABLE (Raw Data)
// ==========================================
export const sensorTelemetry = sqliteTable("sensor_telemetry", {
  id: text("id", { length: 36 }).primaryKey(),
  deviceId: text("device_id", { length: 36 }).references(() => devices.id, { onDelete: "cascade" }).notNull(),
  temperature: real("temperature").notNull(),
  lightLux: real("light_lux").notNull(),
  noiseLevel: real("noise_level").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// ==========================================
// 5. POMODORO LOGS TABLE (AI Responses)
// ==========================================
export const pomodoroLogs = sqliteTable("pomodoro_logs", {
  id: text("id", { length: 36 }).primaryKey(),
  deviceId: text("device_id", { length: 36 }).references(() => devices.id, { onDelete: "cascade" }).notNull(),
  sessionId: text("session_id", { length: 36 }).references(() => pomodoroSessions.id, { onDelete: "cascade" }),
  currentCycle: integer("current_cycle"),
  pomodoroMode: text("pomodoro_mode", { enum: ["fokus", "istirahat"] }),
  timePhase: text("time_phase", { enum: ["awal", "tengah", "akhir"] }),
  triggerContext: text("trigger_context").notNull(), // Teks dari AI Wakenet/Sensor
  aiResponse: text("ai_response").notNull(),         // Jawaban dari LLM
  emotion: text("emotion", { length: 20 }).notNull(),
  temperatureAtTime: real("temperature_at_time"),
  lightAtTime: real("light_at_time"),
  noiseAtTime: real("noise_at_time"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// ==========================================
// 6. REFRESH TOKENS TABLE
// ==========================================
export const refreshTokens = sqliteTable("refresh_tokens", {
  id: text("id", { length: 36 }).primaryKey(),
  userId: text("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token", { length: 255 }).notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});


// ==========================================
// ✨ DRIZZLE RELATIONS (Untuk Query Join yang Mudah)
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  devices: many(devices),
  refreshTokens: many(refreshTokens),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, {
    fields: [devices.userId],
    references: [users.id],
  }),
  sessions: many(pomodoroSessions),
  telemetry: many(sensorTelemetry),
  logs: many(pomodoroLogs),
}));

export const pomodoroSessionsRelations = relations(pomodoroSessions, ({ one, many }) => ({
  device: one(devices, {
    fields: [pomodoroSessions.deviceId],
    references: [devices.id],
  }),
  logs: many(pomodoroLogs),
}));

export const sensorTelemetryRelations = relations(sensorTelemetry, ({ one }) => ({
  device: one(devices, {
    fields: [sensorTelemetry.deviceId],
    references: [devices.id],
  }),
}));

export const pomodoroLogsRelations = relations(pomodoroLogs, ({ one }) => ({
  device: one(devices, {
    fields: [pomodoroLogs.deviceId],
    references: [devices.id],
  }),
  session: one(pomodoroSessions, {
    fields: [pomodoroLogs.sessionId],
    references: [pomodoroSessions.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));