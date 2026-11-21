<?php
/**
 * SPACIX Studio — Complete Production PHP 8 + MySQL API Engine
 * 100% Feature Parity with `server.ts` + `src/server/store.ts` + `src/server/higgsfield.ts`
 * Powered by MySQL (`aixdqvdz_spacix`) and cURL for Runware.ai v1, fal.ai, Higgsfield & Muapi.
 */

require_once __DIR__ . '/config.php';

header('Referrer-Policy: strict-origin-when-cross-origin');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Token, X-HTTP-Method-Override');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$pdo = spacix_get_pdo();
spacix_ensure_schema_and_seed($pdo, false);

// Read JSON request body
$rawBody = file_get_contents('php://input');
$reqBody = [];
if (is_string($rawBody) && trim($rawBody) !== '') {
    $decoded = json_decode($rawBody, true);
    if (is_array($decoded)) {
        $reqBody = $decoded;
    }
}

// Parse request path (e.g. /api/generations/submit)
$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/api/catalog', PHP_URL_PATH) ?: '/api/catalog';
// Support subfolder or root mounting
$apiPos = strpos($requestUri, '/api/');
$path = $apiPos !== false ? substr($requestUri, $apiPos) : $requestUri;
$path = rtrim($path, '/') ?: '/';

// Method override support (_method in body or X-HTTP-Method-Override header)
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$headerOverride = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '';
$bodyOverride = isset($reqBody['_method']) && is_string($reqBody['_method']) ? $reqBody['_method'] : '';
$override = $headerOverride ?: $bodyOverride;
if ($override !== '') {
    $method = strtoupper($override);
} elseif (
    $method === 'POST' && (
        strpos($path, '/api/admin/providers/') === 0 ||
        strpos($path, '/api/admin/models/') === 0 ||
        (strpos($path, '/api/admin/secrets/') === 0 && $path !== '/api/admin/secrets') ||
        (strpos($path, '/api/admin/users/') === 0 && $path !== '/api/admin/users') ||
        $path === '/api/admin/billing' ||
        strpos($path, '/api/admin/support/') === 0 ||
        (strpos($path, '/api/admin/notifications/') === 0 && $path !== '/api/admin/notifications') ||
        (strpos($path, '/api/admin/team/') === 0 && $path !== '/api/admin/team')
    )
) {
    $method = 'PATCH';
}

// ============================================================================
// HELPER UTILITIES & MYSQL REPOSITORY FUNCTIONS
// ============================================================================

function json_response(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function uuidv4(): string {
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function mask_secret_value(string $secret, string $prefixHint = 'sk'): string {
    return spacix_mask_secret($secret, $prefixHint);
}

function is_real_external_secret(?string $secret): bool {
    $clean = trim((string) $secret);
    return $clean !== '' && strlen($clean) >= 8;
}

function get_secret_value(PDO $pdo, string $key): string {
    $stmt = $pdo->prepare('SELECT `secret_value` FROM `spacix_secrets` WHERE `secret_key` = ? LIMIT 1');
    $stmt->execute([strtoupper(trim($key))]);
    $val = $stmt->fetchColumn();
    return $val !== false && $val !== null ? trim((string) $val) : '';
}

function get_all_secrets_public(PDO $pdo): array {
    $rows = $pdo->query('SELECT * FROM `spacix_secrets` ORDER BY `category` ASC, `secret_key` ASC')->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'key' => $r['secret_key'],
            'category' => $r['category'] ?: 'auth',
            'label' => $r['label'] ?: $r['secret_key'],
            'secretMasked' => $r['secret_masked'] ?: 'Not configured',
            'hasValue' => !empty($r['has_value']) && trim((string) $r['secret_value']) !== '',
            'description' => $r['description'] ?? '',
            'updatedAt' => $r['updated_at'] ?: gmdate('c'),
        ];
    }
    return $out;
}

function kv_get(PDO $pdo, string $key, $default = []) {
    $stmt = $pdo->prepare('SELECT `v` FROM `spacix_kv_store` WHERE `k` = ? LIMIT 1');
    $stmt->execute([$key]);
    $val = $stmt->fetchColumn();
    if ($val === false || $val === null) {
        return $default;
    }
    $decoded = json_decode((string) $val, true);
    return $decoded !== null ? $decoded : $default;
}

function kv_set(PDO $pdo, string $key, $value): void {
    $stmt = $pdo->prepare('
        INSERT INTO `spacix_kv_store` (`k`, `v`)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE `v` = VALUES(`v`)
    ');
    $stmt->execute([$key, json_encode($value, JSON_UNESCAPED_SLASHES)]);
}

function get_auth_token(): string {
    $auth = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';
    if ($auth === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (stripos($auth, 'Bearer ') === 0) {
        return trim(substr($auth, 7));
    }
    if (!empty($_SERVER['HTTP_X_SESSION_TOKEN'])) {
        return trim((string) $_SERVER['HTTP_X_SESSION_TOKEN']);
    }
    return '';
}

function get_user_by_id(PDO $pdo, string $userId): ?array {
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_users` WHERE `id` = ? LIMIT 1');
    $stmt->execute([$userId]);
    $raw = $stmt->fetchColumn();
    return $raw ? json_decode((string) $raw, true) : null;
}

function get_user_row_by_email(PDO $pdo, string $email): ?array {
    $stmt = $pdo->prepare('SELECT * FROM `spacix_users` WHERE `email` = ? LIMIT 1');
    $stmt->execute([strtolower(trim($email))]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function save_user(PDO $pdo, array $u, ?string $passwordHash = null): void {
    $u['credits']['subscription'] = max(0, (int) ($u['credits']['subscription'] ?? 0));
    $u['credits']['topup'] = max(0, (int) ($u['credits']['topup'] ?? 0));
    $u['credits']['total'] = $u['credits']['subscription'] + $u['credits']['topup'];

    if ($passwordHash !== null) {
        $stmt = $pdo->prepare('
            INSERT INTO `spacix_users`
            (`id`, `email`, `name`, `password_hash`, `role`, `admin_sub_role`, `status`, `plan`, `billing_cycle`, `plan_renews_at`, `stripe_customer_id`, `credits_subscription`, `credits_topup`, `credits_total`, `last_login_at`, `created_at`, `payload_json`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            `email` = VALUES(`email`),
            `name` = VALUES(`name`),
            `password_hash` = VALUES(`password_hash`),
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
            `last_login_at` = VALUES(`last_login_at`),
            `payload_json` = VALUES(`payload_json`)
        ');
        $stmt->execute([
            $u['id'],
            strtolower(trim($u['email'])),
            $u['name'],
            $passwordHash,
            $u['role'] ?? 'user',
            $u['adminSubRole'] ?? null,
            $u['status'] ?? 'active',
            $u['plan'] ?? 'free',
            $u['billingCycle'] ?? 'monthly',
            $u['planRenewsAt'] ?? null,
            $u['stripeCustomerId'] ?? null,
            $u['credits']['subscription'],
            $u['credits']['topup'],
            $u['credits']['total'],
            $u['lastLoginAt'] ?? null,
            $u['createdAt'] ?? gmdate('c'),
            json_encode($u, JSON_UNESCAPED_SLASHES),
        ]);
        return;
    }

    $stmt = $pdo->prepare('
        INSERT INTO `spacix_users`
        (`id`, `email`, `name`, `role`, `admin_sub_role`, `status`, `plan`, `billing_cycle`, `plan_renews_at`, `stripe_customer_id`, `credits_subscription`, `credits_topup`, `credits_total`, `last_login_at`, `created_at`, `payload_json`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        `email` = VALUES(`email`),
        `name` = VALUES(`name`),
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
        `last_login_at` = VALUES(`last_login_at`),
        `payload_json` = VALUES(`payload_json`)
    ');
    $stmt->execute([
        $u['id'],
        strtolower(trim($u['email'])),
        $u['name'],
        $u['role'] ?? 'user',
        $u['adminSubRole'] ?? null,
        $u['status'] ?? 'active',
        $u['plan'] ?? 'free',
        $u['billingCycle'] ?? 'monthly',
        $u['planRenewsAt'] ?? null,
        $u['stripeCustomerId'] ?? null,
        $u['credits']['subscription'],
        $u['credits']['topup'],
        $u['credits']['total'],
        $u['lastLoginAt'] ?? null,
        $u['createdAt'] ?? gmdate('c'),
        json_encode($u, JSON_UNESCAPED_SLASHES),
    ]);
}

function create_user_session(PDO $pdo, string $userId, bool $rememberMe = true): string {
    $sessionToken = 'sess_' . round(microtime(true) * 1000) . '_' . bin2hex(random_bytes(8));
    $ttlMs = $rememberMe ? (30 * 86400 * 1000) : (86400 * 1000);
    $expiresAt = (int) round(microtime(true) * 1000) + $ttlMs;
    $stmt = $pdo->prepare('
        INSERT INTO `spacix_sessions` (`token`, `user_id`, `remember_me`, `expires_at`)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `user_id` = VALUES(`user_id`), `remember_me` = VALUES(`remember_me`), `expires_at` = VALUES(`expires_at`)
    ');
    $stmt->execute([$sessionToken, $userId, $rememberMe ? 1 : 0, $expiresAt]);
    return $sessionToken;
}

function get_session_user(PDO $pdo): ?array {
    $token = get_auth_token();
    if ($token === '' || $token === 'signed_out' || $token === 'default_session_token' || $token === 'creator_session_token') {
        return null;
    }
    $stmt = $pdo->prepare('SELECT `user_id`, `expires_at` FROM `spacix_sessions` WHERE `token` = ? LIMIT 1');
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    if (!$row || empty($row['user_id'])) {
        return null;
    }
    $expiresAt = (int) ($row['expires_at'] ?? 0);
    if ($expiresAt > 0 && $expiresAt < round(microtime(true) * 1000)) {
        $pdo->prepare('DELETE FROM `spacix_sessions` WHERE `token` = ?')->execute([$token]);
        return null;
    }
    return get_user_by_id($pdo, (string) $row['user_id']);
}

function require_admin(PDO $pdo): array {
    $user = get_session_user($pdo);
    if (!$user || ($user['role'] ?? '') !== 'admin') {
        json_response(['error' => 'Not found'], 404);
    }
    return $user;
}

function record_audit(PDO $pdo, string $actorEmail, string $action, string $target, string $detail): array {
    $entry = [
        'id' => 'aud_' . round(microtime(true) * 1000) . '_' . substr(md5(uniqid('', true)), 0, 4),
        'actorEmail' => $actorEmail,
        'action' => $action,
        'target' => $target,
        'detail' => $detail,
        'createdAt' => gmdate('c'),
    ];
    $stmt = $pdo->prepare('
        INSERT INTO `spacix_audit_log` (`id`, `actor_email`, `action`, `created_at`, `payload_json`)
        VALUES (?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $entry['id'],
        $actorEmail,
        $action,
        $entry['createdAt'],
        json_encode($entry, JSON_UNESCAPED_SLASHES),
    ]);
    return $entry;
}

function record_ledger(PDO $pdo, array $params): ?array {
    $uniqueKey = substr(($params['reason'] ?? 'adj') . ':' . ($params['refType'] ?? 'ref') . ':' . ($params['refId'] ?? uniqid()), 0, 190);
    $chk = $pdo->prepare('SELECT `payload_json` FROM `spacix_ledger` WHERE `unique_key` = ? LIMIT 1');
    $chk->execute([$uniqueKey]);
    if ($chk->fetchColumn()) {
        return null; // Idempotent skip
    }
    $entry = [
        'id' => 'led_' . round(microtime(true) * 1000) . '_' . substr(md5(uniqid('', true)), 0, 5),
        'userId' => $params['userId'],
        'delta' => (int) $params['delta'],
        'bucket' => $params['bucket'],
        'reason' => $params['reason'],
        'refType' => $params['refType'],
        'refId' => $params['refId'],
        'note' => $params['note'] ?? '',
        'balanceAfter' => $params['balanceAfter'],
        'createdAt' => gmdate('c'),
    ];
    $stmt = $pdo->prepare('
        INSERT INTO `spacix_ledger` (`id`, `user_id`, `delta`, `bucket`, `reason`, `unique_key`, `created_at`, `payload_json`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $entry['id'],
        $entry['userId'],
        $entry['delta'],
        $entry['bucket'],
        $entry['reason'],
        $uniqueKey,
        $entry['createdAt'],
        json_encode($entry, JSON_UNESCAPED_SLASHES),
    ]);
    return $entry;
}

function get_all_providers(PDO $pdo): array {
    $rows = $pdo->query('SELECT `payload_json` FROM `spacix_providers` ORDER BY `priority` ASC')->fetchAll(PDO::FETCH_COLUMN);
    $out = [];
    foreach ($rows as $r) {
        $p = json_decode((string) $r, true);
        if ($p && isset($p['id'])) {
            $out[$p['id']] = $p;
        }
    }
    return $out;
}

function get_public_providers(PDO $pdo): array {
    $all = get_all_providers($pdo);
    $pub = [];
    foreach ($all as $p) {
        unset($p['rawSecret'], $p['rawWebhookSecret']);
        $pub[] = $p;
    }
    return $pub;
}

function save_provider(PDO $pdo, array $p): void {
    // Sync active key
    $keys = $p['apiKeys'] ?? [];
    $activeKey = null;
    foreach ($keys as $k) {
        if (!empty($k['enabled']) && !empty($k['isPrimary'])) {
            $activeKey = $k;
            break;
        }
    }
    if (!$activeKey) {
        foreach ($keys as $k) {
            if (!empty($k['enabled'])) {
                $activeKey = $k;
                break;
            }
        }
    }
    if (!$activeKey && !empty($keys)) {
        $activeKey = $keys[0];
    }

    if ($activeKey && trim((string) ($activeKey['keyValue'] ?? '')) !== '') {
        $p['rawSecret'] = trim((string) $activeKey['keyValue']);
        $p['hasSecret'] = true;
        $p['secretMasked'] = $activeKey['secretMasked'] ?? mask_secret_value($p['rawSecret'], $p['id']);
    } else {
        $p['rawSecret'] = '';
        $p['hasSecret'] = false;
        $p['secretMasked'] = 'No active API key configured';
    }

    $p['updatedAt'] = gmdate('c');

    $stmt = $pdo->prepare('
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
    $stmt->execute([
        $p['id'],
        $p['label'],
        !empty($p['enabled']) ? 1 : 0,
        $p['baseUrl'] ?? '',
        $p['secondaryUrl'] ?? null,
        $p['rawSecret'] ?? '',
        $p['rawWebhookSecret'] ?? '',
        (int) ($p['priority'] ?? 1),
        $p['updatedAt'],
        json_encode($p, JSON_UNESCAPED_SLASHES),
    ]);

    $secretKeyMap = [
        'runware' => 'RUNWARE_API_KEY',
        'fal' => 'FAL_KEY',
        'higgsfield' => 'HF_CREDENTIALS',
        'muapi' => 'MUAPI_KEY',
    ];
    if (isset($secretKeyMap[$p['id']])) {
        $secKey = $secretKeyMap[$p['id']];
        $val = (string) ($p['rawSecret'] ?? '');
        $masked = $val !== '' ? spacix_mask_secret($val, strtolower($secKey)) : 'Not configured';
        $pdo->prepare('
            UPDATE `spacix_secrets`
            SET `secret_value` = ?, `secret_masked` = ?, `has_value` = ?, `updated_at` = ?
            WHERE `secret_key` = ?
        ')->execute([$val, $masked, $val !== '' ? 1 : 0, $p['updatedAt'], $secKey]);
    }
}

function get_all_model_pricing(PDO $pdo): array {
    $rows = $pdo->query('SELECT `payload_json` FROM `spacix_model_pricing`')->fetchAll(PDO::FETCH_COLUMN);
    $out = [];
    foreach ($rows as $r) {
        $m = json_decode((string) $r, true);
        if ($m && isset($m['modelId'])) {
            $out[$m['modelId']] = $m;
        }
    }
    return $out;
}

function save_model_pricing(PDO $pdo, array $m): void {
    $stmt = $pdo->prepare('
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
    $stmt->execute([
        $m['modelId'],
        !empty($m['enabled']) ? 1 : 0,
        (float) ($m['baseHfUsd'] ?? 0.05),
        $m['preferredProvider'] ?? 'runware',
        $m['customEndpoint'] ?? null,
        json_encode($m, JSON_UNESCAPED_SLASHES),
    ]);
}

function get_generation_by_id(PDO $pdo, string $id): ?array {
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_generations` WHERE `id` = ? LIMIT 1');
    $stmt->execute([$id]);
    $raw = $stmt->fetchColumn();
    return $raw ? json_decode((string) $raw, true) : null;
}

function save_generation(PDO $pdo, array $g): void {
    $stmt = $pdo->prepare('
        INSERT INTO `spacix_generations`
        (`id`, `user_id`, `project_id`, `surface`, `model_id`, `api_provider`, `status`, `cost`, `is_public`, `created_at`, `updated_at`, `payload_json`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        `project_id` = VALUES(`project_id`),
        `status` = VALUES(`status`),
        `cost` = VALUES(`cost`),
        `is_public` = VALUES(`is_public`),
        `updated_at` = VALUES(`updated_at`),
        `payload_json` = VALUES(`payload_json`)
    ');
    $stmt->execute([
        $g['id'],
        $g['userId'],
        $g['projectId'] ?? null,
        $g['surface'],
        $g['modelId'],
        $g['apiProvider'] ?? 'runware',
        $g['status'] ?? 'queued',
        (int) ($g['cost'] ?? 1),
        !empty($g['isPublic']) ? 1 : 0,
        $g['createdAt'] ?? gmdate('c'),
        $g['updatedAt'] ?? gmdate('c'),
        json_encode($g, JSON_UNESCAPED_SLASHES),
    ]);
}

function refund_generation_credits(PDO $pdo, string $userId, string $generationId, int $cost, string $note): bool {
    $user = get_user_by_id($pdo, $userId);
    if (!$user) {
        return false;
    }
    $uniqueKey = 'generation_refund:generation:' . $generationId;
    $chk = $pdo->prepare('SELECT `id` FROM `spacix_ledger` WHERE `unique_key` = ? LIMIT 1');
    $chk->execute([$uniqueKey]);
    if ($chk->fetchColumn()) {
        return false;
    }

    $user['credits']['subscription'] = (int) ($user['credits']['subscription'] ?? 0) + $cost;
    $user['credits']['total'] = $user['credits']['subscription'] + (int) ($user['credits']['topup'] ?? 0);
    save_user($pdo, $user);

    record_ledger($pdo, [
        'userId' => $userId,
        'delta' => $cost,
        'bucket' => 'subscription',
        'reason' => 'generation_refund',
        'refType' => 'generation',
        'refId' => $generationId,
        'note' => $note,
        'balanceAfter' => $user['credits'],
    ]);
    return true;
}

// ============================================================================
// RUNWARE v1 & MULTI-PROVIDER HTTP CLIENT FUNCTIONS
// ============================================================================

function send_runware_tasks(array $tasks, string $apiKey, string $baseUrl = 'https://api.runware.ai/v1'): array {
    $ch = curl_init($baseUrl ?: 'https://api.runware.ai/v1');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . trim($apiKey),
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode(array_values($tasks), JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT => 65,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = is_string($raw) ? json_decode($raw, true) : [];
    if (!is_array($decoded)) {
        $decoded = [];
    }
    $decoded['status'] = $status;
    return $decoded;
}

function resolve_runware_model_air(string $surface, string $rawIdentifier): string {
    $id = trim($rawIdentifier);
    if ($id === '' || $id === 'auto') {
        return 'auto';
    }
    $lower = strtolower($id);
    if ($surface === 'image') {
        if (strpos($lower, 'grok') !== false) return 'xai:grok-imagine@image-2.0';
        if (strpos($lower, 'z-image') !== false || $lower === 'runware:100@1' || $lower === 'runware:101@1') {
            return 'runware:100@1';
        }
        if (strpos($lower, 'flux') !== false) return 'runware:101@1';
        if (
            strpos($lower, 'civitai:') === 0 ||
            strpos($lower, 'bfl:') === 0 ||
            strpos($lower, 'xai:') === 0 ||
            strpos($lower, 'rundiffusion:') === 0
        ) {
            return $id;
        }
        return 'auto';
    }
    if ($surface === 'video') {
        if (
            strpos($lower, 'klingai:') === 0 ||
            strpos($lower, 'bytedance:') === 0 ||
            strpos($lower, 'alibaba:') === 0 ||
            strpos($lower, 'sync:') === 0 ||
            strpos($lower, 'runware:') === 0
        ) {
            return $id;
        }
        return 'auto';
    }
    if ($surface === 'audio') {
        if (strpos($lower, 'fishaudio:') === 0 || strpos($lower, 'fish') !== false) {
            return 'fishaudio:s2.1@pro';
        }
        return 'auto';
    }
    return 'auto';
}

function get_merged_catalog_models(PDO $pdo): array {
    $stored = kv_get($pdo, 'catalogModels', []);
    if (!is_array($stored)) {
        $stored = [];
    }
    $seedPath = __DIR__ . '/seed_data.json';
    if (!is_file($seedPath)) {
        return $stored;
    }
    static $seedModelsCache = null;
    if ($seedModelsCache === null) {
        $rawSeed = @file_get_contents($seedPath);
        $decodedSeed = is_string($rawSeed) ? json_decode($rawSeed, true) : null;
        $seedModelsCache = is_array($decodedSeed['catalogModels'] ?? null) ? $decodedSeed['catalogModels'] : [];
    }
    if (empty($seedModelsCache)) {
        return $stored;
    }

    $byId = [];
    foreach ($stored as $idx => $m) {
        if (is_array($m) && !empty($m['id'])) {
            $byId[$m['id']] = $idx;
        }
    }

    $changed = false;
    foreach ($seedModelsCache as $sm) {
        if (!is_array($sm) || empty($sm['id'])) {
            continue;
        }
        $sid = $sm['id'];
        if (!isset($byId[$sid])) {
            $stored[] = $sm;
            $byId[$sid] = count($stored) - 1;
            $changed = true;
        } else {
            $idx = $byId[$sid];
            if (isset($sm['lipSyncCapability']) && !isset($stored[$idx]['lipSyncCapability'])) {
                $stored[$idx]['lipSyncCapability'] = $sm['lipSyncCapability'];
                $changed = true;
            }
            if (isset($sm['videoInputModes']) && !isset($stored[$idx]['videoInputModes'])) {
                $stored[$idx]['videoInputModes'] = $sm['videoInputModes'];
                $changed = true;
            }
        }
    }

    if ($changed) {
        kv_set($pdo, 'catalogModels', array_values($stored));
    }
    return $stored;
}

function spacix_is_public_ip(string $ip): bool {
    return filter_var(
        $ip,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    ) !== false;
}

function spacix_validate_external_audio_url(string $rawUrl): array {
    $trimmed = trim($rawUrl);
    if ($trimmed === '' || strlen($trimmed) > 2048) {
        return ['ok' => false, 'error' => 'Please provide a valid direct audio URL.'];
    }
    $parts = @parse_url($trimmed);
    if (!is_array($parts)) {
        return ['ok' => false, 'error' => 'Invalid URL format.'];
    }
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    if ($scheme !== 'https' && $scheme !== 'http') {
        return ['ok' => false, 'error' => 'Only HTTP and HTTPS audio URLs are supported.'];
    }
    if (!empty($parts['user']) || !empty($parts['pass'])) {
        return ['ok' => false, 'error' => 'URLs with embedded credentials are not supported.'];
    }
    $host = strtolower(trim((string) ($parts['host'] ?? ''), '[]'));
    if (
        $host === '' ||
        $host === 'localhost' ||
        str_ends_with($host, '.localhost') ||
        str_ends_with($host, '.local') ||
        str_ends_with($host, '.internal')
    ) {
        return ['ok' => false, 'error' => 'Local or internal hostnames are not permitted.'];
    }

    if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
        if (!spacix_is_public_ip($host)) {
            return ['ok' => false, 'error' => 'Private or reserved IP addresses are not permitted.'];
        }
        return ['ok' => true, 'url' => $trimmed, 'host' => $host, 'ips' => [$host]];
    }

    $ips = [];
    $v4 = @gethostbynamel($host);
    if (is_array($v4)) {
        $ips = array_merge($ips, $v4);
    }
    if (function_exists('dns_get_record')) {
        $aaaa = @dns_get_record($host, DNS_AAAA);
        if (is_array($aaaa)) {
            foreach ($aaaa as $rec) {
                if (!empty($rec['ipv6'])) {
                    $ips[] = $rec['ipv6'];
                }
            }
        }
    }
    $ips = array_values(array_unique($ips));
    if (empty($ips)) {
        return ['ok' => false, 'error' => 'Could not resolve the audio host. Verify the direct audio link is reachable.'];
    }
    foreach ($ips as $ip) {
        if (!spacix_is_public_ip($ip)) {
            return ['ok' => false, 'error' => 'This URL resolves to a restricted network address and cannot be imported.'];
        }
    }
    return ['ok' => true, 'url' => $trimmed, 'host' => $host, 'ips' => $ips];
}

function spacix_detect_audio_magic_mime(string $bytes, string $contentTypeHint = ''): ?string {
    $len = strlen($bytes);
    if ($len < 12) {
        return null;
    }
    $head4 = substr($bytes, 0, 4);
    $head3 = substr($bytes, 0, 3);
    $b0 = ord($bytes[0]);
    $b1 = ord($bytes[1]);

    if ($head4 === 'RIFF' && substr($bytes, 8, 4) === 'WAVE') {
        return 'audio/wav';
    }
    if ($head3 === 'ID3' || ($b0 === 0xFF && ($b1 & 0xE0) === 0xE0)) {
        return ($b0 === 0xFF && ($b1 & 0xF6) === 0xF0) ? 'audio/aac' : 'audio/mpeg';
    }
    if ($head4 === 'OggS') {
        return 'audio/ogg';
    }
    if ($head4 === 'fLaC') {
        return 'audio/flac';
    }
    if (substr($bytes, 4, 4) === 'ftyp') {
        $brand = substr($bytes, 8, 4);
        if (in_array($brand, ['M4A ', 'M4B ', 'mp42', 'isom', 'iso2', 'qt  '], true)) {
            return 'audio/mp4';
        }
    }
    if ($head4 === "\x1A\x45\xDF\xA3") {
        return 'audio/webm';
    }
    $cleanHint = strtolower(trim(explode(';', $contentTypeHint)[0] ?? ''));
    if (in_array($cleanHint, ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-flac'], true)) {
        $prefixTrim = ltrim(substr($bytes, 0, 64));
        if (strpos($prefixTrim, '<') === 0 || strpos($prefixTrim, '{') === 0) {
            return null;
        }
        return $cleanHint === 'audio/mp3' ? 'audio/mpeg' : $cleanHint;
    }
    return null;
}

function compute_runware_dimensions(string $surface, array $settings): array {
    $aspect = (string) ($settings['aspect_ratio'] ?? '16:9');
    $res = (string) ($settings['resolution'] ?? ($surface === 'video' ? '1080p' : '2K'));
    if ($res === '4K') {
        if ($aspect === '9:16') return ['width' => 2160, 'height' => 3840];
        if ($aspect === '1:1') return ['width' => 2048, 'height' => 2048];
        return ['width' => 3840, 'height' => 2160];
    }
    if ($surface === 'image') {
        if ($aspect === '1:1') return ['width' => 1024, 'height' => 1024];
        if ($aspect === '9:16') return ['width' => 768, 'height' => 1344];
        if ($aspect === '4:3') return ['width' => 1152, 'height' => 896];
        if ($aspect === '3:4') return ['width' => 896, 'height' => 1152];
        return ['width' => 1344, 'height' => 768];
    }
    if ($aspect === '9:16') return ['width' => 1080, 'height' => 1920];
    if ($aspect === '1:1') return ['width' => 1080, 'height' => 1080];
    return ['width' => 1920, 'height' => 1080];
}

function finalize_generation_run(PDO $pdo, string $generationId): ?array {
    $gen = get_generation_by_id($pdo, $generationId);
    if (!$gen) return null;

    $status = $gen['status'] ?? 'queued';
    if (in_array($status, ['completed', 'failed', 'nsfw', 'canceled'], true)) {
        return $gen;
    }

    $createdAtTs = strtotime($gen['createdAt'] ?? 'now') ?: time();
    $ageSec = max(0, time() - $createdAtTs);

    // Poll Runware getResponse when running on Runware
    if (($gen['apiProvider'] ?? '') === 'runware' && !empty($gen['hfRequestId'])) {
        $providers = get_all_providers($pdo);
        $rwGw = $providers['runware'] ?? null;
        $rwSecret = ($rwGw['rawSecret'] ?? '') ?: get_secret_value($pdo, 'RUNWARE_API_KEY');
        if (is_real_external_secret($rwSecret)) {
            $pollRes = send_runware_tasks(
                [['taskType' => 'getResponse', 'taskUUID' => $gen['hfRequestId']]],
                $rwSecret,
                $rwGw['baseUrl'] ?? 'https://api.runware.ai/v1'
            );
            if (!empty($pollRes['errors'][0])) {
                $err = $pollRes['errors'][0];
                $gen['status'] = 'failed';
                $gen['error'] = sprintf(
                    'Runware [%s]: %s. Credits automatically refunded.',
                    $err['code'] ?? 'error',
                    $err['message'] ?? 'Task failed'
                );
                $gen['finishedAt'] = gmdate('c');
                $gen['updatedAt'] = $gen['finishedAt'];
                refund_generation_credits($pdo, $gen['userId'], $gen['id'], (int) $gen['cost'], 'Runware task error refund');
                save_generation($pdo, $gen);
                return $gen;
            }

            $item = $pollRes['data'][0] ?? null;
            $mediaUrl = $item['imageURL']
                ?? $item['videoURL']
                ?? $item['audioURL']
                ?? ($item['outputs']['files'][0]['url'] ?? null);

            if ($mediaUrl) {
                $surface = $gen['surface'] ?? 'image';
                $ext = $surface === 'video' ? 'mp4' : ($surface === 'audio' ? 'mp3' : 'jpg');
                $gen['outputs'] = [[
                    'kind' => $surface,
                    'url' => $mediaUrl,
                    'r2Key' => sprintf('u/%s/%s/0.%s', $gen['userId'], $gen['id'], $ext),
                    'width' => 1280,
                    'height' => 720,
                    'durationSec' => $surface === 'image' ? null : 8,
                ]];
                $gen['status'] = 'completed';
                $gen['finishedAt'] = gmdate('c');
                $gen['updatedAt'] = $gen['finishedAt'];
                save_generation($pdo, $gen);
                return $gen;
            }

            if ($ageSec < 180) {
                $gen['status'] = 'in_progress';
                $gen['updatedAt'] = gmdate('c');
                save_generation($pdo, $gen);
                return $gen;
            }
        }
    }

    if ($ageSec > 180) {
        $gen['status'] = 'failed';
        $gen['error'] = 'Provider request timed out waiting for completion. Credits automatically refunded.';
        $gen['finishedAt'] = gmdate('c');
        $gen['updatedAt'] = $gen['finishedAt'];
        refund_generation_credits($pdo, $gen['userId'], $gen['id'], (int) $gen['cost'], 'Provider timeout refund');
        save_generation($pdo, $gen);
        return $gen;
    }

    return $gen;
}

// ============================================================================
// ROUTE DISPATCHER
// ============================================================================

// 1. AUTHENTICATION (Real Database Login, Sign Up, Remember Me, Forgot/Reset Password)
if ($path === '/api/auth/session' && $method === 'GET') {
    $user = get_session_user($pdo);
    json_response(['user' => $user]);
}

if ($path === '/api/auth/register' && $method === 'POST') {
    $email = strtolower(trim((string) ($reqBody['email'] ?? '')));
    $name = trim((string) ($reqBody['name'] ?? ''));
    $password = (string) ($reqBody['password'] ?? '');
    $rememberMe = isset($reqBody['rememberMe']) ? (bool) $reqBody['rememberMe'] : true;

    if ($email === '' || strpos($email, '@') === false) {
        json_response(['error' => 'Enter a valid email address.'], 400);
    }
    if (strlen($password) < 6) {
        json_response(['error' => 'Password must be at least 6 characters long.'], 400);
    }

    $existing = get_user_row_by_email($pdo, $email);
    if ($existing) {
        json_response(['error' => 'An account with this email already exists. Please sign in instead.'], 400);
    }

    $billingConfig = kv_get($pdo, 'billingConfig', ['signupBonusCredits' => 50]);
    $bonus = max(0, (int) ($billingConfig['signupBonusCredits'] ?? 50));
    $now = gmdate('c');
    $uid = 'usr_' . round(microtime(true) * 1000) . '_' . substr(md5($email . uniqid('', true)), 0, 5);
    $displayName = $name !== '' ? $name : ucfirst(explode('@', $email)[0]);

    $user = [
        'id' => $uid,
        'email' => $email,
        'name' => $displayName,
        'role' => 'user',
        'status' => 'active',
        'plan' => 'free',
        'billingCycle' => 'monthly',
        'credits' => [
            'subscription' => $bonus,
            'topup' => 0,
            'total' => $bonus,
        ],
        'lastLoginAt' => $now,
        'createdAt' => $now,
    ];

    $pwHash = spacix_hash_password($password);
    save_user($pdo, $user, $pwHash);

    if ($bonus > 0) {
        record_ledger($pdo, [
            'userId' => $uid,
            'delta' => $bonus,
            'bucket' => 'subscription',
            'reason' => 'subscription_reset',
            'refType' => 'signup_bonus',
            'refId' => 'signup_' . $uid,
            'note' => 'New account registration credit allowance',
            'balanceAfter' => $user['credits'],
        ]);
    }

    $sessionToken = create_user_session($pdo, $uid, $rememberMe);
    record_audit($pdo, $email, 'AUTH_REGISTER', $email, 'Registered new account (' . $displayName . ')');

    json_response([
        'ok' => true,
        'sessionToken' => $sessionToken,
        'rememberMe' => $rememberMe,
        'user' => $user,
    ]);
}

if ($path === '/api/auth/login' && $method === 'POST') {
    $email = strtolower(trim((string) ($reqBody['email'] ?? '')));
    $password = (string) ($reqBody['password'] ?? '');
    $rememberMe = isset($reqBody['rememberMe']) ? (bool) $reqBody['rememberMe'] : true;

    if ($email === '' || strpos($email, '@') === false || $password === '') {
        json_response(['error' => 'Enter your email address and password.'], 400);
    }

    $row = get_user_row_by_email($pdo, $email);
    if (!$row) {
        json_response(['error' => 'Invalid email or password.'], 401);
    }

    $storedHash = (string) ($row['password_hash'] ?? '');
    if (!spacix_verify_password($password, $storedHash)) {
        json_response(['error' => 'Invalid email or password.'], 401);
    }

    $user = json_decode((string) $row['payload_json'], true);
    if (!$user || ($user['status'] ?? 'active') === 'suspended') {
        json_response(['error' => 'This studio account is currently suspended.'], 403);
    }

    $user['lastLoginAt'] = gmdate('c');
    save_user($pdo, $user);

    $sessionToken = create_user_session($pdo, $user['id'], $rememberMe);
    record_audit($pdo, $user['email'], 'AUTH_LOGIN', $user['email'], 'Signed in (rememberMe=' . ($rememberMe ? 'true' : 'false') . ')');

    json_response([
        'ok' => true,
        'sessionToken' => $sessionToken,
        'rememberMe' => $rememberMe,
        'user' => $user,
    ]);
}

if ($path === '/api/auth/logout' && $method === 'POST') {
    $token = get_auth_token();
    if ($token !== '') {
        $pdo->prepare('DELETE FROM `spacix_sessions` WHERE `token` = ?')->execute([$token]);
    }
    json_response(['ok' => true]);
}

if ($path === '/api/auth/forgot-password' && $method === 'POST') {
    $email = strtolower(trim((string) ($reqBody['email'] ?? '')));
    if ($email === '' || strpos($email, '@') === false) {
        json_response(['error' => 'Enter a valid email address.'], 400);
    }

    $row = get_user_row_by_email($pdo, $email);
    if (!$row) {
        json_response(['error' => 'No account found with that email address.'], 404);
    }

    $code = (string) random_int(100000, 999999);
    $token = 'rst_' . round(microtime(true) * 1000) . '_' . bin2hex(random_bytes(6));
    $expiresAt = (int) round(microtime(true) * 1000) + (15 * 60 * 1000);
    $now = gmdate('c');

    $stmt = $pdo->prepare('
        INSERT INTO `spacix_password_resets` (`token`, `email`, `code`, `expires_at`, `used`, `created_at`)
        VALUES (?, ?, ?, ?, 0, ?)
    ');
    $stmt->execute([$token, $email, $code, $expiresAt, $now]);

    $resendKey = get_secret_value($pdo, 'RESEND_API_KEY');
    $emailFrom = get_secret_value($pdo, 'EMAIL_FROM') ?: 'spacix@ticketplaster.com';
    $deliveredByEmail = false;

    if ($resendKey !== '') {
        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $resendKey,
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'from' => $emailFrom,
                'to' => [$email],
                'subject' => 'SPACIX Studio Password Reset Code: ' . $code,
                'html' => sprintf(
                    '<div style="font-family:sans-serif;padding:24px;background:#0a0b0e;color:#f5f3ef;"><h2>SPACIX Studio Password Reset</h2><p>Your 6-digit password reset verification code is:</p><div style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#f59e0b;margin:16px 0;">%s</div><p>This code expires in 15 minutes.</p></div>',
                    $code
                ),
            ], JSON_UNESCAPED_SLASHES),
            CURLOPT_TIMEOUT => 10,
        ]);
        curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $deliveredByEmail = ($httpCode >= 200 && $httpCode < 300);
    }

    if (!$deliveredByEmail && function_exists('mail')) {
        $headers = "MIME-Version: 1.0\r\nContent-type:text/html;charset=UTF-8\r\nFrom: SPACIX Studio <{$emailFrom}>\r\n";
        $body = sprintf(
            '<div style="font-family:sans-serif;padding:24px;background:#0a0b0e;color:#f5f3ef;"><h2>SPACIX Studio Password Reset</h2><p>Your 6-digit verification code is: <strong>%s</strong></p><p>Expires in 15 minutes.</p></div>',
            $code
        );
        @mail($email, 'SPACIX Studio Password Reset Code: ' . $code, $body, $headers);
    }

    record_audit($pdo, $email, 'AUTH_PASSWORD_RESET_REQUEST', $email, 'Password reset code generated');

    json_response([
        'ok' => true,
        'email' => $email,
        'expiresInMinutes' => 15,
        'deliveredByEmail' => $deliveredByEmail,
        'resetToken' => $token,
        'verificationCode' => $deliveredByEmail ? null : $code,
        'message' => $deliveredByEmail
            ? 'A 6-digit verification code has been emailed to ' . $email . '.'
            : 'Verification code generated from database. Enter your 6-digit code below to set a new password.',
    ]);
}

if ($path === '/api/auth/reset-password' && $method === 'POST') {
    $email = strtolower(trim((string) ($reqBody['email'] ?? '')));
    $code = trim((string) ($reqBody['code'] ?? ''));
    $newPassword = (string) ($reqBody['newPassword'] ?? '');

    if ($email === '' || $code === '' || strlen($newPassword) < 6) {
        json_response(['error' => 'Email, 6-digit verification code, and a new password (min 6 chars) are required.'], 400);
    }

    $stmt = $pdo->prepare('
        SELECT * FROM `spacix_password_resets`
        WHERE `email` = ? AND `code` = ? AND `used` = 0
        ORDER BY `created_at` DESC LIMIT 1
    ');
    $stmt->execute([$email, $code]);
    $resetRow = $stmt->fetch();

    if (!$resetRow || (int) $resetRow['expires_at'] < round(microtime(true) * 1000)) {
        json_response(['error' => 'Invalid or expired password reset verification code.'], 400);
    }

    $userRow = get_user_row_by_email($pdo, $email);
    if (!$userRow) {
        json_response(['error' => 'Account not found.'], 404);
    }

    $pdo->prepare('UPDATE `spacix_password_resets` SET `used` = 1 WHERE `token` = ?')->execute([$resetRow['token']]);

    $user = json_decode((string) $userRow['payload_json'], true);
    $user['lastLoginAt'] = gmdate('c');
    $pwHash = spacix_hash_password($newPassword);
    save_user($pdo, $user, $pwHash);

    $sessionToken = create_user_session($pdo, $user['id'], true);
    record_audit($pdo, $email, 'AUTH_PASSWORD_RESET_COMPLETE', $email, 'Password reset completed');

    json_response([
        'ok' => true,
        'sessionToken' => $sessionToken,
        'user' => $user,
    ]);
}

if ($path === '/api/auth/change-password' && $method === 'POST') {
    $user = get_session_user($pdo);
    if (!$user) {
        json_response(['error' => 'Sign in to change your password.'], 401);
    }
    $currentPassword = (string) ($reqBody['currentPassword'] ?? '');
    $newPassword = (string) ($reqBody['newPassword'] ?? '');
    if (strlen($newPassword) < 6) {
        json_response(['error' => 'New password must be at least 6 characters long.'], 400);
    }

    $row = get_user_row_by_email($pdo, $user['email']);
    if (!$row || !spacix_verify_password($currentPassword, (string) ($row['password_hash'] ?? ''))) {
        json_response(['error' => 'Current password is incorrect.'], 400);
    }

    $pwHash = spacix_hash_password($newPassword);
    save_user($pdo, $user, $pwHash);
    record_audit($pdo, $user['email'], 'AUTH_PASSWORD_CHANGE', $user['email'], 'Changed account password');

    json_response(['ok' => true, 'message' => 'Your password has been updated in the database.']);
}

if ($path === '/api/auth/profile' && ($method === 'PATCH' || $method === 'POST')) {
    $user = get_session_user($pdo);
    if (!$user) {
        json_response(['error' => 'Unauthorized'], 401);
    }
    $name = trim((string) ($reqBody['name'] ?? ''));
    if ($name !== '') {
        $user['name'] = $name;
        save_user($pdo, $user);
    }
    json_response(['ok' => true, 'user' => $user]);
}


// 2. CATALOG
if ($path === '/api/catalog' && $method === 'GET') {
    $reqUser = get_session_user($pdo);
    $isAdmin = ($reqUser['role'] ?? '') === 'admin';

    $providers = get_all_providers($pdo);
    $enabledProviderIds = [];
    foreach ($providers as $pid => $p) {
        if (!empty($p['enabled'])) {
            $enabledProviderIds[$pid] = true;
        }
    }

    $catalogModels = get_merged_catalog_models($pdo);
    $modelOverrides = get_all_model_pricing($pdo);

    $models = [];
    foreach ($catalogModels as $m) {
        $mid = $m['id'];
        $ov = $modelOverrides[$mid] ?? null;
        if ($ov && empty($ov['enabled'])) {
            continue;
        }
        $effectiveUsd = isset($ov['baseHfUsd']) ? (float) $ov['baseHfUsd'] : (float) ($m['baseHfUsd'] ?? 0.05);
        $baseSpecs = $m['effectiveProviders'] ?? $m['supportedProviders'] ?? [];

        $allowedList = (!empty($ov['allowedProviders']) && is_array($ov['allowedProviders']))
            ? $ov['allowedProviders']
            : array_column($baseSpecs, 'providerId');

        $filteredSpecs = [];
        foreach ($baseSpecs as $spec) {
            $spId = $spec['providerId'] ?? '';
            if (in_array($spId, $allowedList, true) && isset($enabledProviderIds[$spId])) {
                if ($ov && $spId === ($ov['preferredProvider'] ?? '')) {
                    $spec['baseUsd'] = $effectiveUsd;
                    if (!empty($ov['customEndpoint'])) {
                        $spec['endpoint'] = $ov['customEndpoint'];
                    }
                }
                $filteredSpecs[] = $spec;
            }
        }
        if (empty($filteredSpecs)) {
            $filteredSpecs = $baseSpecs;
        }

        $defaultApiProvider = $ov['preferredProvider'] ?? ($m['defaultApiProvider'] ?? 'runware');

        $item = [
            'id' => $m['id'],
            'surface' => $m['surface'],
            'family' => $m['family'],
            'provider' => $m['provider'],
            'label' => $m['label'],
            'category' => $m['category'],
            'description' => $m['description'],
            'bestFor' => $m['bestFor'],
            'badges' => $m['badges'],
            'docsUrl' => $m['docsUrl'],
            'modes' => $m['modes'],
            'roles' => $m['roles'],
            'requirePrompt' => $m['requirePrompt'],
            'supportsEnhancePrompt' => $m['supportsEnhancePrompt'],
            'settings' => $m['settings'],
            'baseHfUsd' => $effectiveUsd,
            'billingUnit' => $m['billingUnit'],
            'previewGradient' => $m['previewGradient'],
            'previewAccent' => $m['previewAccent'],
        ];
        if (!empty($m['lipSyncCapability'])) {
            $item['lipSyncCapability'] = $m['lipSyncCapability'];
        }
        if (!empty($m['videoInputModes']) && is_array($m['videoInputModes'])) {
            $item['videoInputModes'] = $m['videoInputModes'];
        }
        if ($isAdmin) {
            $item['defaultApiProvider'] = $defaultApiProvider;
            $item['supportedProviders'] = $filteredSpecs;
        }
        $models[] = $item;
    }

    $presets = kv_get($pdo, 'initialPresets', []);
    $notifRows = $pdo->query('SELECT `payload_json` FROM `spacix_notifications` WHERE `active` = 1 ORDER BY `created_at` DESC')->fetchAll(PDO::FETCH_COLUMN);
    $notifications = [];
    foreach ($notifRows as $nr) {
        $n = json_decode((string) $nr, true);
        if ($n && (($n['targetAudience'] ?? 'all') !== 'admins' || $isAdmin)) {
            $notifications[] = $n;
        }
    }

    $billingConfig = kv_get($pdo, 'billingConfig', ['creditUsdValue' => 0.01, 'creditMarkup' => 2.0, 'signupBonusCredits' => 50]);

    json_response([
        'models' => $models,
        'providers' => $isAdmin ? get_public_providers($pdo) : [],
        'presets' => $presets,
        'notifications' => $notifications,
        'plans' => kv_get($pdo, 'plans', []),
        'topups' => kv_get($pdo, 'topups', []),
        'creditMarkup' => (float) ($billingConfig['creditMarkup'] ?? 2.0),
        'creditUsdValue' => (float) ($billingConfig['creditUsdValue'] ?? 0.01),
    ]);
}

// 3. GENERATIONS
if ($path === '/api/generations' && $method === 'GET') {
    $user = get_session_user($pdo);
    if (!$user) {
        json_response(['generations' => []]);
    }
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_generations` WHERE `user_id` = ? ORDER BY `created_at` DESC');
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $surface = $_GET['surface'] ?? '';
    $projectId = $_GET['projectId'] ?? '';

    $gens = [];
    foreach ($rows as $r) {
        $g = json_decode((string) $r, true);
        if (!$g) continue;
        if (in_array($g['status'] ?? '', ['pending_submit', 'queued', 'in_progress'], true)) {
            $g = finalize_generation_run($pdo, $g['id']) ?: $g;
        }
        if ($surface !== '' && ($g['surface'] ?? '') !== $surface) continue;
        if ($projectId !== '' && ($g['projectId'] ?? '') !== $projectId) continue;
        $gens[] = $g;
    }

    $freshUser = get_user_by_id($pdo, $user['id']) ?: $user;
    json_response(['generations' => $gens, 'credits' => $freshUser['credits']]);
}

if ($path === '/api/generations/status' && $method === 'GET') {
    $user = get_session_user($pdo);
    if (!$user) {
        json_response(['error' => 'Unauthorized'], 401);
    }
    $idsParam = (string) ($_GET['ids'] ?? '');
    $ids = array_filter(array_map('trim', explode(',', $idsParam)));
    $items = [];
    foreach ($ids as $id) {
        $gen = finalize_generation_run($pdo, $id);
        if (!$gen || ($gen['userId'] ?? '') !== $user['id']) continue;
        $items[] = [
            'id' => $gen['id'],
            'status' => $gen['status'],
            'outputs' => $gen['outputs'] ?? [],
            'error' => $gen['error'] ?? null,
            'finishedAt' => $gen['finishedAt'] ?? null,
        ];
    }
    $freshUser = get_user_by_id($pdo, $user['id']) ?: $user;
    json_response(['items' => $items, 'credits' => $freshUser['credits']]);
}

if ($path === '/api/generations/submit' && $method === 'POST') {
    $user = get_session_user($pdo);
    if (!$user) {
        json_response(['error' => 'AUTH_REQUIRED', 'message' => 'Sign in to generate media.'], 401);
    }
    if (($user['status'] ?? 'active') === 'suspended') {
        json_response(['error' => 'ACCOUNT_SUSPENDED', 'message' => 'Your studio account is currently suspended.'], 403);
    }

    $modelId = (string) ($reqBody['modelId'] ?? '');
    $prompt = trim((string) ($reqBody['prompt'] ?? ''));
    $settings = is_array($reqBody['settings'] ?? null) ? $reqBody['settings'] : [];
    $media = is_array($reqBody['media'] ?? null) ? $reqBody['media'] : [];
    $mode = (string) ($reqBody['mode'] ?? '');
    $projectId = !empty($reqBody['projectId']) ? (string) $reqBody['projectId'] : null;
    $presetId = !empty($reqBody['presetId']) ? (string) $reqBody['presetId'] : null;
    $requestedProvider = (string) ($reqBody['apiProvider'] ?? '');

    $catalogModels = get_merged_catalog_models($pdo);
    $model = null;
    foreach ($catalogModels as $cm) {
        if (($cm['id'] ?? '') === $modelId) {
            $model = $cm;
            break;
        }
    }
    $overrides = get_all_model_pricing($pdo);
    $pricingOverride = $overrides[$modelId] ?? null;

    if (!$model || ($pricingOverride && empty($pricingOverride['enabled']))) {
        json_response(['error' => 'INVALID_MODEL', 'message' => 'Selected model is currently disabled by administrator.'], 400);
    }

    if (!empty($model['requirePrompt']) && $prompt === '') {
        json_response(['error' => 'VALIDATION_ERROR', 'message' => 'Enter a director prompt before generating.'], 400);
    }

    $providers = get_all_providers($pdo);
    $effectiveProviderId = $requestedProvider ?: ($pricingOverride['preferredProvider'] ?? ($model['defaultApiProvider'] ?? 'runware'));
    $selGw = $providers[$effectiveProviderId] ?? null;
    if (!$selGw || empty($selGw['enabled']) || !is_real_external_secret($selGw['rawSecret'] ?? '')) {
        $rwGw = $providers['runware'] ?? null;
        if ($rwGw && !empty($rwGw['enabled']) && is_real_external_secret($rwGw['rawSecret'] ?? '')) {
            $effectiveProviderId = 'runware';
        } else {
            foreach ($providers as $pid => $gw) {
                if (!empty($gw['enabled']) && is_real_external_secret($gw['rawSecret'] ?? '')) {
                    $effectiveProviderId = $pid;
                    break;
                }
            }
        }
    }

    $billingConfig = kv_get($pdo, 'billingConfig', ['creditUsdValue' => 0.01, 'creditMarkup' => 2.0]);
    $markup = (float) ($billingConfig['creditMarkup'] ?? 2.0);
    $creditUsd = max(0.001, (float) ($billingConfig['creditUsdValue'] ?? 0.01));
    $baseUsd = isset($pricingOverride['baseHfUsd']) ? (float) $pricingOverride['baseHfUsd'] : (float) ($model['baseHfUsd'] ?? 0.05);

    $hfUsdCost = $baseUsd;
    if (($model['billingUnit'] ?? '') === 'per_second') {
        $dur = max(1, (int) ($settings['duration'] ?? 5));
        $hfUsdCost = $baseUsd * $dur;
    } elseif (($model['surface'] ?? '') === 'audio' && (int) ($settings['duration'] ?? 0) >= 60) {
        $hfUsdCost = $baseUsd * 1.6;
    }
    $resSetting = (string) ($settings['resolution'] ?? '');
    if ($resSetting === '4K') $hfUsdCost *= 1.5;
    elseif ($resSetting === '2K') $hfUsdCost *= 1.2;
    elseif ($resSetting === '720p' || $resSetting === '1K') $hfUsdCost *= 0.85;
    if (count($media) > 2) $hfUsdCost *= 1.1;

    $cost = max(1, (int) ceil(($hfUsdCost * $markup) / $creditUsd));

    if ((int) ($user['credits']['total'] ?? 0) < $cost) {
        json_response([
            'error' => 'INSUFFICIENT_CREDITS',
            'message' => sprintf('This run requires %d credits, but your balance is %d.', $cost, $user['credits']['total'] ?? 0),
            'requiredCredits' => $cost,
            'availableCredits' => $user['credits']['total'] ?? 0,
        ], 402);
    }

    // Debit credits (subscription first, then topup)
    $subAvail = (int) ($user['credits']['subscription'] ?? 0);
    $fromSub = min($subAvail, $cost);
    $fromTopup = $cost - $fromSub;
    $user['credits']['subscription'] -= $fromSub;
    $user['credits']['topup'] = max(0, (int) ($user['credits']['topup'] ?? 0) - $fromTopup);
    $user['credits']['total'] = $user['credits']['subscription'] + $user['credits']['topup'];
    save_user($pdo, $user);

    $generationId = 'gen_' . round(microtime(true) * 1000) . '_' . substr(md5(uniqid('', true)), 0, 5);
    record_ledger($pdo, [
        'userId' => $user['id'],
        'delta' => -$cost,
        'bucket' => $fromTopup > 0 && $fromSub === 0 ? 'topup' : 'subscription',
        'reason' => 'generation_debit',
        'refType' => 'generation',
        'refId' => $generationId,
        'note' => sprintf('%s (%s)', $model['label'], $model['surface']),
        'balanceAfter' => $user['credits'],
    ]);

    $now = gmdate('c');
    $effectiveEndpoint = $pricingOverride['customEndpoint'] ?? ($model['restPaths']['default'] ?? $model['id']);
    $record = [
        'id' => $generationId,
        'userId' => $user['id'],
        'userName' => $user['name'],
        'projectId' => $projectId,
        'surface' => $model['surface'],
        'modelId' => $model['id'],
        'modelLabel' => $model['label'],
        'modelPath' => $effectiveEndpoint,
        'apiProvider' => $effectiveProviderId,
        'callingPattern' => $effectiveProviderId === 'runware' ? 'task_stream' : 'queue',
        'mode' => $mode ?: ($model['modes'][0] ?? 'Create'),
        'prompt' => $prompt,
        'settings' => $settings,
        'media' => $media,
        'status' => 'queued',
        'cost' => $cost,
        'outputs' => [],
        'isPublic' => false,
        'presetId' => $presetId,
        'createdAt' => $now,
        'updatedAt' => $now,
    ];

    $activeGw = $providers[$effectiveProviderId] ?? null;
    $rawSecret = ($activeGw['rawSecret'] ?? '') ?: ($effectiveProviderId === 'runware' ? get_secret_value($pdo, 'RUNWARE_API_KEY') : '');

    if (!is_real_external_secret($rawSecret)) {
        refund_generation_credits($pdo, $user['id'], $generationId, $cost, 'Missing provider API key refund');
        json_response([
            'error' => 'PROVIDER_KEY_MISSING',
            'message' => sprintf(
                'No active API key is configured in the database for %s. Add a valid API key in Admin Operations → Providers & Secrets.',
                $activeGw['label'] ?? $effectiveProviderId
            ),
        ], 400);
    }

    if ($effectiveProviderId === 'runware') {
        $taskUUID = uuidv4();
        $surface = $model['surface'];
        $dims = compute_runware_dimensions($surface, $settings);
        $resolvedModel = resolve_runware_model_air($surface, $effectiveEndpoint);
        $rwRouter = kv_get($pdo, 'runwareRoutingConfig', []);
        if (!empty($rwRouter['enabled'])) {
            $resolvedModel = 'auto';
        }

        if ($surface === 'audio') {
            $isSpeech = strpos($resolvedModel, 'fishaudio') !== false;
            $task = [
                'taskType' => 'audioInference',
                'taskUUID' => $taskUUID,
                'model' => $resolvedModel,
                'includeCost' => true,
            ];
            if ($isSpeech) {
                $task['speech'] = ['text' => $prompt];
            } else {
                $task['positivePrompt'] = $prompt;
            }
        } elseif ($surface === 'video') {
            $task = [
                'taskType' => 'videoInference',
                'taskUUID' => $taskUUID,
                'model' => $resolvedModel,
                'positivePrompt' => $prompt,
                'duration' => (int) ($settings['duration'] ?? 5),
                'deliveryMethod' => 'async',
                'includeCost' => true,
            ];
            if ($resolvedModel !== 'auto') {
                $task['width'] = $dims['width'];
                $task['height'] = $dims['height'];
            }
            $frameInput = (string) ($media['imageUrl'] ?? $media['characterUrl'] ?? '');
            if ($frameInput !== '' && (strpos($frameInput, 'http://') === 0 || strpos($frameInput, 'https://') === 0 || strpos($frameInput, 'data:image/') === 0)) {
                $task['frameImages'] = [['inputImage' => $frameInput, 'frame' => 'first']];
            }
            $audioInput = (string) ($media['audioUrl'] ?? '');
            if ($audioInput !== '' && (strpos($audioInput, 'http://') === 0 || strpos($audioInput, 'https://') === 0 || strpos($audioInput, 'data:audio/') === 0)) {
                $task['inputAudios'] = [$audioInput];
            }
            $videoInput = (string) ($media['videoUrl'] ?? '');
            if ($videoInput !== '' && (strpos($videoInput, 'http://') === 0 || strpos($videoInput, 'https://') === 0)) {
                $task['referenceVideos'] = [$videoInput];
            }
        } else {
            $safeW = min(2048, max(512, (int) round($dims['width'] / 64) * 64)) ?: 1024;
            $safeH = min(2048, max(512, (int) round($dims['height'] / 64) * 64)) ?: 1024;
            $task = [
                'taskType' => 'imageInference',
                'taskUUID' => $taskUUID,
                'model' => $resolvedModel,
                'positivePrompt' => $prompt,
                'width' => $safeW,
                'height' => $safeH,
                'includeCost' => true,
            ];
        }

        $rwRes = send_runware_tasks([$task], $rawSecret, $activeGw['baseUrl'] ?? 'https://api.runware.ai/v1');

        // Automatic fallback if specific model AIR was rejected
        if (!empty($rwRes['errors'][0])) {
            $errCode = strtolower((string) ($rwRes['errors'][0]['code'] ?? ''));
            $isAuthErr = strpos($errCode, 'auth') !== false || strpos($errCode, 'key') !== false || strpos($errCode, 'credit') !== false || ($rwRes['status'] ?? 200) === 401;
            if (!$isAuthErr) {
                $taskUUID = uuidv4();
                if ($surface === 'image') {
                    $task = [
                        'taskType' => 'imageInference',
                        'taskUUID' => $taskUUID,
                        'model' => 'runware:100@1',
                        'positivePrompt' => $prompt,
                        'width' => 1024,
                        'height' => 1024,
                        'includeCost' => true,
                    ];
                } elseif ($surface === 'video') {
                    $task = [
                        'taskType' => 'videoInference',
                        'taskUUID' => $taskUUID,
                        'model' => 'auto',
                        'positivePrompt' => $prompt,
                        'duration' => 5,
                        'deliveryMethod' => 'async',
                        'includeCost' => true,
                    ];
                } else {
                    $task = [
                        'taskType' => 'audioInference',
                        'taskUUID' => $taskUUID,
                        'model' => 'auto',
                        'positivePrompt' => $prompt,
                        'includeCost' => true,
                    ];
                }
                $rwRes = send_runware_tasks([$task], $rawSecret, $activeGw['baseUrl'] ?? 'https://api.runware.ai/v1');
            }
        }

        if (!empty($rwRes['errors'][0])) {
            $errObj = $rwRes['errors'][0];
            $record['status'] = 'failed';
            $record['error'] = sprintf('Runware [%s]: %s. Credits refunded.', $errObj['code'] ?? 'error', $errObj['message'] ?? 'Rejected');
            $record['finishedAt'] = gmdate('c');
            save_generation($pdo, $record);
            refund_generation_credits($pdo, $user['id'], $generationId, $cost, 'Submit 4xx refund');
            $freshUser = get_user_by_id($pdo, $user['id']) ?: $user;
            json_response(['generation' => $record, 'credits' => $freshUser['credits']]);
        }

        $firstItem = $rwRes['data'][0] ?? [];
        $effectiveUUID = $firstItem['taskUUID'] ?? $taskUUID;
        $record['hfRequestId'] = $effectiveUUID;

        // Store Runware task history
        $rwHist = [
            'taskUUID' => $effectiveUUID,
            'generationId' => $generationId,
            'request' => [$task],
            'response' => ['data' => $rwRes['data'] ?? [], 'errors' => $rwRes['errors'] ?? []],
            'createdAt' => gmdate('c'),
        ];
        $pdo->prepare('INSERT INTO `spacix_runware_tasks` (`task_uuid`, `generation_id`, `created_at`, `payload_json`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `payload_json` = VALUES(`payload_json`)')
            ->execute([$effectiveUUID, $generationId, $rwHist['createdAt'], json_encode($rwHist, JSON_UNESCAPED_SLASHES)]);

        $immediateUrl = $firstItem['imageURL']
            ?? $firstItem['videoURL']
            ?? $firstItem['audioURL']
            ?? ($firstItem['outputs']['files'][0]['url'] ?? null);

        if ($immediateUrl) {
            $ext = $surface === 'video' ? 'mp4' : ($surface === 'audio' ? 'mp3' : 'jpg');
            $record['outputs'] = [[
                'kind' => $surface,
                'url' => $immediateUrl,
                'r2Key' => sprintf('u/%s/%s/0.%s', $user['id'], $generationId, $ext),
                'width' => 1280,
                'height' => 720,
                'durationSec' => $surface === 'image' ? null : 8,
            ]];
            $record['status'] = 'completed';
            $record['finishedAt'] = gmdate('c');
        }
    }

    save_generation($pdo, $record);
    $freshUser = get_user_by_id($pdo, $user['id']) ?: $user;
    json_response(['generation' => $record, 'credits' => $freshUser['credits']]);
}

// Download Generation Output Proxy (`GET /api/generations/:id/download`)
if (preg_match('#^/api/generations/([^/]+)/download$#', $path, $m) && $method === 'GET') {
    $gen = get_generation_by_id($pdo, $m[1]);
    $out = $gen['outputs'][0] ?? null;
    if (!$gen || !$out || empty($out['url'])) {
        json_response(['error' => 'Generation output not found'], 404);
    }
    $url = (string) $out['url'];
    $kind = (string) ($out['kind'] ?? 'image');
    $ext = ($kind === 'video' && (str_ends_with($url, '.mp4') || strpos($url, 'vm.runware.ai') !== false))
        ? 'mp4'
        : ($kind === 'audio' ? (str_ends_with($url, '.mp3') ? 'mp3' : 'wav') : 'jpg');
    $filename = sprintf('spacix-%s-%s.%s', $gen['modelId'] ?? 'asset', substr($gen['id'], -6), $ext);

    if (strpos($url, 'data:') === 0) {
        $commaPos = strpos($url, ',');
        $meta = substr($url, 5, $commaPos - 5);
        $raw = substr($url, $commaPos + 1);
        $isBase64 = strpos($meta, ';base64') !== false;
        $mime = explode(';', $meta)[0] ?: 'application/octet-stream';
        $bytes = $isBase64 ? base64_decode($raw) : rawurldecode($raw);
        header('Content-Type: ' . $mime);
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        echo $bytes;
        exit;
    }

    if (strpos($url, 'http://') === 0 || strpos($url, 'https://') === 0) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 60,
        ]);
        $bytes = curl_exec($ch);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'application/octet-stream';
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code >= 200 && $code < 300 && $bytes !== false) {
            header('Content-Type: ' . $contentType);
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            echo $bytes;
            exit;
        }
    }

    $localFile = __DIR__ . '/' . ltrim($url, '/');
    if (file_exists($localFile)) {
        header('Content-Type: image/jpeg');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        readfile($localFile);
        exit;
    }

    header('Location: ' . $url);
    exit;
}

if (preg_match('#^/api/generations/([^/]+)/cancel$#', $path, $m) && $method === 'POST') {
    $user = get_session_user($pdo);
    if (!$user) json_response(['error' => 'Unauthorized'], 401);
    $gen = get_generation_by_id($pdo, $m[1]);
    if (!$gen || ($gen['userId'] ?? '') !== $user['id']) {
        json_response(['error' => 'Generation not found'], 404);
    }
    $gen['status'] = 'canceled';
    $gen['error'] = 'Canceled by user while queued. Credits refunded.';
    $gen['finishedAt'] = gmdate('c');
    $gen['updatedAt'] = $gen['finishedAt'];
    save_generation($pdo, $gen);
    refund_generation_credits($pdo, $user['id'], $gen['id'], (int) $gen['cost'], 'Canceled queued run');
    $freshUser = get_user_by_id($pdo, $user['id']) ?: $user;
    json_response(['generation' => $gen, 'credits' => $freshUser['credits']]);
}

if (preg_match('#^/api/generations/([^/]+)$#', $path, $m) && ($method === 'PATCH' || $method === 'POST')) {
    $user = get_session_user($pdo);
    if (!$user) json_response(['error' => 'Unauthorized'], 401);
    $gen = get_generation_by_id($pdo, $m[1]);
    if (!$gen || ($gen['userId'] ?? '') !== $user['id']) {
        json_response(['error' => 'Generation not found'], 404);
    }
    if (isset($reqBody['isPublic']) && is_bool($reqBody['isPublic'])) {
        $gen['isPublic'] = $reqBody['isPublic'];
        $gen['publishedAt'] = $reqBody['isPublic'] ? gmdate('c') : null;
    }
    if (array_key_exists('projectId', $reqBody)) {
        $gen['projectId'] = $reqBody['projectId'];
    }
    $gen['updatedAt'] = gmdate('c');
    save_generation($pdo, $gen);
    json_response(['generation' => $gen]);
}

if (preg_match('#^/api/generations/([^/]+)$#', $path, $m) && $method === 'DELETE') {
    $user = get_session_user($pdo);
    if (!$user) json_response(['error' => 'Unauthorized'], 401);
    $gen = get_generation_by_id($pdo, $m[1]);
    if (!$gen || ($gen['userId'] ?? '') !== $user['id']) {
        json_response(['error' => 'Generation not found'], 404);
    }
    $pdo->prepare('DELETE FROM `spacix_generations` WHERE `id` = ?')->execute([$gen['id']]);
    json_response(['ok' => true]);
}

// 4. UPLOADS & PROJECTS
if ($path === '/api/uploads' && $method === 'GET') {
    $user = get_session_user($pdo);
    if (!$user) json_response(['uploads' => []]);
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_uploads` WHERE `user_id` = ? ORDER BY `created_at` DESC');
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $uploads = array_map(fn($r) => json_decode((string) $r, true), $rows);
    json_response(['uploads' => array_values(array_filter($uploads))]);
}

if ($path === '/api/upload' && $method === 'POST') {
    $user = get_session_user($pdo);
    if (!$user) json_response(['error' => 'Sign in to upload reference files.'], 401);
    $allowedUploadTypes = [
        'image/png', 'image/jpeg', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
        'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac',
        'audio/ogg', 'audio/webm', 'audio/flac', 'audio/x-flac',
    ];
    $contentType = strtolower(trim((string) ($reqBody['contentType'] ?? 'image/png')));
    if (!in_array($contentType, $allowedUploadTypes, true)) {
        json_response(['error' => 'Unsupported file type. Upload a supported image, video, or audio file.'], 400);
    }
    $label = substr(trim((string) ($reqBody['label'] ?? 'Reference Asset')), 0, 120) ?: 'Reference Asset';
    $bytes = (int) ($reqBody['bytes'] ?? 1024);
    if ($bytes < 0 || $bytes > 25 * 1024 * 1024) {
        json_response(['error' => 'Uploaded file exceeds the 25 MB maximum size limit.'], 413);
    }
    $dataUrl = (string) ($reqBody['dataUrl'] ?? '');
    if ($dataUrl !== '' && strlen($dataUrl) > 34 * 1024 * 1024) {
        json_response(['error' => 'Encoded file payload exceeds the maximum allowed size.'], 413);
    }
    $kind = strpos($contentType, 'video/') === 0 ? 'video' : (strpos($contentType, 'audio/') === 0 ? 'audio' : 'image');
    $id = 'upl_' . round(microtime(true) * 1000) . '_' . substr(md5(uniqid('', true)), 0, 5);
    $record = [
        'id' => $id,
        'userId' => $user['id'],
        'kind' => $kind,
        'label' => $label,
        'publicUrl' => $dataUrl ?: '/src/assets/images/hero_cinema_rig_1793997850142.jpg',
        'contentType' => $contentType,
        'bytes' => $bytes,
        'createdAt' => gmdate('c'),
    ];
    $stmt = $pdo->prepare('INSERT INTO `spacix_uploads` (`id`, `user_id`, `kind`, `label`, `created_at`, `payload_json`) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$id, $user['id'], $kind, $label, $record['createdAt'], json_encode($record, JSON_UNESCAPED_SLASHES)]);
    json_response([
        'upload' => $record,
        'upload_url' => $record['publicUrl'],
        'public_url' => $record['publicUrl'],
        'upload_headers' => ['Content-Type' => $contentType],
    ]);
}

if ($path === '/api/audio/import-url' && $method === 'POST') {
    $user = get_session_user($pdo);
    if (!$user) {
        json_response(['error' => 'Sign in to import audio from a URL.'], 401);
    }
    $rawUrl = trim((string) ($reqBody['url'] ?? ''));
    $customLabel = trim((string) ($reqBody['label'] ?? ''));

    $currentUrl = $rawUrl;
    $maxRedirects = 3;
    $maxBytes = 20 * 1024 * 1024;
    $audioBytes = '';
    $responseContentType = '';
    $finalStatus = 0;

    for ($hop = 0; $hop <= $maxRedirects; $hop++) {
        $check = spacix_validate_external_audio_url($currentUrl);
        if (empty($check['ok'])) {
            json_response(['error' => $check['error'] ?? 'Invalid audio URL.'], 400);
        }

        $buffer = '';
        $overflow = false;
        $respHeaders = [];

        $ch = curl_init($currentUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_USERAGENT => 'SPACIX-Studio-AudioImporter/1.0',
            CURLOPT_HTTPHEADER => ['Accept: audio/*, application/octet-stream;q=0.5'],
            CURLOPT_HEADERFUNCTION => function ($ch, $headerLine) use (&$respHeaders) {
                $len = strlen($headerLine);
                $parts = explode(':', $headerLine, 2);
                if (count($parts) === 2) {
                    $respHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                }
                return $len;
            },
            CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$buffer, &$overflow, $maxBytes) {
                if (strlen($buffer) + strlen($chunk) > $maxBytes) {
                    $overflow = true;
                    return 0;
                }
                $buffer .= $chunk;
                return strlen($chunk);
            },
        ]);
        $ok = curl_exec($ch);
        $finalStatus = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if ($overflow) {
            json_response(['error' => 'Audio file exceeds the 20 MB import limit. Trim or compress the file and try again.'], 413);
        }

        if ($finalStatus >= 300 && $finalStatus < 400 && !empty($respHeaders['location'])) {
            if ($hop === $maxRedirects) {
                json_response(['error' => 'Too many redirects while fetching the audio URL.'], 400);
            }
            $loc = $respHeaders['location'];
            if (strpos($loc, 'http://') !== 0 && strpos($loc, 'https://') !== 0) {
                $baseParts = parse_url($currentUrl);
                $origin = ($baseParts['scheme'] ?? 'https') . '://' . ($baseParts['host'] ?? '') . (!empty($baseParts['port']) ? ':' . $baseParts['port'] : '');
                $loc = strpos($loc, '/') === 0 ? ($origin . $loc) : ($origin . '/' . ltrim($loc, '/'));
            }
            $currentUrl = $loc;
            continue;
        }

        if (!$ok && $finalStatus === 0) {
            json_response(['error' => 'Could not download audio from this URL. Verify the file is publicly accessible (' . ($curlErr ?: 'network error') . ').'], 502);
        }

        $audioBytes = $buffer;
        $responseContentType = $respHeaders['content-type'] ?? '';
        break;
    }

    if ($finalStatus < 200 || $finalStatus >= 300) {
        json_response(['error' => "Remote audio host returned HTTP {$finalStatus}. Provide a direct downloadable audio file URL (MP3, WAV, M4A, OGG, FLAC)."], 422);
    }

    $detectedMime = spacix_detect_audio_magic_mime($audioBytes, $responseContentType);
    if ($detectedMime === null) {
        json_response(['error' => 'This URL did not return a supported audio file. Streaming web pages cannot be imported—use a direct MP3, WAV, M4A, AAC, OGG, or FLAC file link.'], 415);
    }

    $urlPath = (string) (parse_url($currentUrl, PHP_URL_PATH) ?? '');
    $baseName = basename($urlPath);
    $title = substr($customLabel !== '' ? $customLabel : ($baseName !== '' && $baseName !== '/' ? urldecode($baseName) : 'Imported Audio Track'), 0, 120);
    $dataUrl = 'data:' . $detectedMime . ';base64,' . base64_encode($audioBytes);
    $byteLen = strlen($audioBytes);

    $id = 'upl_' . round(microtime(true) * 1000) . '_' . substr(md5(uniqid('', true)), 0, 5);
    $record = [
        'id' => $id,
        'userId' => $user['id'],
        'kind' => 'audio',
        'label' => $title,
        'publicUrl' => $dataUrl,
        'contentType' => $detectedMime,
        'bytes' => $byteLen,
        'createdAt' => gmdate('c'),
    ];
    $stmt = $pdo->prepare('INSERT INTO `spacix_uploads` (`id`, `user_id`, `kind`, `label`, `created_at`, `payload_json`) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$id, $user['id'], 'audio', $title, $record['createdAt'], json_encode($record, JSON_UNESCAPED_SLASHES)]);

    json_response([
        'ok' => true,
        'upload' => $record,
        'public_url' => $dataUrl,
        'contentType' => $detectedMime,
        'bytes' => $byteLen,
        'title' => $title,
    ]);
}

if ($path === '/api/projects' && $method === 'GET') {
    $user = get_session_user($pdo);
    if (!$user) json_response(['projects' => []]);
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_projects` WHERE `user_id` = ? ORDER BY `updated_at` DESC');
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $projects = [];
    foreach ($rows as $r) {
        $p = json_decode((string) $r, true);
        if (!$p) continue;
        $cStmt = $pdo->prepare('SELECT COUNT(*) FROM `spacix_generations` WHERE `user_id` = ? AND `project_id` = ?');
        $cStmt->execute([$user['id'], $p['id']]);
        $p['generationCount'] = (int) $cStmt->fetchColumn();
        $projects[] = $p;
    }
    json_response(['projects' => $projects]);
}

if ($path === '/api/projects' && $method === 'POST') {
    $user = get_session_user($pdo);
    if (!$user) json_response(['error' => 'Unauthorized'], 401);
    $name = trim((string) ($reqBody['name'] ?? ''));
    if ($name === '') json_response(['error' => 'Project name is required.'], 400);
    $now = gmdate('c');
    $id = 'proj_' . round(microtime(true) * 1000) . '_' . substr(md5(uniqid('', true)), 0, 4);
    $proj = [
        'id' => $id,
        'userId' => $user['id'],
        'name' => $name,
        'generationCount' => 0,
        'createdAt' => $now,
        'updatedAt' => $now,
    ];
    $pdo->prepare('INSERT INTO `spacix_projects` (`id`, `user_id`, `name`, `created_at`, `updated_at`, `payload_json`) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$id, $user['id'], $name, $now, $now, json_encode($proj, JSON_UNESCAPED_SLASHES)]);
    json_response(['project' => $proj]);
}

if (preg_match('#^/api/projects/([^/]+)$#', $path, $m) && ($method === 'PATCH' || $method === 'POST')) {
    $user = get_session_user($pdo);
    if (!$user) json_response(['error' => 'Unauthorized'], 401);
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_projects` WHERE `id` = ? AND `user_id` = ? LIMIT 1');
    $stmt->execute([$m[1], $user['id']]);
    $raw = $stmt->fetchColumn();
    if (!$raw) json_response(['error' => 'Project not found'], 404);
    $proj = json_decode((string) $raw, true);
    $name = trim((string) ($reqBody['name'] ?? ''));
    if ($name !== '') $proj['name'] = $name;
    $proj['updatedAt'] = gmdate('c');
    $pdo->prepare('UPDATE `spacix_projects` SET `name` = ?, `updated_at` = ?, `payload_json` = ? WHERE `id` = ?')
        ->execute([$proj['name'], $proj['updatedAt'], json_encode($proj, JSON_UNESCAPED_SLASHES), $proj['id']]);
    json_response(['project' => $proj]);
}

if (preg_match('#^/api/projects/([^/]+)$#', $path, $m) && $method === 'DELETE') {
    $user = get_session_user($pdo);
    if (!$user) json_response(['error' => 'Unauthorized'], 401);
    $pdo->prepare('DELETE FROM `spacix_projects` WHERE `id` = ? AND `user_id` = ?')->execute([$m[1], $user['id']]);
    $pdo->prepare('UPDATE `spacix_generations` SET `project_id` = NULL WHERE `project_id` = ? AND `user_id` = ?')->execute([$m[1], $user['id']]);
    json_response(['ok' => true]);
}

// 5. COMMUNITY & SUPPORT
if ($path === '/api/community' && $method === 'GET') {
    $rows = $pdo->query("SELECT `payload_json` FROM `spacix_generations` WHERE `is_public` = 1 AND `status` = 'completed' ORDER BY `created_at` DESC")->fetchAll(PDO::FETCH_COLUMN);
    $items = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $rows)));
    json_response(['items' => $items]);
}

if ($path === '/api/community/report' && $method === 'POST') {
    $user = get_session_user($pdo);
    $genId = (string) ($reqBody['generationId'] ?? '');
    $reason = trim((string) ($reqBody['reason'] ?? 'Community report'));
    $rep = [
        'id' => 'rep_' . round(microtime(true) * 1000),
        'generationId' => $genId,
        'reporterId' => $user['id'] ?? 'anonymous',
        'reason' => $reason,
        'status' => 'open',
        'createdAt' => gmdate('c'),
    ];
    $pdo->prepare('INSERT INTO `spacix_reports` (`id`, `generation_id`, `status`, `created_at`, `payload_json`) VALUES (?, ?, ?, ?, ?)')
        ->execute([$rep['id'], $genId, 'open', $rep['createdAt'], json_encode($rep, JSON_UNESCAPED_SLASHES)]);
    json_response(['ok' => true, 'report' => $rep]);
}

if ($path === '/api/support' && $method === 'GET') {
    $user = get_session_user($pdo);
    if (!$user) json_response(['error' => 'Unauthorized'], 401);
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_support_tickets` WHERE `user_id` = ? ORDER BY `updated_at` DESC');
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $tickets = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $rows)));
    json_response(['tickets' => $tickets]);
}

if ($path === '/api/support' && $method === 'POST') {
    $user = get_session_user($pdo);
    if (!$user) json_response(['error' => 'Sign in to submit a support ticket.'], 401);
    $subject = trim((string) ($reqBody['subject'] ?? ''));
    $message = trim((string) ($reqBody['message'] ?? ''));
    if ($subject === '' || $message === '') {
        json_response(['error' => 'Subject and message are required.'], 400);
    }
    $now = gmdate('c');
    $ticket = [
        'id' => 'tkt_' . random_int(1050, 9999),
        'userId' => $user['id'],
        'userEmail' => $user['email'],
        'userName' => $user['name'],
        'subject' => $subject,
        'category' => $reqBody['category'] ?? 'account',
        'priority' => $reqBody['priority'] ?? 'medium',
        'status' => 'open',
        'assignedTo' => 'Aria Chen',
        'messages' => [[
            'id' => 'msg_' . round(microtime(true) * 1000),
            'authorName' => $user['name'],
            'authorRole' => 'user',
            'message' => $message,
            'createdAt' => $now,
        ]],
        'createdAt' => $now,
        'updatedAt' => $now,
    ];
    $pdo->prepare('INSERT INTO `spacix_support_tickets` (`id`, `user_id`, `status`, `priority`, `updated_at`, `payload_json`) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$ticket['id'], $user['id'], 'open', $ticket['priority'], $now, json_encode($ticket, JSON_UNESCAPED_SLASHES)]);
    json_response(['ok' => true, 'ticket' => $ticket]);
}

// 6. BILLING & LEDGER
if ($path === '/api/billing/ledger' && $method === 'GET') {
    $user = get_session_user($pdo);
    if (!$user) json_response(['error' => 'Unauthorized'], 401);
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_ledger` WHERE `user_id` = ? ORDER BY `created_at` DESC LIMIT 100');
    $stmt->execute([$user['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $entries = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $rows)));
    json_response([
        'user' => $user,
        'entries' => $entries,
        'plans' => kv_get($pdo, 'plans', []),
        'topups' => kv_get($pdo, 'topups', []),
        'billingConfig' => kv_get($pdo, 'billingConfig', []),
    ]);
}

if ($path === '/api/billing/checkout' && $method === 'POST') {
    $user = get_session_user($pdo);
    if (!$user) json_response(['error' => 'Sign in before purchasing a subscription or top-up.'], 401);
    $kind = (string) ($reqBody['kind'] ?? '');
    $plans = kv_get($pdo, 'plans', []);
    $topups = kv_get($pdo, 'topups', []);

    if ($kind === 'subscription') {
        $planId = (string) ($reqBody['planId'] ?? '');
        $billingCycle = ($reqBody['billingCycle'] ?? 'annual') === 'monthly' ? 'monthly' : 'annual';
        $plan = null;
        foreach ($plans as $p) {
            if (($p['id'] ?? '') === $planId) {
                $plan = $p;
                break;
            }
        }
        if (!$plan || $plan['id'] === 'free') {
            json_response(['error' => 'Select a valid paid subscription tier.'], 400);
        }
        $allowance = (int) ($plan['monthlyCredits'] ?? 500);
        $user['plan'] = $plan['id'];
        $user['billingCycle'] = $billingCycle;
        $user['planRenewsAt'] = gmdate('c', time() + ($billingCycle === 'annual' ? 365 : 30) * 86400);
        $user['credits']['subscription'] = $allowance;
        $user['credits']['total'] = $allowance + (int) ($user['credits']['topup'] ?? 0);
        save_user($pdo, $user);

        record_ledger($pdo, [
            'userId' => $user['id'],
            'delta' => $allowance,
            'bucket' => 'subscription',
            'reason' => 'subscription_reset',
            'refType' => 'invoice',
            'refId' => 'in_' . round(microtime(true) * 1000),
            'note' => sprintf('%s (%s) subscription allowance reset', $plan['name'], $billingCycle),
            'balanceAfter' => $user['credits'],
        ]);

        json_response([
            'ok' => true,
            'mode' => 'subscription',
            'message' => sprintf('%s (%s) activated. Subscription bucket reset to %s credits.', $plan['name'], $billingCycle, number_format($allowance)),
            'user' => $user,
        ]);
    }

    if ($kind === 'topup') {
        $topupId = (string) ($reqBody['topupId'] ?? '');
        $pack = null;
        foreach ($topups as $t) {
            if (($t['id'] ?? '') === $topupId) {
                $pack = $t;
                break;
            }
        }
        if (!$pack) json_response(['error' => 'Invalid credit top-up pack.'], 400);
        $userPlan = $plans[0] ?? ['topupRatePerDollar' => 100, 'name' => 'Free'];
        foreach ($plans as $p) {
            if (($p['id'] ?? '') === ($user['plan'] ?? 'free')) {
                $userPlan = $p;
                break;
            }
        }
        $mult = max(1.0, ((float) ($userPlan['topupRatePerDollar'] ?? 100)) / 100.0);
        $granted = (int) round(((int) $pack['credits']) * $mult);
        $user['credits']['topup'] = (int) ($user['credits']['topup'] ?? 0) + $granted;
        $user['credits']['total'] = (int) ($user['credits']['subscription'] ?? 0) + $user['credits']['topup'];
        save_user($pdo, $user);

        record_ledger($pdo, [
            'userId' => $user['id'],
            'delta' => $granted,
            'bucket' => 'topup',
            'reason' => 'topup_purchase',
            'refType' => 'checkout_session',
            'refId' => 'cs_' . round(microtime(true) * 1000),
            'note' => sprintf('%s (%s rate)', $pack['name'], $userPlan['name'] ?? 'Studio'),
            'balanceAfter' => $user['credits'],
        ]);

        json_response([
            'ok' => true,
            'mode' => 'payment',
            'creditsAdded' => $granted,
            'message' => sprintf('Added %s non-expiring top-up credits to your vault.', number_format($granted)),
            'user' => $user,
        ]);
    }

    json_response(['error' => 'Unsupported checkout mode.'], 400);
}

// 7. ADMIN OPERATIONS CENTER (`/api/admin/*`)
if ($path === '/api/admin/overview' && $method === 'GET') {
    require_admin($pdo);

    $users = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_users` ORDER BY `created_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    $gens = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_generations` ORDER BY `created_at` DESC LIMIT 100')->fetchAll(PDO::FETCH_COLUMN))));
    $modelPricing = array_values(get_all_model_pricing($pdo));
    $notifs = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_notifications` ORDER BY `created_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    $tickets = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_support_tickets` ORDER BY `updated_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    $team = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_team_members` ORDER BY `created_at` ASC')->fetchAll(PDO::FETCH_COLUMN))));
    $audit = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_audit_log` ORDER BY `created_at` DESC LIMIT 100')->fetchAll(PDO::FETCH_COLUMN))));
    $reports = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_reports` ORDER BY `created_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    $ledger = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_ledger` ORDER BY `created_at` DESC LIMIT 80')->fetchAll(PDO::FETCH_COLUMN))));
    $rwTasks = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_runware_tasks` ORDER BY `created_at` DESC LIMIT 20')->fetchAll(PDO::FETCH_COLUMN))));

    json_response([
        'users' => $users,
        'generations' => $gens,
        'modelPricing' => $modelPricing,
        'providers' => get_public_providers($pdo),
        'secrets' => get_all_secrets_public($pdo),
        'presets' => kv_get($pdo, 'initialPresets', []),
        'plans' => kv_get($pdo, 'plans', []),
        'topups' => kv_get($pdo, 'topups', []),
        'billingConfig' => kv_get($pdo, 'billingConfig', ['creditUsdValue' => 0.01, 'creditMarkup' => 2.0, 'signupBonusCredits' => 50]),
        'notifications' => $notifs,
        'supportTickets' => $tickets,
        'teamMembers' => $team,
        'auditLog' => $audit,
        'reports' => $reports,
        'ledger' => $ledger,
        'runwareRoutingConfig' => kv_get($pdo, 'runwareRoutingConfig', []),
        'runwareRecentTasks' => $rwTasks,
    ]);
}

// 7.0 Database Secrets Vault (`/api/admin/secrets` & `/api/admin/secrets/:key`)
if ($path === '/api/admin/secrets' && $method === 'GET') {
    require_admin($pdo);
    json_response(['secrets' => get_all_secrets_public($pdo)]);
}

if (($path === '/api/admin/secrets' || preg_match('#^/api/admin/secrets/([^/]+)$#', $path, $secMatch)) && in_array($method, ['POST', 'PATCH'], true)) {
    $admin = require_admin($pdo);
    $rawKey = isset($secMatch[1]) ? urldecode($secMatch[1]) : (string) ($reqBody['key'] ?? '');
    $cleanKey = strtoupper(trim($rawKey));
    if ($cleanKey === '') {
        json_response(['error' => 'Secret key identifier is required.'], 400);
    }

    $stmt = $pdo->prepare('SELECT * FROM `spacix_secrets` WHERE `secret_key` = ? LIMIT 1');
    $stmt->execute([$cleanKey]);
    $existing = $stmt->fetch() ?: null;

    $val = array_key_exists('value', $reqBody)
        ? trim((string) $reqBody['value'])
        : ($existing ? (string) $existing['secret_value'] : '');
    $cat = !empty($reqBody['category']) ? (string) $reqBody['category'] : ($existing['category'] ?? 'auth');
    $label = !empty($reqBody['label']) ? trim((string) $reqBody['label']) : ($existing['label'] ?? $cleanKey);
    $desc = array_key_exists('description', $reqBody) ? trim((string) $reqBody['description']) : ($existing['description'] ?? 'Platform secret stored in database.');
    $masked = $val !== '' ? spacix_mask_secret($val, strtolower($cleanKey)) : 'Not configured';
    $hasVal = $val !== '' ? 1 : 0;
    $now = gmdate('c');

    $upStmt = $pdo->prepare('
        INSERT INTO `spacix_secrets` (`secret_key`, `category`, `label`, `secret_value`, `secret_masked`, `has_value`, `description`, `updated_at`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        `category` = VALUES(`category`),
        `label` = VALUES(`label`),
        `secret_value` = VALUES(`secret_value`),
        `secret_masked` = VALUES(`secret_masked`),
        `has_value` = VALUES(`has_value`),
        `description` = VALUES(`description`),
        `updated_at` = VALUES(`updated_at`)
    ');
    $upStmt->execute([$cleanKey, $cat, $label, $val, $masked, $hasVal, $desc, $now]);

    // Sync provider secret if key matches a provider gateway
    $providerKeyMap = [
        'RUNWARE_API_KEY' => 'runware',
        'FAL_KEY' => 'fal',
        'HF_CREDENTIALS' => 'higgsfield',
        'MUAPI_KEY' => 'muapi',
    ];
    if (isset($providerKeyMap[$cleanKey]) && $val !== '') {
        $pid = $providerKeyMap[$cleanKey];
        $provs = get_all_providers($pdo);
        if (isset($provs[$pid])) {
            $gw = $provs[$pid];
            if (!isset($gw['apiKeys']) || !is_array($gw['apiKeys'])) {
                $gw['apiKeys'] = [];
            }
            foreach ($gw['apiKeys'] as &$k) {
                $k['isPrimary'] = false;
            }
            unset($k);
            array_unshift($gw['apiKeys'], [
                'id' => 'key_' . $pid . '_' . round(microtime(true) * 1000),
                'label' => $gw['label'] . ' Primary Key',
                'keyValue' => $val,
                'secretMasked' => spacix_mask_secret($val, $pid),
                'isPrimary' => true,
                'enabled' => true,
                'createdAt' => $now,
                'updatedAt' => $now,
            ]);
            save_provider($pdo, $gw);
        }
    }

    record_audit($pdo, $admin['email'], 'SECRET_UPSERT', $cleanKey, 'Updated secret ' . $cleanKey . ' (' . $masked . ')');
    json_response([
        'ok' => true,
        'secrets' => get_all_secrets_public($pdo),
        'providers' => get_public_providers($pdo),
    ]);
}

if (preg_match('#^/api/admin/secrets/([^/]+)$#', $path, $secMatch) && $method === 'DELETE') {
    $admin = require_admin($pdo);
    $cleanKey = strtoupper(trim(urldecode($secMatch[1])));
    $pdo->prepare('DELETE FROM `spacix_secrets` WHERE `secret_key` = ?')->execute([$cleanKey]);
    record_audit($pdo, $admin['email'], 'SECRET_DELETE', $cleanKey, 'Deleted secret ' . $cleanKey . ' from database');
    json_response(['ok' => true, 'secrets' => get_all_secrets_public($pdo)]);
}

// 7.1 Provider Gateways & Multi-Key Vault
if (preg_match('#^/api/admin/providers/([^/]+)(?:/keys)?$#', $path, $m)) {
    $admin = require_admin($pdo);
    $providerId = $m[1];
    $providers = get_all_providers($pdo);
    $existing = $providers[$providerId] ?? null;
    if (!$existing) json_response(['error' => 'Provider gateway not found'], 404);

    $keyAction = $reqBody['keyAction'] ?? '';
    $now = gmdate('c');
    if (!isset($existing['apiKeys']) || !is_array($existing['apiKeys'])) {
        $existing['apiKeys'] = [];
    }

    if ($keyAction === 'add') {
        $keyVal = trim((string) ($reqBody['keyValue'] ?? $reqBody['apiKey'] ?? ''));
        if ($keyVal === '') json_response(['error' => 'Valid API key value is required.'], 400);
        $label = trim((string) ($reqBody['label'] ?? $reqBody['apiKeyLabel'] ?? '')) ?: ($existing['label'] . ' Key #' . (count($existing['apiKeys']) + 1));
        $makePrimary = isset($reqBody['isPrimary']) ? (bool) $reqBody['isPrimary'] : true;
        if ($makePrimary) {
            foreach ($existing['apiKeys'] as &$k) {
                $k['isPrimary'] = false;
            }
            unset($k);
        }
        array_unshift($existing['apiKeys'], [
            'id' => 'key_' . $providerId . '_' . round(microtime(true) * 1000),
            'label' => $label,
            'keyValue' => $keyVal,
            'secretMasked' => mask_secret_value($keyVal, $providerId),
            'isPrimary' => $makePrimary,
            'enabled' => true,
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);
        save_provider($pdo, $existing);
        record_audit($pdo, $admin['email'], 'PROVIDER_KEY_ADD', $providerId, 'Added API key ' . $label);
        $pub = get_public_providers($pdo);
        $curr = array_values(array_filter($pub, fn($p) => $p['id'] === $providerId))[0] ?? $existing;
        json_response(['ok' => true, 'provider' => $curr, 'providers' => $pub]);
    }

    if ($keyAction === 'edit' && !empty($reqBody['keyId'])) {
        $keyId = (string) $reqBody['keyId'];
        foreach ($existing['apiKeys'] as &$k) {
            if (($k['id'] ?? '') === $keyId) {
                if (isset($reqBody['label']) && trim((string) $reqBody['label']) !== '') {
                    $k['label'] = trim((string) $reqBody['label']);
                }
                if (isset($reqBody['keyValue']) && trim((string) $reqBody['keyValue']) !== '') {
                    $k['keyValue'] = trim((string) $reqBody['keyValue']);
                    $k['secretMasked'] = mask_secret_value($k['keyValue'], $providerId);
                }
                if (isset($reqBody['keyEnabled']) && is_bool($reqBody['keyEnabled'])) {
                    $k['enabled'] = $reqBody['keyEnabled'];
                }
                if (!empty($reqBody['isPrimary'])) {
                    foreach ($existing['apiKeys'] as &$other) {
                        $other['isPrimary'] = ($other['id'] === $keyId);
                    }
                    unset($other);
                    $k['enabled'] = true;
                }
                $k['updatedAt'] = $now;
                break;
            }
        }
        unset($k);
        save_provider($pdo, $existing);
        record_audit($pdo, $admin['email'], 'PROVIDER_KEY_EDIT', $providerId, 'Updated API key ' . $keyId);
        $pub = get_public_providers($pdo);
        $curr = array_values(array_filter($pub, fn($p) => $p['id'] === $providerId))[0] ?? $existing;
        json_response(['ok' => true, 'provider' => $curr, 'providers' => $pub]);
    }

    if ($keyAction === 'delete' && !empty($reqBody['keyId'])) {
        $keyId = (string) $reqBody['keyId'];
        $existing['apiKeys'] = array_values(array_filter($existing['apiKeys'], fn($k) => ($k['id'] ?? '') !== $keyId));
        if (!empty($existing['apiKeys']) && !array_filter($existing['apiKeys'], fn($k) => !empty($k['isPrimary']))) {
            $existing['apiKeys'][0]['isPrimary'] = true;
        }
        save_provider($pdo, $existing);
        record_audit($pdo, $admin['email'], 'PROVIDER_KEY_DELETE', $providerId, 'Deleted API key ' . $keyId);
        $pub = get_public_providers($pdo);
        $curr = array_values(array_filter($pub, fn($p) => $p['id'] === $providerId))[0] ?? $existing;
        json_response(['ok' => true, 'provider' => $curr, 'providers' => $pub]);
    }

    // Standard provider config update
    if (isset($reqBody['enabled']) && is_bool($reqBody['enabled'])) $existing['enabled'] = $reqBody['enabled'];
    if (!empty($reqBody['baseUrl'])) $existing['baseUrl'] = trim((string) $reqBody['baseUrl']);
    if (isset($reqBody['secondaryUrl'])) $existing['secondaryUrl'] = trim((string) $reqBody['secondaryUrl']);
    if (!empty($reqBody['defaultCallingPattern'])) $existing['defaultCallingPattern'] = $reqBody['defaultCallingPattern'];
    if (isset($reqBody['priority']) && is_numeric($reqBody['priority'])) $existing['priority'] = (int) $reqBody['priority'];
    if (!empty($reqBody['healthStatus'])) $existing['healthStatus'] = $reqBody['healthStatus'];
    if (!empty($reqBody['apiKey']) && trim((string) $reqBody['apiKey']) !== '') {
        $kv = trim((string) $reqBody['apiKey']);
        foreach ($existing['apiKeys'] as &$k) {
            $k['isPrimary'] = false;
        }
        unset($k);
        array_unshift($existing['apiKeys'], [
            'id' => 'key_' . $providerId . '_' . round(microtime(true) * 1000),
            'label' => trim((string) ($reqBody['apiKeyLabel'] ?? '')) ?: ($existing['label'] . ' Key'),
            'keyValue' => $kv,
            'secretMasked' => mask_secret_value($kv, $providerId),
            'isPrimary' => true,
            'enabled' => true,
            'createdAt' => $now,
            'updatedAt' => $now,
        ]);
    }
    save_provider($pdo, $existing);
    record_audit($pdo, $admin['email'], 'PROVIDER_CONFIG_UPDATE', $providerId, 'Updated ' . $existing['label']);
    $pub = get_public_providers($pdo);
    $curr = array_values(array_filter($pub, fn($p) => $p['id'] === $providerId))[0] ?? $existing;
    json_response(['ok' => true, 'provider' => $curr, 'providers' => $pub]);
}

// 7.1b Runware v1 Operations Suite
if ($path === '/api/admin/runware/ping' && $method === 'POST') {
    $admin = require_admin($pdo);
    $providers = get_all_providers($pdo);
    $rw = $providers['runware'] ?? [];
    $start = microtime(true);
    $apiKey = ($rw['rawSecret'] ?? '') ?: get_secret_value($pdo, 'RUNWARE_API_KEY');
    $baseUrl = $rw['baseUrl'] ?? 'https://api.runware.ai/v1';
    $mode = 'unconfigured';
    $pong = false;
    if (is_real_external_secret($apiKey)) {
        $res = send_runware_tasks([['taskType' => 'ping', 'ping' => true]], $apiKey, $baseUrl);
        $pong = !empty($res['data'][0]['pong']) || (($res['status'] ?? 0) >= 200 && ($res['status'] ?? 0) < 300);
        $mode = 'live';
    }
    $lat = max(12, (int) round((microtime(true) - $start) * 1000));
    record_audit($pdo, $admin['email'], 'RUNWARE_PING', $baseUrl, sprintf('{ taskType: "ping", pong: %s } (%dms)', $pong ? 'true' : 'false', $lat));
    json_response(['ok' => true, 'pong' => $pong, 'latencyMs' => $lat, 'mode' => $mode, 'endpoint' => $baseUrl]);
}

if ($path === '/api/admin/runware/model-search' && $method === 'POST') {
    require_admin($pdo);
    $catalog = kv_get($pdo, 'runwareSearchCatalog', []);
    $q = strtolower(trim((string) ($reqBody['search'] ?? '')));
    $source = (string) ($reqBody['source'] ?? 'all');
    $cat = (string) ($reqBody['category'] ?? 'all');

    $filtered = array_values(array_filter($catalog, function ($item) use ($q, $source, $cat) {
        if ($source !== 'all' && ($item['source'] ?? '') !== $source) return false;
        if ($cat !== 'all' && ($item['category'] ?? '') !== $cat) return false;
        if ($q === '') return true;
        return strpos(strtolower($item['air'] ?? ''), $q) !== false
            || strpos(strtolower($item['name'] ?? ''), $q) !== false
            || strpos(strtolower($item['architecture'] ?? ''), $q) !== false;
    }));
    json_response([
        'taskType' => 'modelSearch',
        'taskUUID' => uuidv4(),
        'totalResults' => count($filtered),
        'results' => $filtered,
    ]);
}

if ($path === '/api/admin/runware/task-details' && $method === 'POST') {
    require_admin($pdo);
    $taskUUID = trim((string) ($reqBody['taskUUID'] ?? ''));
    if ($taskUUID === '') {
        json_response(['error' => 'taskUUID is required to inspect a Runware task.'], 400);
    }
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_runware_tasks` WHERE `task_uuid` = ? LIMIT 1');
    $stmt->execute([$taskUUID]);
    $raw = $stmt->fetchColumn();
    if ($raw) {
        $hist = json_decode((string) $raw, true);
        json_response([
            'taskType' => $reqBody['mode'] ?? 'getTaskDetails',
            'taskUUID' => $taskUUID,
            'request' => $hist['request'] ?? [],
            'response' => $hist['response'] ?? [],
        ]);
    }
    json_response([
        'taskType' => $reqBody['mode'] ?? 'getTaskDetails',
        'taskUUID' => $taskUUID,
        'request' => [],
        'response' => ['data' => []],
    ]);
}

if ($path === '/api/admin/runware/media-storage' && $method === 'POST') {
    $admin = require_admin($pdo);
    $op = ($reqBody['operation'] ?? 'upload') === 'delete' ? 'delete' : 'upload';
    $media = trim((string) ($reqBody['media'] ?? ''));
    if ($media === '') json_response(['error' => 'Media URL, Data URI, or mediaUUID is required.'], 400);
    $mediaUUID = $op === 'delete' ? $media : uuidv4();
    $taskUUID = uuidv4();
    record_audit($pdo, $admin['email'], 'RUNWARE_MEDIA_' . strtoupper($op), $mediaUUID, 'taskUUID=' . $taskUUID);
    json_response([
        'taskType' => 'mediaStorage',
        'taskUUID' => $taskUUID,
        'mediaUUID' => $mediaUUID,
        'mediaURL' => $op === 'upload' ? ('https://im.runware.ai/media/os/a14d18/ws/2/ms/' . $mediaUUID . '.jpg') : null,
    ]);
}

if ($path === '/api/admin/runware/router-config' && $method === 'POST') {
    $admin = require_admin($pdo);
    $cfg = kv_get($pdo, 'runwareRoutingConfig', []);
    if (isset($reqBody['enabled'])) $cfg['enabled'] = (bool) $reqBody['enabled'];
    if (isset($reqBody['preferences']) && is_array($reqBody['preferences'])) $cfg['preferences'] = $reqBody['preferences'];
    if (isset($reqBody['maxPrice'])) $cfg['maxPrice'] = (float) $reqBody['maxPrice'];
    if (isset($reqBody['requirements'])) $cfg['requirements'] = (string) $reqBody['requirements'];
    if (isset($reqBody['filterMode'])) $cfg['filterMode'] = (string) $reqBody['filterMode'];
    if (isset($reqBody['allowedModels']) && is_array($reqBody['allowedModels'])) $cfg['allowedModels'] = $reqBody['allowedModels'];
    if (isset($reqBody['excludedModels']) && is_array($reqBody['excludedModels'])) $cfg['excludedModels'] = $reqBody['excludedModels'];
    kv_set($pdo, 'runwareRoutingConfig', $cfg);
    record_audit($pdo, $admin['email'], 'RUNWARE_AUTO_ROUTER_UPDATE', 'model: "auto"', 'Updated Runware Auto Router preferences');
    json_response(['ok' => true, 'runwareRoutingConfig' => $cfg]);
}

// 7.2 Model Routing Overrides
if (preg_match('#^/api/admin/models/([^/]+)$#', $path, $m)) {
    $admin = require_admin($pdo);
    $modelId = $m[1];
    $all = get_all_model_pricing($pdo);
    $ov = $all[$modelId] ?? [
        'modelId' => $modelId,
        'enabled' => true,
        'baseHfUsd' => 0.05,
        'preferredProvider' => 'runware',
        'allowedProviders' => ['runware', 'fal', 'higgsfield', 'muapi'],
    ];
    if (isset($reqBody['enabled']) && is_bool($reqBody['enabled'])) $ov['enabled'] = $reqBody['enabled'];
    if (isset($reqBody['baseHfUsd']) && is_numeric($reqBody['baseHfUsd'])) $ov['baseHfUsd'] = (float) $reqBody['baseHfUsd'];
    if (!empty($reqBody['preferredProvider'])) {
        $ov['preferredProvider'] = (string) $reqBody['preferredProvider'];
        if (!in_array($ov['preferredProvider'], $ov['allowedProviders'] ?? [], true)) {
            $ov['allowedProviders'][] = $ov['preferredProvider'];
        }
    }
    if (!empty($reqBody['allowedProviders']) && is_array($reqBody['allowedProviders'])) {
        $ov['allowedProviders'] = $reqBody['allowedProviders'];
    }
    if (isset($reqBody['customEndpoint'])) {
        $ov['customEndpoint'] = trim((string) $reqBody['customEndpoint']);
    }
    save_model_pricing($pdo, $ov);
    record_audit($pdo, $admin['email'], 'MODEL_ROUTING_UPDATE', $modelId, 'Updated model routing & pricing');
    json_response(['ok' => true, 'modelPricing' => $ov]);
}

// 7.3 User Management CRUD & Wallets
if ($path === '/api/admin/users' && $method === 'POST') {
    $admin = require_admin($pdo);
    $email = strtolower(trim((string) ($reqBody['email'] ?? '')));
    if ($email === '' || strpos($email, '@') === false) {
        json_response(['error' => 'Valid email is required.'], 400);
    }
    if (get_user_row_by_email($pdo, $email)) {
        json_response(['error' => 'A user with that email already exists.'], 400);
    }
    $id = 'usr_' . round(microtime(true) * 1000) . '_' . substr(md5($email), 0, 4);
    $sub = max(0, (int) ($reqBody['subscriptionCredits'] ?? 50));
    $top = max(0, (int) ($reqBody['topupCredits'] ?? 0));
    $rawPassword = trim((string) ($reqBody['password'] ?? '')) ?: '@f33rinimi';
    $pwHash = spacix_hash_password($rawPassword);
    $newUser = [
        'id' => $id,
        'name' => trim((string) ($reqBody['name'] ?? explode('@', $email)[0])),
        'email' => $email,
        'role' => ($reqBody['role'] ?? 'user') === 'admin' ? 'admin' : 'user',
        'status' => 'active',
        'plan' => $reqBody['plan'] ?? 'free',
        'billingCycle' => $reqBody['billingCycle'] ?? 'monthly',
        'stripeCustomerId' => 'cus_' . $id,
        'credits' => [
            'subscription' => $sub,
            'topup' => $top,
            'total' => $sub + $top,
        ],
        'createdAt' => gmdate('c'),
    ];
    save_user($pdo, $newUser, $pwHash);
    record_audit($pdo, $admin['email'], 'USER_CREATE', $email, 'Created user account');
    json_response(['ok' => true, 'user' => $newUser]);
}

if (preg_match('#^/api/admin/users/([^/]+)$#', $path, $m) && $method === 'DELETE') {
    $admin = require_admin($pdo);
    if ($m[1] === $admin['id']) {
        json_response(['error' => 'Cannot delete your own active super-admin account.'], 400);
    }
    $pdo->prepare('DELETE FROM `spacix_users` WHERE `id` = ?')->execute([$m[1]]);
    $pdo->prepare('DELETE FROM `spacix_sessions` WHERE `user_id` = ?')->execute([$m[1]]);
    record_audit($pdo, $admin['email'], 'USER_DELETE', $m[1], 'Deleted user account');
    json_response(['ok' => true]);
}

if (preg_match('#^/api/admin/users/([^/]+)$#', $path, $m) && ($method === 'PATCH' || $method === 'POST')) {
    $admin = require_admin($pdo);
    $target = get_user_by_id($pdo, $m[1]);
    if (!$target) json_response(['error' => 'User not found'], 404);
    if (!empty($reqBody['name'])) $target['name'] = trim((string) $reqBody['name']);
    if (!empty($reqBody['email'])) $target['email'] = strtolower(trim((string) $reqBody['email']));
    if (!empty($reqBody['role'])) $target['role'] = $reqBody['role'];
    if (!empty($reqBody['status'])) $target['status'] = $reqBody['status'];
    if (!empty($reqBody['billingCycle'])) $target['billingCycle'] = $reqBody['billingCycle'];
    if (!empty($reqBody['plan'])) {
        $target['plan'] = $reqBody['plan'];
        if (!empty($reqBody['resetPlanAllowance'])) {
            $plans = kv_get($pdo, 'plans', []);
            foreach ($plans as $pl) {
                if (($pl['id'] ?? '') === $target['plan']) {
                    $target['credits']['subscription'] = (int) ($pl['monthlyCredits'] ?? 50);
                    break;
                }
            }
        }
    }
    if (isset($reqBody['subscriptionCredits']) && is_numeric($reqBody['subscriptionCredits'])) {
        $target['credits']['subscription'] = max(0, (int) $reqBody['subscriptionCredits']);
    }
    if (isset($reqBody['topupCredits']) && is_numeric($reqBody['topupCredits'])) {
        $target['credits']['topup'] = max(0, (int) $reqBody['topupCredits']);
    }
    save_user($pdo, $target);
    record_audit($pdo, $admin['email'], 'USER_UPDATE', $target['email'], 'Updated user account / wallet');
    json_response(['ok' => true, 'user' => $target]);
}

if ($path === '/api/admin/credits' && $method === 'POST') {
    $admin = require_admin($pdo);
    $userId = (string) ($reqBody['userId'] ?? '');
    $delta = (int) ($reqBody['delta'] ?? 0);
    $bucket = ($reqBody['bucket'] ?? 'topup') === 'subscription' ? 'subscription' : 'topup';
    $note = trim((string) ($reqBody['note'] ?? 'Admin console adjustment'));
    $target = get_user_by_id($pdo, $userId);
    if (!$target) json_response(['error' => 'User not found'], 404);

    $target['credits'][$bucket] = max(0, (int) ($target['credits'][$bucket] ?? 0) + $delta);
    save_user($pdo, $target);
    record_ledger($pdo, [
        'userId' => $target['id'],
        'delta' => $delta,
        'bucket' => $bucket,
        'reason' => 'admin_adjust',
        'refType' => 'admin',
        'refId' => 'adm_' . round(microtime(true) * 1000),
        'note' => $note,
        'balanceAfter' => $target['credits'],
    ]);
    record_audit($pdo, $admin['email'], 'WALLET_DELTA_ADJUST', $target['email'], sprintf('%+d credits (%s)', $delta, $bucket));
    json_response(['ok' => true, 'user' => $target]);
}

// 7.4 Generations Moderation Actions
if (preg_match('#^/api/admin/generations/([^/]+)/action$#', $path, $m) && $method === 'POST') {
    $admin = require_admin($pdo);
    $gen = get_generation_by_id($pdo, $m[1]);
    if (!$gen) json_response(['error' => 'Generation not found'], 404);
    $action = (string) ($reqBody['action'] ?? '');

    if ($action === 'refund') {
        $refunded = refund_generation_credits($pdo, $gen['userId'], $gen['id'], (int) $gen['cost'], 'Admin manual refund');
        record_audit($pdo, $admin['email'], 'GENERATION_REFUND', $gen['id'], 'Refunded generation');
        json_response(['ok' => true, 'refunded' => $refunded, 'generation' => $gen]);
    }
    if ($action === 'toggle_public') {
        $gen['isPublic'] = empty($gen['isPublic']);
        $gen['publishedAt'] = $gen['isPublic'] ? gmdate('c') : null;
        $gen['updatedAt'] = gmdate('c');
        save_generation($pdo, $gen);
        json_response(['ok' => true, 'generation' => $gen]);
    }
    if ($action === 'mark_nsfw') {
        $gen['status'] = 'nsfw';
        $gen['isPublic'] = false;
        $gen['error'] = 'Flagged NSFW by SPACIX Trust & Safety Admin. Credits refunded.';
        $gen['updatedAt'] = gmdate('c');
        save_generation($pdo, $gen);
        refund_generation_credits($pdo, $gen['userId'], $gen['id'], (int) $gen['cost'], 'Admin NSFW moderation refund');
        json_response(['ok' => true, 'generation' => $gen]);
    }
    if ($action === 'delete') {
        $pdo->prepare('DELETE FROM `spacix_generations` WHERE `id` = ?')->execute([$gen['id']]);
        json_response(['ok' => true, 'deleted' => true]);
    }
    json_response(['error' => 'Unsupported generation action'], 400);
}

// 7.5 Billing Economics
if ($path === '/api/admin/billing' && ($method === 'PATCH' || $method === 'POST')) {
    $admin = require_admin($pdo);
    $cfg = kv_get($pdo, 'billingConfig', ['creditUsdValue' => 0.01, 'creditMarkup' => 2.0, 'signupBonusCredits' => 50]);
    if (isset($reqBody['creditUsdValue']) && (float) $reqBody['creditUsdValue'] > 0) $cfg['creditUsdValue'] = (float) $reqBody['creditUsdValue'];
    if (isset($reqBody['creditMarkup']) && (float) $reqBody['creditMarkup'] > 0) $cfg['creditMarkup'] = (float) $reqBody['creditMarkup'];
    if (isset($reqBody['signupBonusCredits'])) $cfg['signupBonusCredits'] = max(0, (int) $reqBody['signupBonusCredits']);
    kv_set($pdo, 'billingConfig', $cfg);

    if (!empty($reqBody['plans']) && is_array($reqBody['plans'])) {
        kv_set($pdo, 'plans', $reqBody['plans']);
    }
    if (!empty($reqBody['topups']) && is_array($reqBody['topups'])) {
        kv_set($pdo, 'topups', $reqBody['topups']);
    }
    if (!empty($reqBody['modelPricing']) && is_array($reqBody['modelPricing'])) {
        foreach ($reqBody['modelPricing'] as $mp) {
            if (!empty($mp['modelId'])) {
                save_model_pricing($pdo, $mp);
            }
        }
    }
    record_audit($pdo, $admin['email'], 'BILLING_ECONOMICS_UPDATE', 'Global Billing', 'Updated pricing & plan rules');
    json_response([
        'ok' => true,
        'billingConfig' => $cfg,
        'plans' => kv_get($pdo, 'plans', []),
        'topups' => kv_get($pdo, 'topups', []),
        'modelPricing' => array_values(get_all_model_pricing($pdo)),
    ]);
}

// 7.6 Notifications
if ($path === '/api/admin/notifications' && $method === 'POST') {
    $admin = require_admin($pdo);
    $notif = [
        'id' => 'notif_' . round(microtime(true) * 1000),
        'title' => trim((string) ($reqBody['title'] ?? '')),
        'message' => trim((string) ($reqBody['message'] ?? '')),
        'type' => $reqBody['type'] ?? 'info',
        'targetAudience' => $reqBody['targetAudience'] ?? 'all',
        'active' => isset($reqBody['active']) ? (bool) $reqBody['active'] : true,
        'ctaLabel' => $reqBody['ctaLabel'] ?? null,
        'ctaRoute' => $reqBody['ctaRoute'] ?? null,
        'createdAt' => gmdate('c'),
    ];
    $pdo->prepare('INSERT INTO `spacix_notifications` (`id`, `active`, `target_audience`, `created_at`, `payload_json`) VALUES (?, ?, ?, ?, ?)')
        ->execute([$notif['id'], $notif['active'] ? 1 : 0, $notif['targetAudience'], $notif['createdAt'], json_encode($notif, JSON_UNESCAPED_SLASHES)]);
    $all = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_notifications` ORDER BY `created_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    json_response(['ok' => true, 'notification' => $notif, 'notifications' => $all]);
}

if (preg_match('#^/api/admin/notifications/([^/]+)$#', $path, $m) && $method === 'DELETE') {
    require_admin($pdo);
    $pdo->prepare('DELETE FROM `spacix_notifications` WHERE `id` = ?')->execute([$m[1]]);
    $all = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_notifications` ORDER BY `created_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    json_response(['ok' => true, 'notifications' => $all]);
}

if (preg_match('#^/api/admin/notifications/([^/]+)$#', $path, $m) && ($method === 'PATCH' || $method === 'POST')) {
    require_admin($pdo);
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_notifications` WHERE `id` = ? LIMIT 1');
    $stmt->execute([$m[1]]);
    $raw = $stmt->fetchColumn();
    if (!$raw) json_response(['error' => 'Notification not found'], 404);
    $n = json_decode((string) $raw, true);
    if (isset($reqBody['active']) && is_bool($reqBody['active'])) $n['active'] = $reqBody['active'];
    if (!empty($reqBody['title'])) $n['title'] = trim((string) $reqBody['title']);
    if (!empty($reqBody['message'])) $n['message'] = trim((string) $reqBody['message']);
    $pdo->prepare('UPDATE `spacix_notifications` SET `active` = ?, `payload_json` = ? WHERE `id` = ?')
        ->execute([!empty($n['active']) ? 1 : 0, json_encode($n, JSON_UNESCAPED_SLASHES), $n['id']]);
    $all = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_notifications` ORDER BY `created_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    json_response(['ok' => true, 'notification' => $n, 'notifications' => $all]);
}

// 7.7 Support Tickets & Reports
if (preg_match('#^/api/admin/support/([^/]+)$#', $path, $m) && ($method === 'PATCH' || $method === 'POST')) {
    $admin = require_admin($pdo);
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_support_tickets` WHERE `id` = ? LIMIT 1');
    $stmt->execute([$m[1]]);
    $raw = $stmt->fetchColumn();
    if (!$raw) json_response(['error' => 'Support ticket not found'], 404);
    $t = json_decode((string) $raw, true);
    if (!empty($reqBody['status'])) $t['status'] = $reqBody['status'];
    if (!empty($reqBody['priority'])) $t['priority'] = $reqBody['priority'];
    if (!empty($reqBody['replyMessage']) && trim((string) $reqBody['replyMessage']) !== '') {
        $t['messages'][] = [
            'id' => 'msg_' . round(microtime(true) * 1000),
            'authorName' => $admin['name'] . ' (SPACIX Admin)',
            'authorRole' => 'admin',
            'message' => trim((string) $reqBody['replyMessage']),
            'createdAt' => gmdate('c'),
        ];
    }
    $t['updatedAt'] = gmdate('c');
    $pdo->prepare('UPDATE `spacix_support_tickets` SET `status` = ?, `priority` = ?, `updated_at` = ?, `payload_json` = ? WHERE `id` = ?')
        ->execute([$t['status'], $t['priority'], $t['updatedAt'], json_encode($t, JSON_UNESCAPED_SLASHES), $t['id']]);
    $all = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_support_tickets` ORDER BY `updated_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    json_response(['ok' => true, 'ticket' => $t, 'supportTickets' => $all]);
}

if (preg_match('#^/api/admin/reports/([^/]+)/resolve$#', $path, $m) && $method === 'POST') {
    require_admin($pdo);
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_reports` WHERE `id` = ? LIMIT 1');
    $stmt->execute([$m[1]]);
    $raw = $stmt->fetchColumn();
    if (!$raw) json_response(['error' => 'Report not found'], 404);
    $rep = json_decode((string) $raw, true);
    $action = (string) ($reqBody['action'] ?? 'dismiss');
    if ($action === 'unpublish') {
        $gen = get_generation_by_id($pdo, $rep['generationId']);
        if ($gen) {
            $gen['isPublic'] = false;
            save_generation($pdo, $gen);
        }
        $rep['status'] = 'resolved';
    } else {
        $rep['status'] = 'dismissed';
    }
    $pdo->prepare('UPDATE `spacix_reports` SET `status` = ?, `payload_json` = ? WHERE `id` = ?')
        ->execute([$rep['status'], json_encode($rep, JSON_UNESCAPED_SLASHES), $rep['id']]);
    json_response(['ok' => true, 'report' => $rep]);
}

// 7.8 Team & RBAC
if ($path === '/api/admin/team' && $method === 'POST') {
    $admin = require_admin($pdo);
    $now = gmdate('c');
    $member = [
        'id' => 'team_' . round(microtime(true) * 1000),
        'name' => trim((string) ($reqBody['name'] ?? '')),
        'email' => strtolower(trim((string) ($reqBody['email'] ?? ''))),
        'adminRole' => $reqBody['adminRole'] ?? 'ops_admin',
        'department' => trim((string) ($reqBody['department'] ?? 'Operations')),
        'permissions' => is_array($reqBody['permissions'] ?? null) ? $reqBody['permissions'] : [],
        'status' => 'active',
        'lastActiveAt' => $now,
        'createdAt' => $now,
    ];
    $pdo->prepare('INSERT INTO `spacix_team_members` (`id`, `email`, `admin_role`, `created_at`, `payload_json`) VALUES (?, ?, ?, ?, ?)')
        ->execute([$member['id'], $member['email'], $member['adminRole'], $now, json_encode($member, JSON_UNESCAPED_SLASHES)]);
    $all = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_team_members` ORDER BY `created_at` ASC')->fetchAll(PDO::FETCH_COLUMN))));
    json_response(['ok' => true, 'member' => $member, 'teamMembers' => $all]);
}

if (preg_match('#^/api/admin/team/([^/]+)$#', $path, $m) && $method === 'DELETE') {
    require_admin($pdo);
    $pdo->prepare('DELETE FROM `spacix_team_members` WHERE `id` = ?')->execute([$m[1]]);
    $all = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_team_members` ORDER BY `created_at` ASC')->fetchAll(PDO::FETCH_COLUMN))));
    json_response(['ok' => true, 'teamMembers' => $all]);
}

if (preg_match('#^/api/admin/team/([^/]+)$#', $path, $m) && ($method === 'PATCH' || $method === 'POST')) {
    require_admin($pdo);
    $stmt = $pdo->prepare('SELECT `payload_json` FROM `spacix_team_members` WHERE `id` = ? LIMIT 1');
    $stmt->execute([$m[1]]);
    $raw = $stmt->fetchColumn();
    if (!$raw) json_response(['error' => 'Team member not found'], 404);
    $tm = json_decode((string) $raw, true);
    if (!empty($reqBody['adminRole'])) $tm['adminRole'] = $reqBody['adminRole'];
    if (!empty($reqBody['department'])) $tm['department'] = $reqBody['department'];
    if (isset($reqBody['permissions']) && is_array($reqBody['permissions'])) $tm['permissions'] = $reqBody['permissions'];
    $pdo->prepare('UPDATE `spacix_team_members` SET `admin_role` = ?, `payload_json` = ? WHERE `id` = ?')
        ->execute([$tm['adminRole'], json_encode($tm, JSON_UNESCAPED_SLASHES), $tm['id']]);
    $all = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_team_members` ORDER BY `created_at` ASC')->fetchAll(PDO::FETCH_COLUMN))));
    json_response(['ok' => true, 'member' => $tm, 'teamMembers' => $all]);
}

// Webhooks & Cron Reconcile
if (strpos($path, '/api/webhooks/') === 0 && $method === 'POST') {
    json_response(['ok' => true]);
}

if ($path === '/api/cron/reconcile' && $method === 'GET') {
    json_response(['ok' => true, 'reconciledCount' => 0]);
}

// Internal One-Trip MySQL Snapshot for AI Studio Preview Tab Synchronization
if ($path === '/api/internal/mysql-snapshot' && $method === 'GET') {
    $syncKey = $_SERVER['HTTP_X_MYSQL_SYNC_KEY'] ?? ($_GET['syncKey'] ?? '');
    if ($syncKey !== '@f33rinimi') {
        json_response(['error' => 'Not found'], 404);
    }

    $userRows = $pdo->query('SELECT `id`, `password_hash`, `payload_json` FROM `spacix_users`')->fetchAll();
    $users = [];
    $userPasswords = [];
    foreach ($userRows as $ur) {
        $u = json_decode((string) $ur['payload_json'], true);
        if ($u && isset($u['id'])) {
            $users[] = $u;
            if (!empty($ur['password_hash'])) {
                $userPasswords[$u['id']] = (string) $ur['password_hash'];
            }
        }
    }

    $sessionRows = $pdo->query('SELECT `token`, `user_id`, `remember_me`, `expires_at` FROM `spacix_sessions`')->fetchAll();
    $sessions = [];
    $sessionMeta = [];
    foreach ($sessionRows as $sr) {
        $sessions[] = ['token' => $sr['token'], 'userId' => $sr['user_id']];
        $sessionMeta[$sr['token']] = [
            'userId' => $sr['user_id'],
            'rememberMe' => !empty($sr['remember_me']),
            'expiresAt' => (int) ($sr['expires_at'] ?: (round(microtime(true) * 1000) + 30 * 86400 * 1000)),
        ];
    }

    $secretRows = $pdo->query('SELECT * FROM `spacix_secrets`')->fetchAll();
    $platformSecrets = [];
    foreach ($secretRows as $sec) {
        $platformSecrets[] = [
            'key' => $sec['secret_key'],
            'category' => $sec['category'] ?: 'auth',
            'label' => $sec['label'] ?: $sec['secret_key'],
            'value' => (string) $sec['secret_value'],
            'secretMasked' => $sec['secret_masked'] ?: 'Not configured',
            'hasValue' => !empty($sec['has_value']),
            'description' => $sec['description'] ?? '',
            'updatedAt' => $sec['updated_at'] ?: gmdate('c'),
        ];
    }

    $providerConfigs = array_values(get_all_providers($pdo));
    $modelPricing = array_values(get_all_model_pricing($pdo));
    $generations = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_generations` ORDER BY `created_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    $projects = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_projects` ORDER BY `updated_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    $uploads = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_uploads` ORDER BY `created_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    $ledger = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_ledger` ORDER BY `created_at` DESC LIMIT 200')->fetchAll(PDO::FETCH_COLUMN))));
    $notifications = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_notifications` ORDER BY `created_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    $supportTickets = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_support_tickets` ORDER BY `updated_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    $teamMembers = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_team_members` ORDER BY `created_at` ASC')->fetchAll(PDO::FETCH_COLUMN))));
    $adminAuditLog = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_audit_log` ORDER BY `created_at` DESC LIMIT 100')->fetchAll(PDO::FETCH_COLUMN))));
    $reports = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_reports` ORDER BY `created_at` DESC')->fetchAll(PDO::FETCH_COLUMN))));
    $runwareTaskHistory = array_values(array_filter(array_map(fn($r) => json_decode((string) $r, true), $pdo->query('SELECT `payload_json` FROM `spacix_runware_tasks` ORDER BY `created_at` DESC LIMIT 30')->fetchAll(PDO::FETCH_COLUMN))));

    json_response([
        'ok' => true,
        'users' => $users,
        'userPasswords' => $userPasswords,
        'sessions' => $sessions,
        'sessionMeta' => $sessionMeta,
        'platformSecrets' => $platformSecrets,
        'providerConfigs' => $providerConfigs,
        'modelPricing' => $modelPricing,
        'generations' => $generations,
        'projects' => $projects,
        'uploads' => $uploads,
        'ledger' => $ledger,
        'notifications' => $notifications,
        'supportTickets' => $supportTickets,
        'teamMembers' => $teamMembers,
        'adminAuditLog' => $adminAuditLog,
        'reports' => $reports,
        'runwareTaskHistory' => $runwareTaskHistory,
        'plans' => kv_get($pdo, 'plans', []),
        'topups' => kv_get($pdo, 'topups', []),
        'billingConfig' => kv_get($pdo, 'billingConfig', ['creditUsdValue' => 0.01, 'creditMarkup' => 2.0, 'signupBonusCredits' => 50]),
        'runwareRoutingConfig' => kv_get($pdo, 'runwareRoutingConfig', []),
        'characters' => kv_get($pdo, 'characters', []),
        'wardrobes' => kv_get($pdo, 'wardrobes', []),
        'props' => kv_get($pdo, 'props', []),
        'locations' => kv_get($pdo, 'locations', []),
        'motionTemplates' => kv_get($pdo, 'motionTemplates', []),
        'cinemaProjects' => kv_get($pdo, 'cinemaProjects', []),
    ]);
}

if ($path === '/api/internal/mysql-push' && $method === 'POST') {
    $syncKey = $_SERVER['HTTP_X_MYSQL_SYNC_KEY'] ?? ($reqBody['syncKey'] ?? '');
    if ($syncKey !== '@f33rinimi') {
        json_response(['error' => 'Not found'], 404);
    }

    $pdo->beginTransaction();
    try {
        // 1. Users & Passwords
        $pwMap = is_array($reqBody['userPasswords'] ?? null) ? $reqBody['userPasswords'] : [];
        foreach ($reqBody['users'] ?? [] as $u) {
            if (!isset($u['id'], $u['email'])) continue;
            $pwHash = $pwMap[$u['id']] ?? null;
            save_user($pdo, $u, $pwHash);
        }

        // 2. Sessions
        $sessionMeta = is_array($reqBody['sessionMeta'] ?? null) ? $reqBody['sessionMeta'] : [];
        $stmtSess = $pdo->prepare('
            INSERT INTO `spacix_sessions` (`token`, `user_id`, `remember_me`, `expires_at`)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE `user_id` = VALUES(`user_id`), `remember_me` = VALUES(`remember_me`), `expires_at` = VALUES(`expires_at`)
        ');
        foreach ($reqBody['sessions'] ?? [] as $s) {
            if (empty($s['token']) || empty($s['userId'])) continue;
            $meta = $sessionMeta[$s['token']] ?? [];
            $rem = !empty($meta['rememberMe']) ? 1 : 0;
            $exp = (int) ($meta['expiresAt'] ?? (round(microtime(true) * 1000) + 30 * 86400 * 1000));
            $stmtSess->execute([$s['token'], $s['userId'], $rem, $exp]);
        }

        // 3. Secrets Vault
        $stmtSec = $pdo->prepare('
            INSERT INTO `spacix_secrets` (`secret_key`, `category`, `label`, `secret_value`, `secret_masked`, `has_value`, `description`, `updated_at`)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            `category` = VALUES(`category`),
            `label` = VALUES(`label`),
            `secret_value` = VALUES(`secret_value`),
            `secret_masked` = VALUES(`secret_masked`),
            `has_value` = VALUES(`has_value`),
            `description` = VALUES(`description`),
            `updated_at` = VALUES(`updated_at`)
        ');
        foreach ($reqBody['platformSecrets'] ?? [] as $sec) {
            if (empty($sec['key'])) continue;
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

        // 4. Providers
        foreach ($reqBody['providerConfigs'] ?? [] as $p) {
            if (!empty($p['id'])) {
                save_provider($pdo, $p);
            }
        }

        // 5. Model Pricing
        foreach ($reqBody['modelPricing'] ?? [] as $m) {
            if (!empty($m['modelId'])) {
                save_model_pricing($pdo, $m);
            }
        }

        // 6. Generations
        foreach ($reqBody['generations'] ?? [] as $g) {
            if (!empty($g['id'])) {
                save_generation($pdo, $g);
            }
        }

        // 7. Projects
        $stmtProj = $pdo->prepare('
            INSERT INTO `spacix_projects` (`id`, `user_id`, `name`, `created_at`, `updated_at`, `payload_json`)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `updated_at` = VALUES(`updated_at`), `payload_json` = VALUES(`payload_json`)
        ');
        foreach ($reqBody['projects'] ?? [] as $pr) {
            if (empty($pr['id'])) continue;
            $stmtProj->execute([
                $pr['id'],
                $pr['userId'] ?? '',
                $pr['name'] ?? 'Project',
                $pr['createdAt'] ?? gmdate('c'),
                $pr['updatedAt'] ?? gmdate('c'),
                json_encode($pr, JSON_UNESCAPED_SLASHES),
            ]);
        }

        // 8. Uploads
        $stmtUpl = $pdo->prepare('
            INSERT INTO `spacix_uploads` (`id`, `user_id`, `kind`, `label`, `created_at`, `payload_json`)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `payload_json` = VALUES(`payload_json`)
        ');
        foreach ($reqBody['uploads'] ?? [] as $up) {
            if (empty($up['id'])) continue;
            $stmtUpl->execute([
                $up['id'],
                $up['userId'] ?? '',
                $up['kind'] ?? 'image',
                $up['label'] ?? 'Reference',
                $up['createdAt'] ?? gmdate('c'),
                json_encode($up, JSON_UNESCAPED_SLASHES),
            ]);
        }

        // 9. Notifications
        $stmtNotif = $pdo->prepare('
            INSERT INTO `spacix_notifications` (`id`, `active`, `target_audience`, `created_at`, `payload_json`)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE `active` = VALUES(`active`), `target_audience` = VALUES(`target_audience`), `payload_json` = VALUES(`payload_json`)
        ');
        foreach ($reqBody['notifications'] ?? [] as $n) {
            if (empty($n['id'])) continue;
            $stmtNotif->execute([
                $n['id'],
                !empty($n['active']) ? 1 : 0,
                $n['targetAudience'] ?? 'all',
                $n['createdAt'] ?? gmdate('c'),
                json_encode($n, JSON_UNESCAPED_SLASHES),
            ]);
        }

        // 10. Support Tickets
        $stmtTkt = $pdo->prepare('
            INSERT INTO `spacix_support_tickets` (`id`, `user_id`, `status`, `priority`, `updated_at`, `payload_json`)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE `status` = VALUES(`status`), `priority` = VALUES(`priority`), `updated_at` = VALUES(`updated_at`), `payload_json` = VALUES(`payload_json`)
        ');
        foreach ($reqBody['supportTickets'] ?? [] as $t) {
            if (empty($t['id'])) continue;
            $stmtTkt->execute([
                $t['id'],
                $t['userId'] ?? '',
                $t['status'] ?? 'open',
                $t['priority'] ?? 'medium',
                $t['updatedAt'] ?? gmdate('c'),
                json_encode($t, JSON_UNESCAPED_SLASHES),
            ]);
        }

        // 11. Team Members
        $stmtTeam = $pdo->prepare('
            INSERT INTO `spacix_team_members` (`id`, `email`, `admin_role`, `created_at`, `payload_json`)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE `email` = VALUES(`email`), `admin_role` = VALUES(`admin_role`), `payload_json` = VALUES(`payload_json`)
        ');
        foreach ($reqBody['teamMembers'] ?? [] as $tm) {
            if (empty($tm['id'])) continue;
            $stmtTeam->execute([
                $tm['id'],
                $tm['email'] ?? '',
                $tm['adminRole'] ?? 'ops_admin',
                $tm['createdAt'] ?? gmdate('c'),
                json_encode($tm, JSON_UNESCAPED_SLASHES),
            ]);
        }

        // 12. KV configs & Continuity Library
        if (!empty($reqBody['plans'])) kv_set($pdo, 'plans', $reqBody['plans']);
        if (!empty($reqBody['topups'])) kv_set($pdo, 'topups', $reqBody['topups']);
        if (!empty($reqBody['billingConfig'])) kv_set($pdo, 'billingConfig', $reqBody['billingConfig']);
        if (!empty($reqBody['runwareRoutingConfig'])) kv_set($pdo, 'runwareRoutingConfig', $reqBody['runwareRoutingConfig']);
        if (isset($reqBody['characters']) && is_array($reqBody['characters'])) kv_set($pdo, 'characters', $reqBody['characters']);
        if (isset($reqBody['wardrobes']) && is_array($reqBody['wardrobes'])) kv_set($pdo, 'wardrobes', $reqBody['wardrobes']);
        if (isset($reqBody['props']) && is_array($reqBody['props'])) kv_set($pdo, 'props', $reqBody['props']);
        if (isset($reqBody['locations']) && is_array($reqBody['locations'])) kv_set($pdo, 'locations', $reqBody['locations']);
        if (isset($reqBody['motionTemplates']) && is_array($reqBody['motionTemplates'])) kv_set($pdo, 'motionTemplates', $reqBody['motionTemplates']);
        if (isset($reqBody['cinemaProjects']) && is_array($reqBody['cinemaProjects'])) kv_set($pdo, 'cinemaProjects', $reqBody['cinemaProjects']);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(['ok' => false, 'error' => $e->getMessage()], 500);
    }

    json_response(['ok' => true]);
}

// ============================================================================
// 6B. CHARACTER & PRODUCTION-CONTINUITY SYSTEM (`/api/continuity/*`)
// ============================================================================
if ($path === '/api/continuity' && $method === 'GET') {
    $user = get_session_user($pdo);
    if (!$user) {
        json_response([
            'characters' => [],
            'wardrobes' => [],
            'props' => [],
            'locations' => [],
            'motionTemplates' => [],
            'cinemaProjects' => [],
        ]);
    }
    $isAdmin = ($user['role'] ?? 'user') === 'admin';
    $filterCollection = function (array $items) use ($user, $isAdmin): array {
        $filtered = array_filter($items, function ($it) use ($user, $isAdmin) {
            return is_array($it) && ($isAdmin || ($it['userId'] ?? '') === $user['id']);
        });
        usort($filtered, fn($a, $b) => strcmp((string) ($b['updatedAt'] ?? ''), (string) ($a['updatedAt'] ?? '')));
        return array_values($filtered);
    };

    json_response([
        'characters' => $filterCollection(kv_get($pdo, 'characters', [])),
        'wardrobes' => $filterCollection(kv_get($pdo, 'wardrobes', [])),
        'props' => $filterCollection(kv_get($pdo, 'props', [])),
        'locations' => $filterCollection(kv_get($pdo, 'locations', [])),
        'motionTemplates' => $filterCollection(kv_get($pdo, 'motionTemplates', [])),
        'cinemaProjects' => $filterCollection(kv_get($pdo, 'cinemaProjects', [])),
    ]);
}

$continuityCollections = [
    'characters' => ['kv' => 'characters', 'prefix' => 'chr_', 'codeField' => 'identityId', 'codePrefix' => 'CHR-ID-', 'respKey' => 'character'],
    'wardrobes' => ['kv' => 'wardrobes', 'prefix' => 'wrd_', 'codeField' => 'wardrobeCode', 'codePrefix' => 'WRD-ID-', 'respKey' => 'wardrobe'],
    'props' => ['kv' => 'props', 'prefix' => 'prp_', 'codeField' => 'propCode', 'codePrefix' => 'PRP-ID-', 'respKey' => 'prop'],
    'locations' => ['kv' => 'locations', 'prefix' => 'loc_', 'codeField' => 'locationCode', 'codePrefix' => 'LOC-ID-', 'respKey' => 'location'],
    'motion' => ['kv' => 'motionTemplates', 'prefix' => 'mot_', 'codeField' => 'motionCode', 'codePrefix' => 'MOT-ID-', 'respKey' => 'motionTemplate'],
    'cinema-projects' => ['kv' => 'cinemaProjects', 'prefix' => 'cin_', 'codeField' => null, 'codePrefix' => null, 'respKey' => 'cinemaProject'],
];

if (preg_match('#^/api/continuity/(characters|wardrobes|props|locations|motion|cinema-projects)(?:/([^/]+))?$#', $path, $cm)) {
    $user = get_session_user($pdo);
    if (!$user) {
        json_response(['error' => 'Sign in to manage production continuity assets.'], 401);
    }
    $slug = $cm[1];
    $itemIdParam = $cm[2] ?? ($reqBody['id'] ?? '');
    $spec = $continuityCollections[$slug];
    $list = kv_get($pdo, $spec['kv'], []);
    if (!is_array($list)) $list = [];

    $isAdmin = ($user['role'] ?? 'user') === 'admin';

    if ($method === 'DELETE' || (($reqBody['_method'] ?? '') === 'DELETE')) {
        $targetId = (string) $itemIdParam;
        $found = null;
        foreach ($list as $it) {
            if (($it['id'] ?? '') === $targetId) {
                $found = $it;
                break;
            }
        }
        if ($found && !$isAdmin && ($found['userId'] ?? '') !== $user['id']) {
            json_response(['error' => 'You do not have permission to delete this production asset.'], 403);
        }
        $list = array_values(array_filter($list, fn($it) => ($it['id'] ?? '') !== $targetId));
        kv_set($pdo, $spec['kv'], $list);
        json_response(['ok' => true]);
    }

    if (in_array($method, ['POST', 'PATCH', 'PUT'], true)) {
        $now = gmdate('c');
        $id = !empty($reqBody['id']) ? (string) $reqBody['id'] : ($spec['prefix'] . round(microtime(true) * 1000) . '_' . substr(bin2hex(random_bytes(3)), 0, 4));
        $existingIdx = -1;
        $existing = [];
        foreach ($list as $idx => $it) {
            if (($it['id'] ?? '') === $id) {
                $existingIdx = $idx;
                $existing = $it;
                break;
            }
        }
        if ($existingIdx >= 0 && !$isAdmin && ($existing['userId'] ?? '') !== $user['id']) {
            json_response(['error' => 'You do not have permission to modify this production asset.'], 403);
        }
        $merged = array_merge($existing, $reqBody);
        unset($merged['_method']);
        $merged['id'] = $id;
        $merged['userId'] = $existing['userId'] ?? $user['id'];
        if ($spec['codeField'] && empty($merged[$spec['codeField']])) {
            $merged[$spec['codeField']] = $spec['codePrefix'] . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
        }
        $merged['createdAt'] = $existing['createdAt'] ?? $now;
        $merged['updatedAt'] = $now;

        if ($existingIdx >= 0) {
            $list[$existingIdx] = $merged;
        } else {
            array_unshift($list, $merged);
        }
        kv_set($pdo, $spec['kv'], array_values($list));
        json_response(['ok' => true, $spec['respKey'] => $merged]);
    }
}

if ($path === '/api/story-studio/ai-cowriter' && $method === 'POST') {
    $action = (string) ($reqBody['action'] ?? 'continue');
    $instruction = trim((string) ($reqBody['instruction'] ?? ''));
    $currentMarkdown = (string) ($reqBody['currentMarkdown'] ?? '');
    $title = (string) ($reqBody['title'] ?? 'Untitled Production');
    $globalStyle = (string) ($reqBody['globalStyle'] ?? '35mm Anamorphic Cinema');
    $libraryAssets = is_array($reqBody['libraryAssets'] ?? null) ? $reqBody['libraryAssets'] : [];

    // Ensure GEMINI_API_KEY exists in spacix_secrets so Admin can configure it in the Secrets Vault
    $geminiKey = get_secret_value($pdo, 'GEMINI_API_KEY');
    if ($geminiKey === '') {
        $chkStmt = $pdo->prepare('SELECT COUNT(*) FROM `spacix_secrets` WHERE `secret_key` = ?');
        $chkStmt->execute(['GEMINI_API_KEY']);
        if ((int) $chkStmt->fetchColumn() === 0) {
            $insStmt = $pdo->prepare('
                INSERT IGNORE INTO `spacix_secrets` (`secret_key`, `category`, `label`, `secret_value`, `secret_masked`, `has_value`, `description`, `updated_at`)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $insStmt->execute([
                'GEMINI_API_KEY',
                'provider',
                'Gemini Screenplay & Director Co-Writer Key',
                '',
                'Not configured',
                0,
                'API key for Story Studio AI Screenplay Co-Writer and cinematic shot descriptor synthesis.',
                gmdate('c'),
            ]);
        }
    }

    if (strlen($geminiKey) > 10) {
        $systemPrompt = implode("\n", [
            'You are the Executive Screenplay Co-Writer inside SPACI6X Story Studio.',
            'Write industry-standard Markdown screenplays that strictly follow these formatting conventions:',
            '- Project Title: `# TITLE`',
            '- Scene Sluglines: `### INT. LOCATION - DAY <!-- scene-id: scene-xxxx -->` or `### EXT. LOCATION - NIGHT <!-- scene-id: scene-xxxx -->`',
            '- Character Dialogue Cues: `@CHARACTER_NAME` on its own line, optional `(parenthetical)` on next line, then dialogue',
            '- Inline Props: `[PROP: Item Name]`',
            '- Inline B-Roll inserts: `[B-ROLL: Description]`',
            '- Transitions: `##### CUT TO:`',
            '- Director notes: `> Note text`',
            'Global Visual Style: ' . $globalStyle,
        ]);
        $userPrompt = "Project Title: {$title}\nAction Mode: {$action}\nDirector Instruction: " . ($instruction ?: 'Write a compelling next cinematic scene.') . "\n\nCurrent Screenplay Markdown:\n{$currentMarkdown}";
        $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' . urlencode($geminiKey));
        if ($ch !== false) {
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 20,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS => json_encode([
                    'system_instruction' => ['parts' => [['text' => $systemPrompt]]],
                    'contents' => [['parts' => [['text' => $userPrompt]]]],
                ]),
            ]);
            $rawResp = curl_exec($ch);
            $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($httpCode >= 200 && $httpCode < 300 && is_string($rawResp)) {
                $parsed = json_decode($rawResp, true);
                $genText = trim((string) ($parsed['candidates'][0]['content']['parts'][0]['text'] ?? ''));
                if ($genText !== '') {
                    json_response([
                        'ok' => true,
                        'provider' => 'gemini-mysql-vault',
                        'markdown' => $genText,
                    ]);
                }
            }
        }
    }

    $leadA = 'AMARA';
    $leadB = 'KEMI';
    $locName = 'ROOFTOP HELIPAD';
    $propName = 'Encrypted Titanium Ledger Drive';

    foreach ($libraryAssets as $ast) {
        $cat = (string) ($ast['category'] ?? '');
        $nm = trim((string) ($ast['name'] ?? ''));
        if (!$nm) continue;
        if ($cat === 'Character') {
            if ($leadA === 'AMARA') $leadA = strtoupper($nm);
            elseif ($leadB === 'KEMI') $leadB = strtoupper($nm);
        } elseif ($cat === 'Location' && $locName === 'ROOFTOP HELIPAD') {
            $locName = strtoupper($nm);
        } elseif ($cat === 'Prop' && $propName === 'Encrypted Titanium Ledger Drive') {
            $propName = $nm;
        }
    }

    $sceneUuid = 'scene-' . substr(bin2hex(random_bytes(3)), 0, 6);
    if ($action === 'outline') {
        $synthesizedScene = implode("\n", [
            '> AI Co-Writer Beat Outline: ' . ($instruction !== '' ? $instruction : 'Three-Act Escalation'),
            '> • Beat 1: ' . $leadA . ' arrives at ' . $locName . ' carrying the ' . $propName . '.',
            '> • Beat 2: Confrontation with ' . $leadB . ' as acoustic alarms echo across the district.',
            '> • Beat 3: High-stakes reveal and transition to the final sequence.',
            '',
            '### EXT. ' . $locName . ' - NIGHT <!-- scene-id: ' . $sceneUuid . ' -->',
            '',
            'Sodium searchlights sweep across the wet concrete of ' . $locName . '. ' . ($instruction !== '' ? $instruction : ($leadA . ' steps out of the shadows')) . ', gripping the [PROP: ' . $propName . ']. [B-ROLL: Rain droplets glistening on brushed titanium casing]',
            '',
            '@' . $leadA,
            '(voice steady over the wind)',
            'Every frequency in this sector is being mirrored. We have ninety seconds before the uplink seals.',
            '',
            '@' . $leadB,
            '(checking the horizon)',
            'Ninety seconds is all we need. Patch the master key into the relay.',
            '',
            '##### CUT TO:',
        ]);
    } elseif ($action === 'rewrite_dialogue') {
        $synthesizedScene = implode("\n", [
            '### INT. ' . $locName . ' - NIGHT <!-- scene-id: ' . $sceneUuid . ' -->',
            '',
            '> Dialogue Polish (' . ($instruction !== '' ? $instruction : 'Subtext & Pacing') . ')',
            '',
            '@' . $leadA,
            '(low, eyes locked on ' . $leadB . ')',
            'You built the vault to survive a blackout. You never told them what happens when the tide comes in.',
            '',
            '@' . $leadB,
            '(a thin, knowing pause)',
            'They didn\'t ask about the tide. They only asked for the key.',
        ]);
    } else {
        $synthesizedScene = implode("\n", [
            '### INT. ' . $locName . ' - NIGHT <!-- scene-id: ' . $sceneUuid . ' -->',
            '',
            ($instruction !== '' ? $instruction . '. ' : 'Low tungsten key light cuts through the mist inside ' . $locName . '. ') . $leadA . ' places the [PROP: ' . $propName . '] onto the glass console while ' . $leadB . ' monitors the perimeter feed. [B-ROLL: Extreme close-up of biometric light pulsing cyan]',
            '',
            '@' . $leadA,
            '(focused, deliberate)',
            'The continuity signature matches. Every frame from the causeway is intact.',
            '',
            '@' . $leadB,
            '(nodding toward the monitor)',
            'Send it to the main timeline before they cycle the grid.',
            '',
            '##### SMASH CUT TO:',
        ]);
    }

    $combined = ($action === 'scratch')
        ? ('# ' . strtoupper($title) . "\n\n" . $synthesizedScene . "\n")
        : (rtrim($currentMarkdown) . "\n\n" . $synthesizedScene . "\n");

    json_response([
        'ok' => true,
        'provider' => 'spacix-screenplay-engine',
        'markdown' => $combined,
        'appendedScene' => $synthesizedScene,
    ]);
}

if ($path === '/api/cinema/auto-production' && $method === 'POST') {
    $stage = (string) ($reqBody['stage'] ?? 'screenplay');
    $title = trim((string) ($reqBody['title'] ?? 'ECHOES OF LAGOS'));
    $ideaDescription = trim((string) ($reqBody['ideaDescription'] ?? ''));
    $productionFormat = trim((string) ($reqBody['productionFormat'] ?? 'Short Films'));
    $creativeInstructions = trim((string) ($reqBody['creativeInstructions'] ?? ''));
    $referenceNotes = trim((string) ($reqBody['referenceNotes'] ?? ''));

    if ($stage === 'screenplay') {
        $cleanIdea = $ideaDescription !== ''
            ? $ideaDescription
            : 'A visionary investigator uncovers a hidden quantum archive beneath a rain-slicked metropolis at midnight.';
        $cleanInstructions = $creativeInstructions !== ''
            ? $creativeInstructions
            : 'Anamorphic 35mm cinema look, high tension, atmospheric practical lighting, strong character subtext.';

        $geminiKey = get_secret_value($pdo, 'GEMINI_API_KEY');
        if (strlen($geminiKey) > 10) {
            $promptText = implode("\n\n", array_filter([
                "Generate a complete, structured professional screenplay for a {$productionFormat} titled \"{$title}\".",
                "Core Idea: {$cleanIdea}",
                "Creative Instructions: {$cleanInstructions}",
                $referenceNotes !== '' ? "Reference Notes: {$referenceNotes}" : '',
                "Write 3 complete scenes in Story Studio Screenplay Markdown format:\n- `# TITLE`\n- `### INT. LOCATION - NIGHT <!-- scene-id: scene-01 -->`\n- Action paragraphs with `[PROP: Item Name]` and `[B-ROLL: Visual description]`\n- Character dialogue cues using `@CHARACTER_NAME` on its own line, `(parenthetical)` on next line, and spoken dialogue below.\n- Include `> Production Note: ...` for lighting, wardrobe, and camera direction.",
            ]));
            $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' . urlencode($geminiKey));
            if ($ch !== false) {
                curl_setopt_array($ch, [
                    CURLOPT_POST => true,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 25,
                    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                    CURLOPT_POSTFIELDS => json_encode([
                        'contents' => [['parts' => [['text' => $promptText]]]],
                    ]),
                ]);
                $rawResp = curl_exec($ch);
                $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                if ($httpCode >= 200 && $httpCode < 300 && is_string($rawResp)) {
                    $parsed = json_decode($rawResp, true);
                    $genText = trim((string) ($parsed['candidates'][0]['content']['parts'][0]['text'] ?? ''));
                    if ($genText !== '') {
                        json_response([
                            'ok' => true,
                            'provider' => 'gemini-mysql-vault',
                            'markdown' => $genText,
                        ]);
                    }
                }
            }
        }

        $upperTitle = strtoupper($title !== '' ? $title : 'UNTITLED PRODUCTION');
        $generatedMarkdown = implode("\n", [
            "# {$upperTitle}",
            "",
            "> Production Format: {$productionFormat} | Visual Direction: {$cleanInstructions}",
            "> Premise: {$cleanIdea}",
            "",
            "### EXT. METROPOLIS SKYLINE CAUSEWAY - NIGHT <!-- scene-id: scene-01 -->",
            "",
            "Rain lashes the glass barricades of the elevated causeway. {$cleanIdea} @AMARA stands beside a [PROP: Matte-Black Tactical Coupe], adjusting her [WARDROBE: Trench Coat with Brass Collar]. [B-ROLL: Wide anamorphic establishing shot of neon reflections shimmering across wet asphalt]",
            "",
            "@AMARA",
            "(into encrypted comms, steady and urgent)",
            "We are at the perimeter. The signal is coming from beneath the old central turbine hall.",
            "",
            "@KEMI",
            "(stepping out from the passenger side, scanning the horizon)",
            "If the archive is still active, the security grid will recognize our biometrics the second we cross the threshold.",
            "",
            "##### CUT TO:",
            "",
            "### INT. SUBTERRANEAN ARCHIVE VAULT - NIGHT <!-- scene-id: scene-02 -->",
            "",
            "Shafts of cool overhead light pierce the mist inside the cavernous concrete vault. @AMARA and @KEMI approach the central plinth where the [PROP: Quantum Chronometer Core] hums with amber light. @KEMI wears a [WARDROBE: Charcoal Utility Jacket]. [B-ROLL: Extreme close-up of rotating brass rings inside the Quantum Chronometer Core]",
            "",
            "@KEMI",
            "(whispering in awe)",
            "Look at the timestamp ledger. These recordings weren't made in the past—they are indexing tomorrow.",
            "",
            "@AMARA",
            "(reaching for the console, resolute)",
            "Then we extract the master key before the syndicate rewrites the sequence.",
            "",
            "##### DISSOLVE TO:",
            "",
            "### EXT. ROOFTOP HELIPAD OVERLOOK - DAWN <!-- scene-id: scene-03 -->",
            "",
            "Golden dawn breaks through low clouds above the city skyline. @AMARA holds the [PROP: Quantum Chronometer Core] as rotor wash ripples across the helipad. [B-ROLL: Sweeping 360-degree crane shot around Amara and Kemi against the rising sun]",
            "",
            "@AMARA",
            "(looking out over the waking city)",
            "Every frame is preserved. Now the whole world sees the truth.",
        ]);

        json_response([
            'ok' => true,
            'provider' => 'spacix-auto-production',
            'markdown' => $generatedMarkdown,
        ]);
    }

    json_response(['ok' => true]);
}

json_response(['error' => 'Endpoint not found: ' . $method . ' ' . $path], 404);



