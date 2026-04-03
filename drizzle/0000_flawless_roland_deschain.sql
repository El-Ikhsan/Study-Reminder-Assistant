CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`uuid` text NOT NULL,
	`user_id` text,
	`device_name` text DEFAULT 'Unnamed Device' NOT NULL,
	`token_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'unclaimed',
	`last_seen` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_uuid_unique` ON `devices` (`uuid`);--> statement-breakpoint
CREATE TABLE `pomodoro_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`focus_duration` integer NOT NULL,
	`rest_duration` integer NOT NULL,
	`target_cycles` integer NOT NULL,
	`condition` text DEFAULT 'normal',
	`current_cycle` integer DEFAULT 1,
	`current_mode` text DEFAULT 'fokus',
	`current_phase` text DEFAULT 'awal',
	`status` text DEFAULT 'running',
	`started_at` integer DEFAULT (strftime('%s', 'now')),
	`ended_at` integer,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_unique` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `rinchan_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`session_id` text,
	`current_cycle` integer,
	`pomodoro_mode` text,
	`time_phase` text,
	`trigger_context` text NOT NULL,
	`ai_response` text NOT NULL,
	`emotion` text NOT NULL,
	`temperature_at_time` real,
	`light_at_time` real,
	`noise_at_time` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `pomodoro_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sensor_telemetry` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`temperature` real NOT NULL,
	`light_lux` real NOT NULL,
	`noise_level` real NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`avatar_url` text,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);