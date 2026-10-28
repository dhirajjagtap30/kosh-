<?php
/* student portal + parent portal */

function att_out($a) {
    return ['id' => (int)$a['id'], 'student_id' => (int)$a['student_id'], 'date' => $a['date'], 'status' => $a['status'], 'in_time' => (string)$a['in_time'], 'out_time' => (string)$a['out_time'], 'source' => $a['source'], 'note' => (string)$a['note']];
}
function batch_label($reg) {
    $b = val("SELECT b.name FROM batch_students bs JOIN batches b ON b.id=bs.batch_id WHERE bs.student_id=? ORDER BY b.id LIMIT 1", [$reg['id']]);
    return $b ?: $reg['standard'];
}
function pct_of($score, $total) { return (float)$total > 0 ? round((float)$score / (float)$total * 100, 2) : 0; }

/* ---------- student dashboard ---------- */
route('GET', '/student/dashboard/', function () {
    [$u, $reg] = me_student();
    $br = row("SELECT * FROM branches WHERE id=?", [$reg['branch_id']]);
    $ann = rows("SELECT a.*, p.subject FROM attempts a JOIN tests t ON t.id=a.test_id LEFT JOIN papers p ON p.id=t.paper_id WHERE a.student_id=? AND t.result_announced=1 ORDER BY a.submitted_on, a.id", [$reg['id']]);
    $percents = array_map(function ($a) { return pct_of($a['score'], $a['total']); }, $ann);
    $overall = $percents ? round(array_sum($percents) / count($percents), 2) : 0;
    $c = $w = $un = 0; $bySub = [];
    foreach ($ann as $i => $a) {
        $c += (int)$a['correct']; $w += (int)$a['wrong']; $un += (int)$a['unattempted'];
        $k = $a['subject'] ?: 'GENERAL';
        $bySub[$k][] = $percents[$i];
    }
    $q = max(1, $c + $w + $un);
    $takeable = takeable_tests($reg);
    $attempted = array_map('intval', array_column(rows("SELECT test_id FROM attempts WHERE student_id=?", [$reg['id']]), 'test_id'));
    $pending = $missed = 0; $upcoming = [];
    foreach ($takeable as $t) {
        if (in_array((int)$t['id'], $attempted, true)) continue;
        if ($t['status'] === 'Completed') $missed++;
        else { $pending++; if ($t['date'] >= today()) $upcoming[] = ['id' => (int)$t['id'], 'name' => $t['name'], 'date' => $t['date']]; }
    }
    $rank = 0;
    if ($ann) {
        $rank = 1;
        foreach (rows("SELECT a.student_id, AVG(a.score / NULLIF(a.total,0) * 100) AS avgp FROM attempts a JOIN tests t ON t.id=a.test_id JOIN registrations r ON r.id=a.student_id WHERE t.result_announced=1 AND r.branch_id=? AND r.standard=? GROUP BY a.student_id", [$reg['branch_id'], $reg['standard']]) as $r)
            if ((int)$r['student_id'] !== (int)$reg['id'] && (float)$r['avgp'] > $overall) $rank++;
    }
    $subjects = [];
    foreach ($bySub as $name => $list) $subjects[] = ['name' => $name, 'value' => round(array_sum($list) / count($list), 2)];
    usort($upcoming, function ($a, $b) { return strcmp($a['date'], $b['date']); });
    return R([
        'student' => ['name' => $reg['name'], 'institute' => $br ? ($br['institute_name'] ?: $br['name']) : '', 'batch' => batch_label($reg), 'rank' => $rank, 'accuracy' => round($c / $q * 100, 2), 'tests_done' => count($attempted)],
        'stats' => ['total' => count($takeable), 'completed' => count($ann), 'pending' => $pending, 'missed' => $missed, 'avg_accuracy' => null, 'correct' => round($c / $q * 100, 2), 'incorrect' => round($w / $q * 100, 2), 'unattempted' => round($un / $q * 100, 2), 'avg_time' => '0s', 'overall' => $overall],
        'subjects' => $subjects, 'trend' => array_slice($percents, -10), 'upcoming_exams' => $upcoming,
        'unread_notifications' => (int)val("SELECT COUNT(*) FROM student_notifications WHERE student_id=? AND is_read=0", [$reg['id']]),
    ]);
});
route('GET', '/student/profile/', function () {
    [$u, $reg] = me_student();
    return R(reg_out(row(reg_select() . " WHERE r.id=?", [$reg['id']])));
});

/* ---------- student: courses ---------- */
function course_for_student($c, $regId) {
    $lessons = course_lessons($c['id']);
    $done = array_map('intval', array_column(rows("SELECT lesson_id FROM course_progress WHERE course_id=? AND student_id=?", [$c['id'], $regId]), 'lesson_id'));
    return ['id' => (int)$c['id'], 'title' => $c['title'], 'standard' => $c['standard'], 'target' => $c['target'], 'subject' => $c['subject'], 'description' => (string)$c['description'], 'lessons' => $lessons,
        'done_lesson_ids' => $done, 'percent' => $lessons ? (int)round(count($done) / count($lessons) * 100) : 0];
}
route('GET', '/student/courses/', function () {
    [$u, $reg] = me_student();
    $cs = rows("SELECT * FROM courses WHERE status='Published' AND branch_id=? AND standard=? AND (target='' OR target=?) ORDER BY id", [$reg['branch_id'], $reg['standard'], (string)$reg['target']]);
    return R(array_map(function ($c) use ($reg) { return course_for_student($c, $reg['id']); }, $cs));
});
route('POST', '/student/courses/:id/progress/', function ($m) {
    [$u, $reg] = me_student();
    $c = row("SELECT * FROM courses WHERE id=? AND status='Published' AND branch_id=? AND standard=? AND (target='' OR target=?)", [$m[1], $reg['branch_id'], $reg['standard'], (string)$reg['target']]);
    if (!$c) fail(404, ['detail' => 'Not found.']);
    $b = body();
    $lid = (int)($b['lesson_id'] ?? 0);
    if (!val("SELECT COUNT(*) FROM lessons WHERE id=? AND course_id=?", [$lid, $c['id']])) fail(400, ['lesson_id' => ['Unknown lesson.']]);
    $done = $b['done'] === true || $b['done'] === 1 || $b['done'] === '1' || $b['done'] === 'true';
    if ($done) q("INSERT IGNORE INTO course_progress (course_id,student_id,lesson_id) VALUES (?,?,?)", [$c['id'], $reg['id'], $lid]);
    else q("DELETE FROM course_progress WHERE course_id=? AND student_id=? AND lesson_id=?", [$c['id'], $reg['id'], $lid]);
    return R(course_for_student($c, $reg['id']));
});

/* ---------- student: study material, notifications ---------- */
route('GET', '/student/materials/', function () {
    [$u, $reg] = me_student();
    $rs = rows("SELECT m.* FROM materials m WHERE m.standard=? AND m.branch_id=? AND (NOT EXISTS (SELECT 1 FROM material_batches mb WHERE mb.material_id=m.id) OR EXISTS (SELECT 1 FROM material_batches mb JOIN batch_students bs ON bs.batch_id=mb.batch_id WHERE mb.material_id=m.id AND bs.student_id=?)) ORDER BY m.id DESC", [$reg['standard'], $reg['branch_id'], $reg['id']]);
    return R(array_map('mat_out', $rs));
});
route('GET', '/student/notifications/', function () {
    [$u, $reg] = me_student();
    return R(array_map(function ($n) { return ['id' => (int)$n['id'], 'text' => $n['text'], 'created_on' => iso($n['created_on']), 'read' => (bool)$n['is_read']]; },
        rows("SELECT * FROM student_notifications WHERE student_id=? ORDER BY id DESC LIMIT 200", [$reg['id']])));
});
route('POST', '/student/notifications/mark-all-read/', function () {
    [$u, $reg] = me_student();
    q("UPDATE student_notifications SET is_read=1 WHERE student_id=?", [$reg['id']]);
    return R('', 204);
});

/* ---------- student: attendance + messages ---------- */
route('GET', '/student/attendance/', function () {
    [$u, $reg] = me_student();
    return R(array_map('att_out', rows("SELECT * FROM attendance WHERE student_id=? ORDER BY date", [$reg['id']])));
});
route('POST', '/student/attendance/mark/', function () {
    [$u, $reg] = me_student();
    if ($reg['status'] === 'Inactive') fail(403, ['detail' => 'Your account is inactive. Please contact the institute.']);
    $cur = row("SELECT * FROM attendance WHERE student_id=? AND date=?", [$reg['id'], today()]);
    if ($cur) fail(409, ['detail' => "Today's attendance is already marked: {$cur['status']}" . ($cur['in_time'] ? " (in {$cur['in_time']})" : '') . '.']);
    q("INSERT INTO attendance (student_id,date,status,in_time,source) VALUES (?,?,'Present',?,'Self')", [$reg['id'], today(), date('H:i')]);
    return R(att_out(row("SELECT * FROM attendance WHERE id=?", [last_id()])), 201);
});
function msg_create($reg, $role, $senderName, $senderUserId, $b) {
    if (blank($b['subject'] ?? '')) fail(400, required_err('subject'));
    if (blank($b['text'] ?? '')) fail(400, required_err('text'));
    if (mb_strlen((string)$b['text']) > 1000) fail(400, ['text' => ['Keep the message under 1000 characters.']]);
    q("INSERT INTO messages (branch_id,student_id,from_role,sender_name,sender_user_id,subject,text) VALUES (?,?,?,?,?,?,?)",
        [$reg['branch_id'], $reg['id'], $role, $senderName, $senderUserId, mb_substr(trim($b['subject']), 0, 100), trim($b['text'])]);
    $id = last_id();
    note($reg['branch_id'], $role === 'Parent' ? "New message from parent of {$reg['name']}: " . mb_substr(trim($b['subject']), 0, 100) : "New message from {$reg['name']}: " . mb_substr(trim($b['subject']), 0, 100));
    return msg_out(row(msg_select() . " WHERE m.id=?", [$id]));
}
route('GET', '/student/messages/', function () {
    [$u, $reg] = me_student();
    return R(array_map('msg_out', rows(msg_select() . " WHERE m.student_id=? AND m.from_role='Student' ORDER BY m.id DESC", [$reg['id']])));
});
route('POST', '/student/messages/', function () {
    [$u, $reg] = me_student();
    return R(msg_create($reg, 'Student', $reg['name'], $u['id'], body()), 201);
});

/* ---------- parent portal ---------- */
route('GET', '/parent/dashboard/', function () {
    [$u, $p, $child] = me_parent();
    if (!$child) return R(['child' => null, 'papers' => []]);
    return R(['child' => reg_out(row(reg_select() . " WHERE r.id=?", [$child['id']])), 'papers' => array_map('paper_out', rows("SELECT * FROM papers WHERE standard=? AND status='Published' ORDER BY id", [$child['standard']]))]);
});
route('GET', '/parent/profile/', function () {
    [$u, $p, $child] = me_parent();
    return R(['parent' => ['name' => $p['name'], 'mobile' => (string)$p['mobile'], 'email' => (string)$p['email'], 'username' => $p['username']],
        'child' => $child ? reg_out(row(reg_select() . " WHERE r.id=?", [$child['id']])) : null]);
});
route('GET', '/parent/results/', function () {
    [$u, $p, $child] = me_parent();
    if (!$child) return R(['results' => [], 'pending' => []]);
    $results = [];
    foreach (rows("SELECT a.*, t.name AS tname, t.date AS tdate, t.result_announced, p.subject FROM attempts a JOIN tests t ON t.id=a.test_id LEFT JOIN papers p ON p.id=t.paper_id WHERE a.student_id=? ORDER BY a.submitted_on DESC, a.id DESC", [$child['id']]) as $a) {
        $base = ['id' => (int)$a['id'], 'exam_title' => $a['tname'], 'subject' => (string)$a['subject'], 'test_date' => $a['tdate'], 'submitted_on' => iso($a['submitted_on']), 'announced' => (bool)$a['result_announced']];
        if ($a['result_announced']) {
            $higher = (int)val("SELECT COUNT(*) FROM attempts WHERE test_id=? AND score>?", [$a['test_id'], $a['score']]);
            $appeared = (int)val("SELECT COUNT(*) FROM attempts WHERE test_id=?", [$a['test_id']]);
            $base += ['score' => fnum($a['score']), 'total' => fnum($a['total']), 'percent' => (int)round(pct_of($a['score'], $a['total'])), 'correct' => (int)$a['correct'], 'wrong' => (int)$a['wrong'], 'unattempted' => (int)$a['unattempted'], 'rank' => $higher + 1, 'appeared' => $appeared];
        }
        $results[] = $base;
    }
    $done = array_map('intval', array_column(rows("SELECT test_id FROM attempts WHERE student_id=?", [$child['id']]), 'test_id'));
    $pending = [];
    foreach (takeable_tests($child) as $t) {
        if (in_array((int)$t['id'], $done, true)) continue;
        $o = test_out($t);
        $pending[] = ['id' => (int)$t['id'], 'title' => $t['name'], 'subject' => $o['subject'], 'date' => $t['date'], 'status' => exam_state($t), 'total_marks' => $o['total_marks']];
    }
    return R(['results' => $results, 'pending' => $pending]);
});
route('GET', '/parent/attendance/', function () {
    [$u, $p, $child] = me_parent();
    if (!$child) return R([]);
    return R(array_map('att_out', rows("SELECT * FROM attendance WHERE student_id=? ORDER BY date", [$child['id']])));
});
route('GET', '/parent/notices/', function () {
    [$u, $p, $child] = me_parent();
    if (!$child) return R([]);
    $out = [];
    foreach (rows("SELECT * FROM notices WHERE audience<>'Students' AND branch_id=? AND (standard='' OR standard=?)", [$child['branch_id'], $child['standard']]) as $n)
        $out[] = ['id' => 'n' . $n['id'], 'kind' => 'Notice', 'title' => $n['title'], 'text' => $n['text'], 'pinned' => (bool)$n['pinned'], 'created_on' => iso($n['created_on'])];
    foreach (rows("SELECT * FROM student_notifications WHERE student_id=? ORDER BY id DESC LIMIT 100", [$child['id']]) as $n)
        $out[] = ['id' => 't' . $n['id'], 'kind' => 'Test', 'title' => 'Test alert', 'text' => $n['text'], 'pinned' => false, 'created_on' => iso($n['created_on'])];
    usort($out, function ($a, $b) { return ((int)$b['pinned'] <=> (int)$a['pinned']) ?: strcmp($b['created_on'], $a['created_on']); });
    return R($out);
});
route('GET', '/parent/messages/', function () {
    [$u, $p, $child] = me_parent();
    return R(array_map('msg_out', rows(msg_select() . " WHERE m.from_role='Parent' AND m.sender_user_id=? ORDER BY m.id DESC", [$u['id']])));
});
route('POST', '/parent/messages/', function () {
    [$u, $p, $child] = me_parent();
    if (!$child) fail(400, ['detail' => 'No child is linked to this account yet. Please contact the institute.']);
    return R(msg_create($child, 'Parent', $p['name'] . ' (Parent)', $u['id'], body()), 201);
});
