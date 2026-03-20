CREATE TABLE `rinchan_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`trigger_context` text NOT NULL,
	`ai_response` text NOT NULL,
	`emotion` text NOT NULL,
	`temperature_at_time` real,
	`light_at_time` real,
	`noise_at_time` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sensor_telemetry` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`temperature` real NOT NULL,
	`light_lux` real NOT NULL,
	`noise_level` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sensor_telemetry`("id", "device_id", "temperature", "light_lux", "noise_level", "created_at") SELECT "id", "device_id", "temperature", "light_lux", "noise_level", "created_at" FROM `sensor_telemetry`;--> statement-breakpoint
DROP TABLE `sensor_telemetry`;--> statement-breakpoint
ALTER TABLE `__new_sensor_telemetry` RENAME TO `sensor_telemetry`;--> statement-breakpoint
PRAGMA foreign_keys=ON;