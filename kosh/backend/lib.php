<?php
require_once __DIR__ . '/config.php';
date_default_timezone_set(APP_TZ);

const TARGET_STANDARDS = ['11th', '12th', 'Dropper / Repeater'];
const EXAM_TARGETS = ['JEE (Main)', 'JEE (Advanced)', 'NEET', 'MHT-CET'];
const DASH = ['superadmin', 'admin', 'staff', 'trainer'];

class ApiEx extends Exception {
    public $status; public $data;
    public function __construct($status, $data) { parent::__construct('api'); $this->status = $status; $this->data = $data; }
}
function fail($status, $data) { throw new ApiEx($status, $data); }
function R($data, $status = 200) { return [$status, $data]; }
function required_err($f) { return [$f => ['This field may not be blank.']]; }

/* ---------- database ---------- */
function db() {
    static $pdo = null;
    if (!$pdo) {
        $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec("SET time_zone = '+05:30'");
    }
    return $pdo;
}
function q($sql, $p = []) { $s = db()->prepare($sql); $s->execute($p); return $s; }
function rows($sql, $p = []) { return q($sql, $p)->fetchAll(); }
function row($sql, $p = []) { $r = q($sql, $p)->fetch(); return $r ? $r : null; }
function val($sql, $p = []) { $r = q($sql, $p)->fetch(PDO::FETCH_NUM); return $r ? $r[0] : null; }
function last_id() { return (int)db()->lastInsertId(); }
function ph($n) { return implode(',', array_fill(0, $n, '?')); }

/* ---------- request ---------- */
function body() {
    static $b = null;
    if ($b !== null) return $b;
    if (!empty($_POST)) { $b = $_POST; return $b; }
    $j = json_decode(file_get_contents('php://input'), true);
    $b = is_array($j) ? $j : [];
    return $b;
}
function pick($b, $keys) { return array_intersect_key($b, array_flip($keys)); }
function ids_arr($v) { return array_values(array_unique(array_map('intval', is_array($v) ? $v : []))); }
function blank($v) { return trim((string)($v === null ? '' : $v)) === ''; }
function is_phone($v) { return (bool)preg_match('/^\d{10}$/', (string)$v); }
function is_email($v) { return (bool)preg_match('/^\S+@\S+\.\S+$/', (string)$v); }
function is_date($v) { return (bool)preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)$v) && strtotime($v . ' 00:00:00') !== false; }
function today() { return date('Y-m-d'); }
function iso($dt) { return $dt ? date('Y-m-d\TH:i:s', strtotime($dt)) : ''; }
function fnum($v) { return $v === null ? null : (float)$v; }
function sc_and($col, $u) { return $u['sc'] ? " AND $col=" . (int)$u['sc'] : ''; }
function base_url() {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    return ($https ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
}

/* ---------- auth ---------- */
function bearer() {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (!$h && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) { if (strtolower($k) === 'authorization') $h = $v; }
    }
    return preg_match('/^\S+\s+(\S+)$/', trim($h), $m) ? $m[1] : '';
}
/* Returns the logged-in user: id, role, name, branch_id, sc (branch the data is limited to; 0 = all) */
function auth($roles = null) {
    static $cache = null;
    if ($cache === null) {
        $t = bearer();
        $u = $t ? row("SELECT u.* FROM api_tokens t JOIN users u ON u.id=t.user_id WHERE t.token=? AND t.expires_at>NOW() AND u.status='Active'", [$t]) : null;
        if (!$u) fail(401, ['detail' => 'Authentication required.']);
        $sc = $u['role'] === 'superadmin' ? (int)($_SERVER['HTTP_X_BRANCH_ID'] ?? 0) : (int)$u['branch_id'];
        $cache = ['id' => (int)$u['id'], 'role' => $u['role'], 'name' => $u['name'], 'branch_id' => (int)$u['branch_id'], 'sc' => $sc];
    }
    if ($roles && !in_array($cache['role'], $roles, true)) fail(403, ['detail' => 'You do not have permission to do this.']);
    return $cache;
}
function me_student() {
    $u = auth();
    if ($u['role'] !== 'student') fail(403, ['detail' => 'Students only.']);
    $r = row("SELECT * FROM registrations WHERE user_id=?", [$u['id']]);
    if (!$r) fail(403, ['detail' => 'Students only.']);
    return [$u, $r];
}
function me_parent() {
    $u = auth();
    if ($u['role'] !== 'parent') fail(403, ['detail' => 'Parents only.']);
    $p = row("SELECT p.*, us.name, us.mobile, us.email, us.username FROM parents p JOIN users us ON us.id=p.user_id WHERE p.user_id=?", [$u['id']]);
    if (!$p) fail(403, ['detail' => 'Parents only.']);
    $child = $p['student_id'] ? row("SELECT * FROM registrations WHERE id=?", [$p['student_id']]) : null;
    return [$u, $p, $child];
}

/* ---------- accounts ---------- */
function username_taken($username, $email, $exceptUserId = 0) {
    if ($username !== '' && val("SELECT COUNT(*) FROM users WHERE LOWER(username)=LOWER(?) AND id<>?", [$username, $exceptUserId])) return ['username' => ['This ID is already taken.']];
    if ($email !== '' && val("SELECT COUNT(*) FROM users WHERE LOWER(email)=LOWER(?) AND id<>?", [$email, $exceptUserId])) return ['email' => ['An account with this email already exists.']];
    return null;
}
function make_user($branch, $role, $name, $email, $username, $mobile, $password, $status = 'Active') {
    q("INSERT INTO users (branch_id,role,name,email,username,mobile,password_hash,status) VALUES (?,?,?,?,?,?,?,?)",
        [$branch, $role, $name, $email === '' ? null : $email, $username, $mobile, password_hash($password, PASSWORD_BCRYPT), $status]);
    return last_id();
}
function branch_for($u, $b) {
    $id = $u['sc'] ?: (int)($b['branch_id'] ?? 0);
    if (!$id || !val("SELECT COUNT(*) FROM branches WHERE id=? AND status='Active'", [$id])) fail(400, ['branch_id' => ['Select a branch (top bar) before adding.']]);
    return $id;
}
function note($branch, $text) {
    q("INSERT INTO notifications (branch_id,text) VALUES (?,?)", [$branch, mb_substr($text, 0, 300)]);
}

/* ---------- route registry ---------- */
$GLOBALS['ROUTES'] = [];
function route($method, $path, $fn) {
    $GLOBALS['ROUTES'][] = [$method, '#^' . str_replace(':id', '(\d+)', $path) . '$#', $fn];
}
