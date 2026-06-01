ALTER TABLE `ai_sensor_events` RENAME TO `ai_sensor_logs`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ai_sensor_logs` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`session_id` text(36) NOT NULL,
	`event_type` text NOT NULL,
	`trigger_context` text NOT NULL,
	`ai_response` text NOT NULL,
	`emotion` text(20) NOT NULL,
	`temperature_at_time` real NOT NULL,
	`light_at_time` real NOT NULL,
	`noise_at_time` real NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `pomodoro_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ai_sensor_logs`("id", "session_id", "event_type", "trigger_context", "ai_response", "emotion", "temperature_at_time", "light_at_time", "noise_at_time", "created_at") SELECT "id", "session_id", "event_type", "trigger_context", "ai_response", "emotion", "temperature_at_time", "light_at_time", "noise_at_time", "created_at" FROM `ai_sensor_logs`;--> statement-breakpoint
DROP TABLE `ai_sensor_logs`;--> statement-breakpoint
ALTER TABLE `__new_ai_sensor_logs` RENAME TO `ai_sensor_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `devices` ADD `updated_at` integer DEFAULT (strftime('%s', 'now'));--> statement-breakpoint
ALTER TABLE `devices` DROP COLUMN `last_seen`;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_at` integer DEFAULT (strftime('%s', 'now'));