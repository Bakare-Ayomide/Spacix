<?php
/**
 * SPACIX Studio — Production MySQL Configuration & Store Engine
 * Database: aixdqvdz_spacix
 * User:     aixdqvdz_spacix
 * Server:   localhost / 127.0.0.1 / 102.203.116.13 (Port 3306)
 */

define('SPACIX_DB_NAME', getenv('DB_NAME') ?: 'aixdqvdz_spacix');
define('SPACIX_DB_USER', getenv('DB_USER') ?: 'aixdqvdz_spacix');
define('SPACIX_DB_PASS', getenv('DB_PASS') ?: '@f33rinimi');
define('SPACIX_DB_PORT', getenv('DB_PORT') ?: '3306');

/**
 * PBKDF2-SHA256 Password Hashing (100% compatible between Node.js and PHP 8)
 */
function spacix_hash_password(string $password, ?string $salt = null): string {
    $actualSalt = $salt ?: bin2hex(random_bytes(8));
    $derived = hash_pbkdf2('sha256', $password, $actualSalt, 10000, 64, false);
    return sprintf('pbkdf2_sha256$%s$%s', $actualSalt, $derived);
}

function spacix_verify_password(string $password, string $storedHash): bool {
    if ($storedHash === '' || strpos($storedHash, 'pbkdf2_sha256$') !== 0) {
        return false;
    }
    $parts = explode('$', $storedHash);
    if (count($parts) !== 3) {
        return false;
    }
    $salt = $parts[1];
    $expected = spacix_hash_password($password, $salt);
    return hash_equals($storedHash, $expected);
}

function spacix_mask_secret(string $secret, string $prefixHint = 'sk'): string {
    $clean = trim($secret);
    if ($clean === '') {
        return 'Not configured';
    }
    if (strlen($clean) <= 8) {
        return $prefixHint . '_••••••••';
    }
    return substr($clean, 0, 6) . '••••••••' . substr($clean, -4);
}

/**
 * Returns a connected PDO instance to the cPanel MySQL database
 */
function spacix_get_pdo(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $hosts = ['localhost', '127.0.0.1', '102.203.116.13'];
    $lastErr = null;

    foreach ($hosts as $host) {
        try {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                $host,
                SPACIX_DB_PORT,
                SPACIX_DB_NAME
            );
            $pdo = new PDO($dsn, SPACIX_DB_USER, SPACIX_DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 5,
            ]);
            return $pdo;
        } catch (Throwable $e) {
            $lastErr = $e;
        }
    }

    throw new RuntimeException('MySQL Connection Error: ' . ($lastErr ? $lastErr->getMessage() : 'Unknown error'));
}

/**
 * Ensures all MySQL tables and columns exist, purges legacy mock records, and seeds real bootstrap state
 */
function spacix_ensure_schema_and_seed(PDO $pdo, bool $forceMigrate = false): array {
    $schemaPath = __DIR__ . '/schema.sql';
    if (file_exists($schemaPath)) {
        $sql = file_get_contents($schemaPath);
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        foreach ($statements as $stmt) {
            if ($stmt !== '' && strpos($stmt, '--') !== 0) {
                $pdo->exec($stmt);
            }
        }
    }

    // Safely ensure new columns exist on existing MySQL tables
    $alterStatements = [
        "ALTER TABLE `spacix_users` ADD COLUMN `password_hash` VARCHAR(255) NOT NULL DEFAULT '' AFTER `name`",
        "ALTER TABLE `spacix_users` ADD COLUMN `last_login_at` VARCHAR(64) DEFAULT NULL AFTER `credits_total`",
        "ALTER TABLE `spacix_sessions` ADD COLUMN `remember_me` TINYINT(1) NOT NULL DEFAULT 1 AFTER `user_id`",
        "ALTER TABLE `spacix_sessions` ADD COLUMN `expires_at` BIGINT NOT NULL DEFAULT 0 AFTER `remember_me`",
    ];
    foreach ($alterStatements as $alt) {
        try {
            $pdo->exec($alt);
        } catch (Throwable $e) {
            // Column already exists
        }
    }

    $secretCount = 0;
    try {
        $secretCount = (int) $pdo->query('SELECT COUNT(*) FROM `spacix_secrets`')->fetchColumn();
    } catch (Throwable $e) {
        $secretCount = 0;
    }

    if ($secretCount > 0 && !$forceMigrate) {
        $userCount = (int) $pdo->query('SELECT COUNT(*) FROM `spacix_users`')->fetchColumn();
        return ['migrated' => false, 'users' => $userCount, 'secrets' => $secretCount];
    }

    $seedFile = __DIR__ . '/seed_data.json';
    if (!file_exists($seedFile)) {
        return ['migrated' => false, 'error' => 'seed_data.json not found'];
    }

    $seed = json_decode(file_get_contents($seedFile), true);
    if (!is_array($seed)) {
        return ['migrated' => false, 'error' => 'Invalid seed_data.json'];
    }

    $pdo->beginTransaction();
    try {
        // 0. Purge all legacy mock / sample records from the database
        $pdo->exec("DELETE FROM `spacix_users` WHERE `id` IN ('usr_director_01', 'usr_community_02', 'usr_studio_03', 'usr_agency_04')");
        $pdo->exec("DELETE FROM `spacix_sessions` WHERE `token` IN ('default_session_token', 'creator_session_token', 'signed_out') OR `user_id` IN ('usr_director_01', 'usr_community_02', 'usr_studio_03', 'usr_agency_04')");
        $pdo->exec("DELETE FROM `spacix_generations` WHERE `id` LIKE 'gen_seed_%'");
        $pdo->exec("DELETE FROM `spacix_projects` WHERE `id` = 'proj_neo_tokyo_reel'");
        $pdo->exec("DELETE FROM `spacix_uploads` WHERE `id` LIKE 'upl_seed_%'");
        $pdo->exec("DELETE FROM `spacix_ledger` WHERE `id` LIKE 'led_17%' AND (`user_id` IN ('usr_director_01', 'usr_community_02', 'usr_studio_03', 'usr_agency_04') OR `payload_json` LIKE '%in_seed_%' OR `payload_json` LIKE '%cs_seed_%')");
        $pdo->exec("DELETE FROM `spacix_notifications` WHERE `id` IN ('notif_kling_launch', 'notif_credit_bonus')");
        $pdo->exec("DELETE FROM `spacix_support_tickets` WHERE `id` IN ('tkt_1042', 'tkt_1041', 'tkt_1039')");
        $pdo->exec("DELETE FROM `spacix_team_members` WHERE `id` IN ('team_01', 'team_02', 'team_03', 'team_04')");
        $pdo->exec("DELETE FROM `spacix_runware_tasks` WHERE `task_uuid` = 'rw_task_seed_05'");

        // 1. Users + Password Hashes
        $userPasswords = $seed['userPasswords'] ?? [];
        $stmtUser = $pdo->prepare('
            INSERT INTO `spacix_users`
            (`id`, `email`, `name`, `password_hash`, `role`, `admin_sub_role`, `status`, `plan`, `billing_cycle`, `plan_renews_at`, `stripe_customer_id`, `credits_subscription`, `credits_topup`, `credits_total`, `last_login_at`, `created_at`, `payload_json`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            `email` = VALUES(`email`),
            `name` = VALUES(`name`),
            `password_hash` = IF(`spacix_users`.`password_hash` = "", VALUES(`password_hash`), `spacix_users`.`password_hash`),
            `role` = VALUES(`role`),
            `admin_sub_role` = VALUES(`admin_sub_role`),
            `status` = VALUES(`status`),
            `plan` = VALUES(`plan`),
            `billing_cycle` = VALUES(`billing_cycle`),
            `plan_renews_at` = VALUES(`plan_renews_at`),
            `stripe_customer_id` = VALUES(`stripe_customer_id`),
            `credits_subscription` = VALUES(`credits_subscription`),
            `credits_topup` = VALUES(`credits_topup`),
            `credits_total` = VALUES(`credits_total`),
            `payload_json` = VALUES(`payload_json`)
        ');
        foreach ($seed['users'] ?? [] as $u) {
            $uid = $u['id'];
            $pwHash = $userPasswords[$uid] ?? spacix_hash_password('@f33rinimi', 'spacix_admin_salt');
            $stmtUser->execute([
                $uid,
                strtolower(trim($u['email'])),
                $u['name'],
                $pwHash,
                $u['role'] ?? 'user',
                $u['adminSubRole'] ?? null,
                $u['status'] ?? 'active',
                $u['plan'] ?? 'free',
                $u['billingCycle'] ?? 'monthly',
                $u['planRenewsAt'] ?? null,
                $u['stripeCustomerId'] ?? null,
                (int) ($u['credits']['subscription'] ?? 0),
                (int) ($u['credits']['topup'] ?? 0),
                (int) ($u['credits']['total'] ?? 0),
                $u['lastLoginAt'] ?? null,
                $u['createdAt'] ?? gmdate('c'),
                json_encode($u, JSON_UNESCAPED_SLASHES),
            ]);
        }

        // 2. Database Secrets Vault (`spacix_secrets`)
        $stmtSec = $pdo->prepare('
            INSERT INTO `spacix_secrets`
            (`secret_key`, `category`, `label`, `secret_value`, `secret_masked`, `has_value`, `description`, `updated_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            `category` = VALUES(`category`),
            `label` = VALUES(`label`),
            `secret_value` = IF(`spacix_secrets`.`secret_value` = "", VALUES(`secret_value`), `spacix_secrets`.`secret_value`),
            `secret_masked` = IF(`spacix_secrets`.`secret_value` = "", VALUES(`secret_masked`), `spacix_secrets`.`secret_masked`),
            `has_value` = IF(`spacix_secrets`.`secret_value` = "", VALUES(`has_value`), `spacix_secrets`.`has_value`),
            `description` = VALUES(`description`),
            `updated_at` = VALUES(`updated_at`)
        ');
        foreach ($seed['platformSecrets'] ?? [] as $sec) {
            $val = (string) ($sec['value'] ?? '');
            $stmtSec->execute([
                $sec['key'],
                $sec['category'] ?? 'auth',
                $sec['label'] ?? $sec['key'],
                $val,
                $val !== '' ? spacix_mask_secret($val, strtolower($sec['key'])) : 'Not configured',
                $val !== '' ? 1 : 0,
                $sec['description'] ?? '',
                $sec['updatedAt'] ?? gmdate('c'),
            ]);
        }

        // 3. Providers (clean out any mock keys on non-runware providers while preserving real Runware key)
        $stmtProv = $pdo->prepare('
            INSERT INTO `spacix_providers`
            (`id`, `label`, `enabled`, `base_url`, `secondary_url`, `raw_secret`, `raw_webhook_secret`, `priority`, `updated_at`, `payload_json`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            `label` = VALUES(`label`),
            `enabled` = VALUES(`enabled`),
            `base_url` = VALUES(`base_url`),
            `secondary_url` = VALUES(`secondary_url`),
            `raw_secret` = VALUES(`raw_secret`),
            `raw_webhook_secret` = VALUES(`raw_webhook_secret`),
            `priority` = VALUES(`priority`),
            `updated_at` = VALUES(`updated_at`),
            `payload_json` = VALUES(`payload_json`)
        ');
        foreach ($seed['providerConfigs'] ?? [] as $p) {
            $stmtProv->execute([
                $p['id'],
                $p['label'],
                !empty($p['enabled']) ? 1 : 0,
                $p['baseUrl'] ?? '',
                $p['secondaryUrl'] ?? null,
                $p['rawSecret'] ?? '',
                $p['rawWebhookSecret'] ?? '',
                (int) ($p['priority'] ?? 1),
                $p['updatedAt'] ?? gmdate('c'),
                json_encode($p, JSON_UNESCAPED_SLASHES),
            ]);
        }

        // 4. Model Pricing Overrides
        $stmtModel = $pdo->prepare('
            INSERT INTO `spacix_model_pricing`
            (`model_id`, `enabled`, `base_hf_usd`, `preferred_provider`, `custom_endpoint`, `payload_json`)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            `enabled` = VALUES(`enabled`),
            `base_hf_usd` = VALUES(`base_hf_usd`),
            `preferred_provider` = VALUES(`preferred_provider`),
            `custom_endpoint` = VALUES(`custom_endpoint`),
            `payload_json` = VALUES(`payload_json`)
        ');
        foreach ($seed['modelPricing'] ?? [] as $m) {
            $stmtModel->execute([
                $m['modelId'],
                !empty($m['enabled']) ? 1 : 0,
                (float) ($m['baseHfUsd'] ?? 0.05),
                $m['preferredProvider'] ?? 'runware',
                $m['customEndpoint'] ?? null,
                json_encode($m, JSON_UNESCAPED_SLASHES),
            ]);
        }

        // 5. Real Generations
        $stmtGen = $pdo->prepare('
            INSERT INTO `spacix_generations`
            (`id`, `user_id`, `project_id`, `surface`, `model_id`, `api_provider`, `status`, `cost`, `is_public`, `created_at`, `updated_at`, `payload_json`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            `user_id` = VALUES(`user_id`),
            `status` = VALUES(`status`),
            `cost` = VALUES(`cost`),
            `is_public` = VALUES(`is_public`),
            `updated_at` = VALUES(`updated_at`),
            `payload_json` = VALUES(`payload_json`)
        ');
        foreach ($seed['generations'] ?? [] as $g) {
            $stmtGen->execute([
                $g['id'],
                $g['userId'],
                $g['projectId'] ?? null,
                $g['surface'],
                $g['modelId'],
                $g['apiProvider'] ?? 'runware',
                $g['status'] ?? 'completed',
                (int) ($g['cost'] ?? 1),
                !empty($g['isPublic']) ? 1 : 0,
                $g['createdAt'] ?? gmdate('c'),
                $g['updatedAt'] ?? gmdate('c'),
                json_encode($g, JSON_UNESCAPED_SLASHES),
            ]);
        }

        // 6. Team Members
        $stmtTeam = $pdo->prepare('
            INSERT INTO `spacix_team_members`
            (`id`, `email`, `admin_role`, `created_at`, `payload_json`)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            `email` = VALUES(`email`),
            `admin_role` = VALUES(`admin_role`),
            `payload_json` = VALUES(`payload_json`)
        ');
        foreach ($seed['teamMembers'] ?? [] as $tm) {
            $stmtTeam->execute([
                $tm['id'],
                $tm['email'],
                $tm['adminRole'] ?? 'super_admin',
                $tm['createdAt'] ?? gmdate('c'),
                json_encode($tm, JSON_UNESCAPED_SLASHES),
            ]);
        }

        // 7. KV Store for plans, topups, billingConfig, runwareRoutingConfig, catalogModels, initialPresets, runwareSearchCatalog
        $stmtKv = $pdo->prepare('
            INSERT INTO `spacix_kv_store` (`k`, `v`)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE `v` = VALUES(`v`)
        ');
        $kvPairs = [
            'plans' => $seed['plans'] ?? [],
            'topups' => $seed['topups'] ?? [],
            'billingConfig' => $seed['billingConfig'] ?? ['creditUsdValue' => 0.01, 'creditMarkup' => 2.0, 'signupBonusCredits' => 50],
            'runwareRoutingConfig' => $seed['runwareRoutingConfig'] ?? [],
            'catalogModels' => $seed['catalogModels'] ?? [],
            'initialPresets' => $seed['initialPresets'] ?? [],
            'runwareSearchCatalog' => $seed['runwareSearchCatalog'] ?? [],
        ];
        foreach ($kvPairs as $k => $v) {
            $stmtKv->execute([$k, json_encode($v, JSON_UNESCAPED_SLASHES)]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    return [
        'migrated' => true,
        'users' => (int) $pdo->query('SELECT COUNT(*) FROM `spacix_users`')->fetchColumn(),
        'secrets' => (int) $pdo->query('SELECT COUNT(*) FROM `spacix_secrets`')->fetchColumn(),
        'providers' => (int) $pdo->query('SELECT COUNT(*) FROM `spacix_providers`')->fetchColumn(),
        'models' => (int) $pdo->query('SELECT COUNT(*) FROM `spacix_model_pricing`')->fetchColumn(),
        'generations' => (int) $pdo->query('SELECT COUNT(*) FROM `spacix_generations`')->fetchColumn(),
    ];
}
