CREATE TABLE `ai_watch_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`interval_minutes` integer DEFAULT 1440 NOT NULL,
	`last_run_at` integer,
	`last_run_status` text,
	`last_run_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_watch_configs_user_id_unique` ON `ai_watch_configs` (`user_id`);--> statement-breakpoint
CREATE TABLE `job_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`company` text NOT NULL,
	`role` text NOT NULL,
	`url` text NOT NULL,
	`location` text,
	`description` text,
	`match_score` integer NOT NULL,
	`match_reason` text,
	`seniority_level` text,
	`technical_tools` text,
	`min_years_experience` integer,
	`salary_min` integer,
	`salary_max` integer,
	`salary_currency` text,
	`workplace_type` text,
	`company_industries` text,
	`dismissed` integer DEFAULT false NOT NULL,
	`discovered_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_offers_user_source_external_idx` ON `job_offers` (`user_id`,`source`,`external_id`);--> statement-breakpoint
CREATE INDEX `job_offers_user_dismissed_score_idx` ON `job_offers` (`user_id`,`dismissed`,`match_score`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `skills` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `industries` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `workplace_preference` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `years_of_experience` integer;