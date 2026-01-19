CREATE TABLE `work_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text NOT NULL,
	`task_description` text NOT NULL,
	`session_id` text,
	`category` text,
	`project_name` text,
	`git_branch` text,
	`working_directory` text,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `idx_timestamp` ON `work_entries` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_session_id` ON `work_entries` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `work_entries` (`category`);--> statement-breakpoint
CREATE INDEX `idx_project_name` ON `work_entries` (`project_name`);