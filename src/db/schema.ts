import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id", { length: 36 }).primaryKey(),
  email: text("email", { length: 70 }).notNull().unique(),
  name: text("name", { length: 60 }).notNull(),
  password: text("password", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url", { length: 255 }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now'))`)
    .$onUpdate(() => new Date()),
});

export const devices = sqliteTable("devices", {
  id: text("id", { length: 36 }).primaryKey(),
  deviceIotId: text("device_iot_id", { length: 10 }).notNull().unique(), // Contoh: RC-v1-A3B9
  userId: text("user_id", { length: 36 }).references(() => users.id, { onDelete: "set null" }),
  deviceName: text("device_name", { length: 20 }).notNull().default("Unnamed Device"),
  tokenVersion: integer("token_version").notNull().default(1),
  brightness: integer("brightness").notNull().default(50),
  volume: integer("volume").notNull().default(50),
  status: text("status", { length: 9, enum: ["claimed", "unclaimed"] }).default("unclaimed"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now'))`)
    .$onUpdate(() => new Date()),
});

export const pomodoroSessions = sqliteTable("pomodoro_sessions", {
  id: text("id", { length: 36 }).primaryKey(),
  deviceId: text("device_id", { length: 36 }).references(() => devices.id, { onDelete: "cascade" }).notNull(),
  focusDuration: integer("focus_duration").notNull(),
  restDuration: integer("rest_duration").notNull(),
  targetCycles: integer("target_cycles").notNull(),
  media: text("learning_media", { length: 8, enum: ["Buku", "Laptop", "HP", "Komputer"] }).notNull().default("Laptop"),
  status: text("status", { length: 9, enum: ["running", "completed", "stopped"] }).default("running"),
  startedAt: integer("started_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  endedAt: integer("ended_at", { mode: "timestamp" }),
});

export const aiPomodoroLogs = sqliteTable("ai_pomodoro_logs", {
  id: text("id", { length: 36 }).primaryKey(),
  sessionId: text("session_id", { length: 36 }).references(() => pomodoroSessions.id, { onDelete: "cascade" }).notNull(),
  currentCycle: integer("current_cycle").notNull(),
  pomodoroMode: text("pomodoro_mode", { length: 9, enum: ["fokus", "istirahat"] }).notNull(),
  triggerContext: text("trigger_context").notNull(),
  aiResponse: text("ai_response").notNull(),
  emotion: text("emotion", { length: 20 }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const aiSensorLogs = sqliteTable("ai_sensor_logs", {
  id: text("id", { length: 36 }).primaryKey(),
  sessionId: text("session_id", { length: 36 }).references(() => pomodoroSessions.id, { onDelete: "cascade" }).notNull(),
  eventType: text("event_type", { length: 9, enum: ["interupsi", "pemulihan"] }).notNull(),
  triggerContext: text("trigger_context").notNull(),
  aiResponse: text("ai_response").notNull(),
  emotion: text("emotion", { length: 20 }).notNull(),
  temperatureAtTime: real("temperature_at_time").notNull(),
  lightAtTime: real("light_at_time").notNull(),
  noiseAtTime: real("noise_at_time").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const refreshTokens = sqliteTable("refresh_tokens", {
  id: text("id", { length: 36 }).primaryKey(),
  userId: text("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token", { length: 255 }).notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const userPomodoroPreferences = sqliteTable("user_pomodoro_preferences", {
  id: text("id", { length: 36 }).primaryKey(),
  userId: text("user_id", { length: 36 }).references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  focusDuration: integer("focus_duration").notNull().default(25),
  breakDuration: integer("break_duration").notNull().default(5),
  totalCycles: integer("total_cycles").notNull().default(4),
  learningMedia: text("learning_media", { length: 8, enum: ["Buku", "Laptop", "HP", "Komputer"] }).notNull().default("Laptop"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .default(sql`(strftime('%s', 'now'))`)
    .$onUpdate(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  devices: many(devices),
  refreshTokens: many(refreshTokens),
  pomodoroPreferences: one(userPomodoroPreferences, {
    fields: [users.id],
    references: [userPomodoroPreferences.userId],
  }),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, {
    fields: [devices.userId],
    references: [users.id],
  }),
  sessions: many(pomodoroSessions),
}));

export const pomodoroSessionsRelations = relations(pomodoroSessions, ({ one, many }) => ({
  device: one(devices, {
    fields: [pomodoroSessions.deviceId],
    references: [devices.id],
  }),
  pomodoroLogs: many(aiPomodoroLogs),
  sensorLogs: many(aiSensorLogs),
}));

export const aiPomodoroLogsRelations = relations(aiPomodoroLogs, ({ one }) => ({
  session: one(pomodoroSessions, {
    fields: [aiPomodoroLogs.sessionId],
    references: [pomodoroSessions.id],
  }),
}));

export const aiSensorLogsRelations = relations(aiSensorLogs, ({ one }) => ({
  session: one(pomodoroSessions, {
    fields: [aiSensorLogs.sessionId],
    references: [pomodoroSessions.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const userPomodoroPreferencesRelations = relations(userPomodoroPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPomodoroPreferences.userId],
    references: [users.id],
  }),
}));