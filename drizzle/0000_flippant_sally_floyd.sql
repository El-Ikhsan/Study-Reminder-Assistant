CREATE TABLE `ai_pomodoro_logs` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`session_id` text(36) NOT NULL,
	`current_cycle` integer NOT NULL,
	`pomodoro_mode` text(9) NOT NULL,
	`trigger_context` text NOT NULL,
	`ai_response` text NOT NULL,
	`emotion` text(20) NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `pomodoro_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ai_sensor_logs` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`session_id` text(36) NOT NULL,
	`event_type` text(9) NOT NULL,
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
CREATE TABLE `devices` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`device_iot_id` text(10) NOT NULL,
	`user_id` text(36),
	`device_name` text(20) DEFAULT 'Unnamed Device' NOT NULL,
	`token_version` integer DEFAULT 1 NOT NULL,
	`brightness` integer DEFAULT 50 NOT NULL,
	`volume` integer DEFAULT 50 NOT NULL,
	`status` text(9) DEFAULT 'unclaimed',
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_device_iot_id_unique` ON `devices` (`device_iot_id`);--> statement-breakpoint
CREATE TABLE `pomodoro_sessions` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`device_id` text(36) NOT NULL,
	`focus_duration` integer NOT NULL,
	`rest_duration` integer NOT NULL,
	`target_cycles` integer NOT NULL,
	`learning_media` text(8) DEFAULT 'Laptop' NOT NULL,
	`status` text(9) DEFAULT 'running',
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
CREATE TABLE `user_pomodoro_preferences` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`user_id` text(36) NOT NULL,
	`focus_duration` integer DEFAULT 25 NOT NULL,
	`break_duration` integer DEFAULT 5 NOT NULL,
	`total_cycles` integer DEFAULT 4 NOT NULL,
	`learning_media` text(8) DEFAULT 'Laptop' NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_pomodoro_preferences_user_id_unique` ON `user_pomodoro_preferences` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`email` text(70) NOT NULL,
	`name` text(60) NOT NULL,
	`password` text(255) NOT NULL,
	`avatar_url` text(255),
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);