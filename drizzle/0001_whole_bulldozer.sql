ALTER TABLE `devices` ADD `uuid` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `devices_uuid_unique` ON `devices` (`uuid`);