CREATE TABLE `user_pomodoro_preferences` (
	`id` text(36) PRIMARY KEY NOT NULL,
	`user_id` text(36) NOT NULL,
	`focus_duration` integer DEFAULT 25 NOT NULL,
	`break_duration` integer DEFAULT 5 NOT NULL,
	`total_cycles` integer DEFAULT 4 NOT NULL,
	`learning_media` text DEFAULT 'Laptop' NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_pomodoro_preferences_user_id_unique` ON `user_pomodoro_preferences` (`user_id`);