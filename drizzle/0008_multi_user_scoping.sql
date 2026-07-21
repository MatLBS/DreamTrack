-- Multi-user scoping for `columns` and `applications`.
-- SQLite can't ADD a NOT NULL column with an FK on a non-empty table in one
-- step, so this backfills existing rows onto the oldest user (or drops
-- orphans if the DB has no user at all) before rebuilding both tables with
-- `user_id NOT NULL`.
ALTER TABLE `columns` ADD `user_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `applications` ADD `user_id` text REFERENCES user(id);--> statement-breakpoint
UPDATE `columns` SET `user_id` = (SELECT `id` FROM `user` ORDER BY `created_at` LIMIT 1) WHERE `user_id` IS NULL;--> statement-breakpoint
UPDATE `applications` SET `user_id` = (SELECT `id` FROM `user` ORDER BY `created_at` LIMIT 1) WHERE `user_id` IS NULL;--> statement-breakpoint
DELETE FROM `transitions` WHERE `application_id` IN (SELECT `id` FROM `applications` WHERE `user_id` IS NULL);--> statement-breakpoint
DELETE FROM `applications` WHERE `user_id` IS NULL;--> statement-breakpoint
DELETE FROM `columns` WHERE `user_id` IS NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_columns` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`is_lost_stage` integer DEFAULT false NOT NULL,
	`is_no_reply_stage` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_columns`(`id`, `user_id`, `name`, `position`, `is_default`, `is_lost_stage`, `is_no_reply_stage`, `created_at`) SELECT `id`, `user_id`, `name`, `position`, `is_default`, `is_lost_stage`, `is_no_reply_stage`, `created_at` FROM `columns`;--> statement-breakpoint
DROP TABLE `columns`;--> statement-breakpoint
ALTER TABLE `__new_columns` RENAME TO `columns`;--> statement-breakpoint
CREATE INDEX `columns_user_position_idx` ON `columns` (`user_id`,`position`);--> statement-breakpoint
CREATE TABLE `__new_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`url` text,
	`notes` text,
	`icon_url` text,
	`is_favorite` integer DEFAULT false NOT NULL,
	`column_id` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`column_id`) REFERENCES `columns`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint
INSERT INTO `__new_applications`(`id`, `user_id`, `company`, `role`, `url`, `notes`, `icon_url`, `is_favorite`, `column_id`, `position`, `created_at`, `updated_at`) SELECT `id`, `user_id`, `company`, `role`, `url`, `notes`, `icon_url`, `is_favorite`, `column_id`, `position`, `created_at`, `updated_at` FROM `applications`;--> statement-breakpoint
DROP TABLE `applications`;--> statement-breakpoint
ALTER TABLE `__new_applications` RENAME TO `applications`;--> statement-breakpoint
CREATE INDEX `applications_user_column_position_idx` ON `applications` (`user_id`,`column_id`,`position`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
