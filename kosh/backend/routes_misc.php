<?php
/* attendance (manual + biometric) */

const ATT_STATUS = ['Present', 'Absent', 'Late', 'Leave'];

function norm_id($v) { $s = strtolower(trim((string)$v)); return preg_match('/^\d+$/', $s) ? (string)((int)$s) : $s; }
/* device ID -> student: biometric_id, then mobile, then registration id */
function find_by_device_id($students, $dev) {
    foreach ($students as $r) if ($r['biometric_id'] !== null && $r['biometric_id'] !== '' && norm_id($r['biometric_id']) === norm_id($dev)) return $r;
    foreach ($students as $r) if ($r['mobile'] === trim((string)$dev)) return $r;
    foreach ($students as $r) if ((string)$r['id'] === norm_id($dev)) return $r;
    return null;
}
function upsert_att($studentId, $date, $patch) {
    $cur = row("SELECT * FROM attendance WHERE student_id=? AND date=?", [$studentId, $date]);
    if ($cur) {
        $n = array_merge($cur, $patch);
        q("UPDATE attendance SET status=?,in_time=?,out_time=?,source=?,note=? WHERE id=?", [$n['status'], $n['in_time'], $n['out_time'], $n['source'], $n['note'], $cur['id']]);
        return false;
    }
    $n = array_merge(['status' => 'Absent', 'in_time' => '', 'out_time' => '', 'source' => 'Manual', 'note' => ''], $patch);
    q("INSERT INTO attendance (student_id,date,status,in_time,out_time,source,note) VALUES (?,?,?,?,?,?,?)", [$studentId, $date, $n['status'], $n['in_time'], $n['out_time'], $n['source'], $n['note']]);
    return true;
}
/* punches = [[biometric_id, "YYYY-MM-DD HH:MM"]]  ->  summary (shared by the browser import and the device push) */
function import_punches($students, $punches, $lateAfter, $markAbsent) {
    $groups = []; $unknown = []; $skipped = 0;
    foreach ($punches as $p) {
        $ts = (string)($p['timestamp'] ?? '');
        $date = substr($ts, 0, 10); $time = substr($ts, 11, 5);
        $st = (is_date($date) && $date <= today()) ? find_by_device_id($students, $p['biometric_id'] ?? '') : null;
        if (!$st) { $skipped++; if (is_date($date) && $date <= today()) $unknown[(string)($p['biometric_id'] ?? '')] = 1; continue; }
        $k = $st['id'] . '|' . $date;
        if (!isset($groups[$k])) $groups[$k] = ['st' => $st, 'date' => $date, 'times' => []];
        if ($time !== '') $groups[$k]['times'][] = $time;
    }
    $created = $updated = 0; $dates = []; $matched = [];
    foreach ($groups as $g) {
        sort($g['times']);
        $first = $g['times'][0] ?? '';
        $last = count($g['times']) > 1 ? end($g['times']) : '';
        $status = ($lateAfter !== '' && $first !== '' && $first > $lateAfter) ? 'Late' : 'Present';
        if (upsert_att($g['st']['id'], $g['date'], ['status' => $status, 'in_time' => $first, 'out_time' => $last, 'source' => 'Biometric'])) $created++; else $updated++;
        $dates[$g['date']] = 1; $matched[$g['st']['id']] = 1;
    }
    $absent = 0;
    if ($markAbsent) foreach (array_keys($dates) as $date) foreach ($students as $st) {
        if (($st['registered_on'] ?? '') > $date) continue;
        if (row("SELECT id FROM attendance WHERE student_id=? AND date=?", [$st['id'], $date])) continue;
        upsert_att($st['id'], $date, ['status' => 'Absent', 'source' => 'Biometric']); $absent++;
    }
    return ['students_matched' => count($matched), 'created' => $created, 'updated' => $updated, 'absent_marked' => $absent, 'days' => count($dates), 'skipped_rows' => $skipped, 'unknown_ids' => array_slice(array_keys($unknown), 0, 50)];
}

route('GET', '/attendance/', function () {
    $u = auth(DASH);
    $sql = "SELECT a.* FROM attendance a JOIN registrations r ON r.id=a.student_id WHERE 1=1" . sc_and('r.branch_id', $u);
    $p = [];
    if (is_date($_GET['from'] ?? '')) { $sql .= " AND a.date>=?"; $p[] = $_GET['from']; }
    if (is_date($_GET['to'] ?? '')) { $sql .= " AND a.date<=?"; $p[] = $_GET['to']; }
    return R(array_map('att_out', rows($sql . " ORDER BY a.date, a.id", $p)));
});
route('POST', '/attendance/mark/', function () {
    $u = auth(DASH);
    $b = body();
    if (!is_date($b['date'] ?? '')) fail(400, ['date' => ['Choose a valid date.']]);
    if ($b['date'] > today()) fail(400, ['date' => ['Attendance cannot be marked for a future date.']]);
    $list = is_array($b['records'] ?? null) ? $b['records'] : [];
    if (!$list) fail(400, ['records' => ['Nothing to save.']]);
    db()->beginTransaction();
    $saved = 0;
    foreach ($list as $r) {
        $st = row("SELECT id, name FROM registrations WHERE id=?" . sc_and('branch_id', $u), [(int)($r['student_id'] ?? 0)]);
        if (!$st) fail(400, ['records' => ['A student in the list was not found.']]);
        if (!in_array($r['status'] ?? '', ATT_STATUS, true)) fail(400, ['records' => ["Invalid status for {$st['name']}."]]);
        upsert_att($st['id'], $b['date'], ['status' => $r['status'], 'note' => mb_substr((string)($r['note'] ?? ''), 0, 200), 'source' => 'Manual']);
        $saved++;
    }
    db()->commit();
    return R(['saved' => $saved]);
});
route('POST', '/attendance/import/', function () {
    $u = auth(DASH);
    $b = body();
    if (!$u['sc'] && (int)val("SELECT COUNT(*) FROM branches") > 1) fail(400, ['detail' => 'Select a branch in the top bar before importing.']);
    $punches = is_array($b['punches'] ?? null) ? $b['punches'] : [];
    if (!$punches) fail(400, ['punches' => ['The file has no attendance rows.']]);
    $late = preg_match('/^\d{2}:\d{2}$/', (string)($b['late_after'] ?? '')) ? $b['late_after'] : '';
    $students = rows("SELECT * FROM registrations r WHERE r.status='Active'" . sc_and('r.branch_id', $u));
    db()->beginTransaction();
    $res = import_punches($students, $punches, $late, !array_key_exists('mark_absent', $b) || $b['mark_absent'] !== false);
    db()->commit();
    return R($res);
});

/* Optional: biometric machine pushes punches here (secret token, no normal login).
   POST /device/punch/?token=SECRET&branch=1   body: lines "<user id> <YYYY-MM-DD HH:MM[:SS]> ..." (ZKTeco ADMS style, tab or space separated) */
route('POST', '/device/punch/', function () {
    if (!hash_equals(DEVICE_TOKEN, (string)($_GET['token'] ?? ''))) fail(401, ['detail' => 'Invalid device token.']);
    $branch = (int)($_GET['branch'] ?? 0);
    if (!$branch) fail(400, ['detail' => 'branch is required.']);
    $punches = [];
    foreach (preg_split('/\r?\n/', (string)file_get_contents('php://input')) as $line) {
        if (preg_match('/^\s*(\S+)[\s\t]+(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/', $line, $mm)) $punches[] = ['biometric_id' => $mm[1], 'timestamp' => $mm[2] . ' ' . $mm[3]];
    }
    if (!$punches) return R(['saved' => 0]);
    $students = rows("SELECT * FROM registrations WHERE status='Active' AND branch_id=?", [$branch]);
    db()->beginTransaction();
    $res = import_punches($students, $punches, '', false);
    db()->commit();
    return R($res);
});
