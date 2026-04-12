CREATE TABLE `devices` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`device_iot_id` text(10) NOT NULL,
	`user_id` text(36),
	`device_name` text(20) DEFAULT 'Unnamed Device' NOT NULL,
	`token_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'unclaimed',
	`last_seen` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_device_iot_id_unique` ON `devices` (`device_iot_id`);--> statement-breakpoint
CREATE TABLE `pomodoro_logs` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`device_id` text(36) NOT NULL,
	`session_id` text(36),
	`current_cycle` integer,
	`pomodoro_mode` text,
	`time_phase` text,
	`trigger_context` text NOT NULL,
	`ai_response` text NOT NULL,
	`emotion` text(20) NOT NULL,
	`temperature_at_time` real,
	`light_at_time` real,
	`noise_at_time` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `pomodoro_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pomodoro_sessions` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`device_id` text(36) NOT NULL,
	`focus_duration` integer NOT NULL,
	`rest_duration` integer NOT NULL,
	`target_cycles` integer NOT NULL,
	`condition` text DEFAULT 'normal',
	`sensor_interval_sec` integer DEFAULT 60,
	`current_cycle` integer DEFAULT 1,
	`current_mode` text DEFAULT 'fokus',
	`current_phase` text DEFAULT 'awal',
	`status` text DEFAULT 'running',
	`started_at` integer DEFAULT (strftime('%s', 'now')),
	`ended_at` integer,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`user_id` text(36) NOT NULL,
	`token` text(255) NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_unique` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `sensor_telemetry` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`device_id` text(36) NOT NULL,
	`temperature` real NOT NULL,
	`light_lux` real NOT NULL,
	`noise_level` real NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`email` text(70) NOT NULL,
	`name` text(60) NOT NULL,
	`password` text(255) NOT NULL,
	`avatar_url` text(255),
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);