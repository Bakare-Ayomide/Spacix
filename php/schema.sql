-- SPACIX Studio Production MySQL Schema (Database: aixdqvdz_spacix)
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS `spacix_users` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `name` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL DEFAULT '',
  `role` VARCHAR(32) NOT NULL DEFAULT 'user',
  `admin_sub_role` VARCHAR(64) DEFAULT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'active',
  `plan` VARCHAR(32) NOT NULL DEFAULT 'free',
  `billing_cycle` VARCHAR(32) NOT NULL DEFAULT 'monthly',
  `plan_renews_at` VARCHAR(64) DEFAULT NULL,
  `stripe_customer_id` VARCHAR(128) DEFAULT NULL,
  `credits_subscription` INT NOT NULL DEFAULT 50,
  `credits_topup` INT NOT NULL DEFAULT 0,
  `credits_total` INT NOT NULL DEFAULT 50,
  `last_login_at` VARCHAR(64) DEFAULT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_sessions` (
  `token` VARCHAR(191) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `remember_me` TINYINT(1) NOT NULL DEFAULT 1,
  `expires_at` BIGINT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sessions_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_password_resets` (
  `token` VARCHAR(191) NOT NULL PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL,
  `code` VARCHAR(16) NOT NULL,
  `expires_at` BIGINT NOT NULL,
  `used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` VARCHAR(64) NOT NULL,
  INDEX `idx_reset_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_secrets` (
  `secret_key` VARCHAR(128) NOT NULL PRIMARY KEY,
  `category` VARCHAR(64) NOT NULL DEFAULT 'auth',
  `label` VARCHAR(191) NOT NULL,
  `secret_value` TEXT NOT NULL,
  `secret_masked` VARCHAR(191) NOT NULL,
  `has_value` TINYINT(1) NOT NULL DEFAULT 0,
  `description` TEXT NOT NULL,
  `updated_at` VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_magic_tokens` (
  `token` VARCHAR(191) NOT NULL PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL,
  `expires_at` BIGINT NOT NULL,
  `used` TINYINT(1) NOT NULL DEFAULT 0,
  `magic_url` TEXT NOT NULL,
  `created_at` VARCHAR(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_providers` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `label` VARCHAR(191) NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `base_url` VARCHAR(255) NOT NULL,
  `secondary_url` VARCHAR(255) DEFAULT NULL,
  `raw_secret` TEXT NOT NULL,
  `raw_webhook_secret` TEXT NOT NULL,
  `priority` INT NOT NULL DEFAULT 1,
  `updated_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_model_pricing` (
  `model_id` VARCHAR(128) NOT NULL PRIMARY KEY,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `base_hf_usd` DOUBLE NOT NULL DEFAULT 0.05,
  `preferred_provider` VARCHAR(64) NOT NULL DEFAULT 'runware',
  `custom_endpoint` VARCHAR(255) DEFAULT NULL,
  `payload_json` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_generations` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `project_id` VARCHAR(64) DEFAULT NULL,
  `surface` VARCHAR(32) NOT NULL,
  `model_id` VARCHAR(128) NOT NULL,
  `api_provider` VARCHAR(64) NOT NULL DEFAULT 'runware',
  `status` VARCHAR(32) NOT NULL DEFAULT 'queued',
  `cost` INT NOT NULL DEFAULT 1,
  `is_public` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` VARCHAR(64) NOT NULL,
  `updated_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL,
  INDEX `idx_gen_user` (`user_id`),
  INDEX `idx_gen_public` (`is_public`, `status`),
  INDEX `idx_gen_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_projects` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `updated_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL,
  INDEX `idx_proj_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_uploads` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `kind` VARCHAR(32) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL,
  INDEX `idx_upl_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_ledger` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `delta` INT NOT NULL,
  `bucket` VARCHAR(32) NOT NULL,
  `reason` VARCHAR(64) NOT NULL,
  `unique_key` VARCHAR(191) NOT NULL UNIQUE,
  `created_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL,
  INDEX `idx_ledger_user` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_notifications` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `target_audience` VARCHAR(32) NOT NULL DEFAULT 'all',
  `created_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_support_tickets` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'open',
  `priority` VARCHAR(32) NOT NULL DEFAULT 'medium',
  `updated_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL,
  INDEX `idx_ticket_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_team_members` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL,
  `admin_role` VARCHAR(64) NOT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_audit_log` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `actor_email` VARCHAR(191) NOT NULL,
  `action` VARCHAR(128) NOT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL,
  INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_reports` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `generation_id` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'open',
  `created_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_runware_tasks` (
  `task_uuid` VARCHAR(128) NOT NULL PRIMARY KEY,
  `generation_id` VARCHAR(64) DEFAULT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `payload_json` LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spacix_kv_store` (
  `k` VARCHAR(128) NOT NULL PRIMARY KEY,
  `v` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
