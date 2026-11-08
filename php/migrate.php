<?php
/**
 * SPACIX Studio — cPanel MySQL Database Migration & Verification Endpoint
 * Creates all relational tables in `aixdqvdz_spacix` and migrates all data from `seed_data.json`.
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

try {
    $pdo = spacix_get_pdo();
    $force = isset($_GET['force']) && $_GET['force'] === '1';
    $summary = spacix_ensure_schema_and_seed($pdo, $force);

    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    $counts = [];
    foreach ($tables as $tbl) {
        $counts[$tbl] = (int) $pdo->query("SELECT COUNT(*) FROM `{$tbl}`")->fetchColumn();
    }

    echo json_encode([
        'ok' => true,
        'database' => SPACIX_DB_NAME,
        'phpVersion' => PHP_VERSION,
        'migration' => $summary,
        'tableRowCounts' => $counts,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
    ], JSON_PRETTY_PRINT);
}
