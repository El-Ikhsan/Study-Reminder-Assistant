CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_name` text NOT NULL,
	`status` text DEFAULT 'offline',
	`last_seen` integer,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`user_input` text NOT NULL,
	`ai_response` text NOT NULL,
	`emotion` text DEFAULT 'neutral',
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
	`started_at` integer DEFAULT CURRENT_TIMESTAMP,
	`ended_at` integer,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_unique` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `sensor_telemetry` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`temperature` integer,
	`light_lux` integer,
	`noise_level` integer,
	`recorded_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`avatar_url` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`url` text NOT NULL,
	`secret` text,
	`events` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
