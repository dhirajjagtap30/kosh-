<?php
/* Sahyadri / kosh REST API (PHP + MySQL). Contract: ../docs/API_CONTRACT.md */
require __DIR__ . '/lib.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (ALLOWED_ORIGINS === '*') {
    header('Access-Control-Allow-Origin: *');
} else {
    $allowed = array_map('trim', explode(',', ALLOWED_ORIGINS));
    if (in_array($origin, $allowed, true)) { header('Access-Control-Allow-Origin: ' . $origin); header('Vary: Origin'); }
}
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Branch-Id, Accept, X-HTTP-Method-Override');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

foreach (['auth', 'people', 'academics', 'exams', 'portal', 'misc'] as $f) require __DIR__ . "/routes_$f.php";

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method === 'POST') {
    $ov = $_POST['_method'] ?? ($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '');
    if ($ov) { $method = strtoupper($ov); unset($_POST['_method']); }
}
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$uri = rawurldecode($uri);
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
if ($base !== '' && strpos($uri, $base) === 0) $uri = substr($uri, strlen($base));
$uri = preg_replace('#^/index\.php#', '', $uri);
$uri = preg_replace('#^/api(?=/)#', '', $uri);
$uri = '/' . trim($uri, '/') . '/';
if ($uri === '//') $uri = '/';

try {
    foreach ($GLOBALS['ROUTES'] as $r) {
        if ($r[0] === $method && preg_match($r[1], $uri, $m)) {
            [$status, $data] = $r[2]($m);
            http_response_code($status);
            if ($status !== 204) {
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
            }
            exit;
        }
    }
    fail(404, ['detail' => 'Not found.']);
} catch (ApiEx $e) {
    http_response_code($e->status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($e->data, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    try { if (db()->inTransaction()) db()->rollBack(); } catch (Throwable $x) {}
    error_log('API error: ' . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['detail' => (defined('API_DEBUG') && API_DEBUG) ? 'Server error: ' . $e->getMessage() : 'Server error. Please try again.']);
}
