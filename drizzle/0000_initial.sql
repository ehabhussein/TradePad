CREATE TABLE `days` (
  `date` text PRIMARY KEY NOT NULL,
  `what_happened` text,
  `market_context` text,
  `mood` integer,
  `wins` text,
  `mistakes` text,
  `lessons` text,
  `daily_close_balance` real,
  `daily_close_pnl` real,
  `checklist_json` text,
  `discipline_score` integer,
  `tags` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trades` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `day_date` text,
  `symbol` text NOT NULL,
  `direction` text NOT NULL,
  `entry_price` real NOT NULL,
  `exit_price` real,
  `stop_loss` real,
  `take_profit` real,
  `quantity` real NOT NULL,
  `pnl` real,
  `r_multiple` real,
  `setup_type` text,
  `session` text,
  `confluence_score` integer,
  `notes_entry` text,
  `notes_review` text,
  `followed_rules` integer,
  `mood` integer,
  `opened_at` integer NOT NULL,
  `closed_at` integer,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`day_date`) REFERENCES `days`(`date`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `screenshots` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `filename` text NOT NULL,
  `original_name` text,
  `mime_type` text,
  `size_bytes` integer,
  `width` integer,
  `height` integer,
  `day_date` text,
  `trade_id` integer,
  `caption` text,
  `uploaded_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`day_date`) REFERENCES `days`(`date`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`trade_id`) REFERENCES `trades`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lessons` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `body` text NOT NULL,
  `tags` text,
  `severity` text,
  `source_date` text,
  `source_trade_id` integer,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`source_trade_id`) REFERENCES `trades`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rules` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `text` text NOT NULL,
  `category` text,
  `order_num` integer DEFAULT 0 NOT NULL,
  `active` integer DEFAULT 1 NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `checklist_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `text` text NOT NULL,
  `category` text,
  `order_num` integer DEFAULT 0 NOT NULL,
  `active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `mistakes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `tag` text NOT NULL,
  `trade_id` integer,
  `day_date` text,
  `notes` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`trade_id`) REFERENCES `trades`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`day_date`) REFERENCES `days`(`date`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `account_snapshots` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date` text NOT NULL,
  `balance` real NOT NULL,
  `equity` real,
  `withdrawn` real DEFAULT 0,
  `deposited` real DEFAULT 0,
  `notes` text,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `setups` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `direction` text NOT NULL,
  `category` text,
  `timeframe` text,
  `best_session` text,
  `entry_conditions_json` text,
  `exit_conditions_json` text,
  `sl_rule` text,
  `tp_rule` text,
  `invalidation_rule` text,
  `confluence_notes` text,
  `tags` text,
  `active` integer DEFAULT 1 NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `target_value` real NOT NULL,
  `current_value` real,
  `unit` text,
  `deadline` text,
  `achieved` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);
