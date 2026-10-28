<?php
/* batches, notices, messages, settings, notifications, enquiries, legacy students */

/* ---------- helpers: recipients of notifications ---------- */
function recipients($branch, $standard, $batchIds) {
    $sql = "SELECT r.id FROM registrations r WHERE r.status='Active' AND r.standard=?";
    $p = [$standard];
    if ($branch) { $sql .= " AND r.branch_id=?"; $p[] = $branch; }
    if ($batchIds) { $sql .= " AND r.id IN (SELECT student_id FROM batch_students WHERE batch_id IN (" . ph(count($batchIds)) . "))"; $p = array_merge($p, $batchIds); }
    return array_map('intval', array_column(rows($sql, $p), 'id'));
}
function push_students($ids, $text) {
    foreach ($ids as $id) q("INSERT INTO student_notifications (student_id,text) VALUES (?,?)", [$id, mb_substr($text, 0, 500)]);
    return count($ids);
}

/* ---------- batches ---------- */
function batch_out($b) {
    $ids = array_map('intval', array_column(rows("SELECT student_id FROM batch_students WHERE batch_id=? ORDER BY student_id", [$b['id']]), 'student_id'));
    return ['id' => (int)$b['id'], 'branch_id' => (int)$b['branch_id'], 'branch_name' => $b['branch_name'] ?? '', 'name' => $b['name'], 'standard' => $b['standard'], 'student_ids' => $ids, 'student_count' => count($ids)];
}
function batch_select() { return "SELECT b.*, br.name AS branch_name FROM batches b LEFT JOIN branches br ON br.id=b.branch_id"; }
function batch_validate(&$b, $self) {
    if (blank($b['name'] ?? '')) return required_err('name');
    if (blank($b['standard'] ?? '')) return required_err('standard');
    $b['name'] = trim($b['name']);
    if (val("SELECT COUNT(*) FROM batches WHERE branch_id=? AND standard=? AND LOWER(name)=LOWER(?) AND id<>?", [$b['branch_id'], $b['standard'], $b['name'], (int)$self]))
        return ['name' => ['A batch with this name already exists for this standard.']];
    $b['student_ids'] = ids_arr($b['student_ids'] ?? []);
    if ($b['student_ids']) {
        $n = (int)val("SELECT COUNT(*) FROM registrations WHERE standard=? AND branch_id=? AND id IN (" . ph(count($b['student_ids'])) . ")", array_merge([$b['standard'], $b['branch_id']], $b['student_ids']));
        if ($n !== count($b['student_ids'])) return ['student_ids' => ['Students must be registered and belong to the batch standard.']];
    }
    return null;
}
function batch_save_students($id, $ids) {
    q("DELETE FROM batch_students WHERE batch_id=?", [$id]);
    foreach ($ids as $sid) q("INSERT INTO batch_students (batch_id,student_id) VALUES (?,?)", [$id, $sid]);
}
route('GET', '/batches/', function () {
    $u = auth(DASH);
    return R(array_map('batch_out', rows(batch_select() . " WHERE 1=1" . sc_and('b.branch_id', $u) . " ORDER BY b.id")));
});
route('POST', '/batches/', function () {
    $u = auth(DASH);
    $body = body();
    $b = pick($body, ['name', 'standard', 'student_ids']);
    $b['branch_id'] = branch_for($u, $body);
    if ($err = batch_validate($b, 0)) fail(400, $err);
    q("INSERT INTO batches (branch_id,name,standard) VALUES (?,?,?)", [$b['branch_id'], $b['name'], $b['standard']]);
    $id = last_id();
    batch_save_students($id, $b['student_ids']);
    return R(batch_out(row(batch_select() . " WHERE b.id=?", [$id])), 201);
});
route('PATCH', '/batches/:id/', function ($m) {
    $u = auth(DASH);
    $cur = row(batch_select() . " WHERE b.id=?" . sc_and('b.branch_id', $u), [$m[1]]);
    if (!$cur) fail(404, ['detail' => 'Not found.']);
    $cur['student_ids'] = array_column(rows("SELECT student_id FROM batch_students WHERE batch_id=?", [$cur['id']]), 'student_id');
    $b = array_merge($cur, pick(body(), ['name', 'standard', 'student_ids']));
    if ($err = batch_validate($b, $cur['id'])) fail(400, $err);
    q("UPDATE batches SET name=?, standard=? WHERE id=?", [$b['name'], $b['standard'], $cur['id']]);
    batch_save_students($cur['id'], $b['student_ids']);
    return R(batch_out(row(batch_select() . " WHERE b.id=?", [$cur['id']])));
});
route('DELETE', '/batches/:id/', function ($m) {
    $u = auth(DASH);
    if (!row("SELECT id FROM batches WHERE id=?" . sc_and('branch_id', $u), [$m[1]])) fail(404, ['detail' => 'Not found.']);
    q("DELETE FROM batches WHERE id=?", [$m[1]]);
    return R('', 204);
});

/* ---------- notices ---------- */
function notice_out($n) {
    return ['id' => (int)$n['id'], 'branch_id' => (int)$n['branch_id'], 'branch_name' => $n['branch_name'] ?? '', 'title' => $n['title'], 'text' => $n['text'], 'audience' => $n['audience'], 'standard' => $n['standard'], 'pinned' => (bool)$n['pinned'], 'created_on' => iso($n['created_on'])];
}
function notice_select() { return "SELECT n.*, br.name AS branch_name FROM notices n LEFT JOIN branches br ON br.id=n.branch_id"; }
function notice_validate(&$n) {
    if (blank($n['title'] ?? '')) return required_err('title');
    if (blank($n['text'] ?? '')) return required_err('text');
    if (mb_strlen((string)$n['text']) > 2000) return ['text' => ['Keep the notice under 2000 characters.']];
    if (!in_array($n['audience'] ?? '', ['Parents', 'Students', 'Everyone'], true)) return ['audience' => ['Choose who should see this notice.']];
    $n['title'] = mb_substr(trim($n['title']), 0, 120);
    $n['text'] = trim($n['text']);
    $n['standard'] = (string)($n['standard'] ?? '');
    $n['pinned'] = !empty($n['pinned']) && $n['pinned'] !== 'false' ? 1 : 0;
    return null;
}
route('GET', '/notices/', function () {
    $u = auth(DASH);
    return R(array_map('notice_out', rows(notice_select() . " WHERE 1=1" . sc_and('n.branch_id', $u) . " ORDER BY n.id DESC")));
});
route('POST', '/notices/', function () {
    $u = auth(DASH);
    $body = body();
    $n = array_merge(['audience' => 'Parents', 'standard' => '', 'pinned' => 0], pick($body, ['title', 'text', 'audience', 'standard', 'pinned']));
    $branch = branch_for($u, $body);
    if ($err = notice_validate($n)) fail(400, $err);
    q("INSERT INTO notices (branch_id,title,text,audience,standard,pinned) VALUES (?,?,?,?,?,?)", [$branch, $n['title'], $n['text'], $n['audience'], $n['standard'], $n['pinned']]);
    return R(notice_out(row(notice_select() . " WHERE n.id=?", [last_id()])), 201);
});
route('PATCH', '/notices/:id/', function ($m) {
    $u = auth(DASH);
    $cur = row(notice_select() . " WHERE n.id=?" . sc_and('n.branch_id', $u), [$m[1]]);
    if (!$cur) fail(404, ['detail' => 'Not found.']);
    $n = array_merge($cur, pick(body(), ['title', 'text', 'audience', 'standard', 'pinned']));
    if ($err = notice_validate($n)) fail(400, $err);
    q("UPDATE notices SET title=?,text=?,audience=?,standard=?,pinned=? WHERE id=?", [$n['title'], $n['text'], $n['audience'], $n['standard'], $n['pinned'], $cur['id']]);
    return R(notice_out(row(notice_select() . " WHERE n.id=?", [$cur['id']])));
});
route('DELETE', '/notices/:id/', function ($m) {
    $u = auth(DASH);
    if (!row("SELECT id FROM notices WHERE id=?" . sc_and('branch_id', $u), [$m[1]])) fail(404, ['detail' => 'Not found.']);
    q("DELETE FROM notices WHERE id=?", [$m[1]]);
    return R('', 204);
});

/* ---------- messages (student / parent -> institute) ---------- */
function msg_select() {
    return "SELECT m.*, r.name AS student_name, r.standard FROM messages m JOIN registrations r ON r.id=m.student_id";
}
function msg_out($x) {
    return ['id' => (int)$x['id'], 'student_id' => (int)$x['student_id'], 'student_name' => $x['student_name'], 'from_role' => $x['from_role'], 'sender_name' => $x['sender_name'], 'standard' => $x['standard'],
        'subject' => $x['subject'], 'text' => $x['text'], 'created_on' => iso($x['created_on']), 'reply' => (string)($x['reply'] ?? ''), 'replied_on' => iso($x['replied_on'] ?? null)];
}
route('GET', '/messages/', function () {
    $u = auth(DASH);
    return R(array_map('msg_out', rows(msg_select() . " WHERE 1=1" . sc_and('m.branch_id', $u) . " ORDER BY m.id DESC")));
});
route('PATCH', '/messages/:id/', function ($m) {
    $u = auth(DASH);
    $x = row(msg_select() . " WHERE m.id=?" . sc_and('m.branch_id', $u), [$m[1]]);
    if (!$x) fail(404, ['detail' => 'Not found.']);
    $reply = trim((string)(body()['reply'] ?? ''));
    if ($reply === '') fail(400, required_err('reply'));
    q("UPDATE messages SET reply=?, replied_on=NOW() WHERE id=?", [mb_substr($reply, 0, 1000), $x['id']]);
    return R(msg_out(row(msg_select() . " WHERE m.id=?", [$x['id']])));
});
route('DELETE', '/messages/:id/', function ($m) {
    $u = auth(DASH);
    if (!row("SELECT id FROM messages WHERE id=?" . sc_and('branch_id', $u), [$m[1]])) fail(404, ['detail' => 'Not found.']);
    q("DELETE FROM messages WHERE id=?", [$m[1]]);
    return R('', 204);
});

/* ---------- legacy "students" list = registered students ---------- */
route('GET', '/students/', function () {
    $u = auth(DASH);
    $out = [];
    foreach (rows("SELECT r.id, r.name, r.mobile, r.standard, r.target, (SELECT b.name FROM batch_students bs JOIN batches b ON b.id=bs.batch_id WHERE bs.student_id=r.id ORDER BY b.id LIMIT 1) AS batch FROM registrations r WHERE 1=1" . sc_and('r.branch_id', $u) . " ORDER BY r.id") as $r)
        $out[] = ['id' => (int)$r['id'], 'name' => $r['name'], 'batch' => $r['batch'] ?: trim($r['standard'] . ' ' . $r['target']), 'phone' => $r['mobile']];
    return R($out);
});
route('POST', '/students/', function () {
    auth(DASH);
    fail(400, ['detail' => 'Add students from Dashboard -> Registrations (they need a login ID and password).']);
});
route('DELETE', '/students/:id/', function ($m) {
    $u = auth(DASH);
    if (!row("SELECT id FROM registrations WHERE id=?" . sc_and('branch_id', $u), [$m[1]])) fail(404, ['detail' => 'Not found.']);
    delete_registration((int)$m[1]);
    return R('', 204);
});

/* ---------- settings ---------- */
function settings_row($u) {
    $bid = $u['sc'] ?: (int)val("SELECT MIN(id) FROM branches");
    $s = row("SELECT * FROM settings WHERE branch_id=?", [$bid]);
    if (!$s) {
        $br = row("SELECT * FROM branches WHERE id=?", [$bid]);
        q("INSERT INTO settings (branch_id,institute,email,phone) VALUES (?,?,?,?)", [$bid, $br ? ($br['institute_name'] ?: $br['name']) : 'Institute', $br['email'] ?? '', $br['phone'] ?? '']);
        $s = row("SELECT * FROM settings WHERE branch_id=?", [$bid]);
    }
    return $s;
}
function settings_out($s) {
    return ['institute' => $s['institute'], 'email' => $s['email'], 'phone' => $s['phone'], 'low_score_below' => (int)$s['low_score_below'], 'notify_email' => (bool)$s['notify_email'], 'notify_low_score' => (bool)$s['notify_low_score']];
}
route('GET', '/settings/', function () { return R(settings_out(settings_row(auth(DASH)))); });
route('PATCH', '/settings/', function () {
    $u = auth(DASH);
    $s = settings_row($u);
    $b = body();
    if (array_key_exists('institute', $b) && blank($b['institute'])) fail(400, ['institute' => ['Institute name is required.']]);
    if (array_key_exists('email', $b) && !is_email($b['email'])) fail(400, ['email' => ['Enter a valid email address.']]);
    if (array_key_exists('low_score_below', $b) && !((int)$b['low_score_below'] >= 1 && (int)$b['low_score_below'] <= 100)) fail(400, ['low_score_below' => ['Must be between 1 and 100.']]);
    $n = array_merge($s, pick($b, ['institute', 'email', 'phone', 'low_score_below', 'notify_email', 'notify_low_score']));
    q("UPDATE settings SET institute=?,email=?,phone=?,low_score_below=?,notify_email=?,notify_low_score=? WHERE branch_id=?",
        [trim($n['institute']), $n['email'], (string)$n['phone'], (int)$n['low_score_below'], $n['notify_email'] ? 1 : 0, $n['notify_low_score'] ? 1 : 0, $s['branch_id']]);
    return R(settings_out(row("SELECT * FROM settings WHERE branch_id=?", [$s['branch_id']])));
});

/* ---------- admin bell notifications ---------- */
route('GET', '/notifications/', function () {
    $u = auth(DASH);
    return R(array_map(function ($n) { return ['id' => (int)$n['id'], 'text' => $n['text'], 'read' => (bool)$n['is_read']]; },
        rows("SELECT * FROM notifications WHERE 1=1" . sc_and('branch_id', $u) . " ORDER BY id DESC LIMIT 20")));
});
route('POST', '/notifications/mark-all-read/', function () {
    $u = auth(DASH);
    q("UPDATE notifications SET is_read=1 WHERE 1=1" . sc_and('branch_id', $u));
    return R('', 204);
});
/* Teacher -> Send notification */
route('POST', '/notifications/send/', function () {
    $u = auth(DASH);
    $b = body();
    $title = trim((string)($b['title'] ?? '')); $message = trim((string)($b['message'] ?? ''));
    if ($title === '') fail(400, required_err('title'));
    if ($message === '') fail(400, required_err('message'));
    if (mb_strlen($message) > 1000) fail(400, ['message' => ['Keep the message under 1000 characters.']]);
    $pool = "SELECT id FROM registrations r WHERE r.status='Active'" . sc_and('r.branch_id', $u);
    $aud = $b['audience'] ?? '';
    $ids = [];
    if ($aud === 'students') {
        $want = ids_arr($b['student_ids'] ?? []);
        if ($want) $ids = array_column(rows($pool . " AND r.id IN (" . ph(count($want)) . ")", $want), 'id');
    } elseif ($aud === 'batches') {
        $bids = ids_arr($b['batch_ids'] ?? []);
        if ($bids) $ids = array_column(rows($pool . " AND r.id IN (SELECT student_id FROM batch_students WHERE batch_id IN (" . ph(count($bids)) . "))", $bids), 'id');
    } elseif ($aud === 'standard') {
        $ids = array_column(rows($pool . " AND r.standard=?", [(string)($b['standard'] ?? '')]), 'id');
    } else fail(400, ['audience' => ['Choose who should receive the notification.']]);
    $ids = array_values(array_unique(array_map('intval', $ids)));
    if (!$ids) fail(400, ['detail' => 'No active students found for this selection.']);
    return R(['sent' => push_students($ids, "$title: $message")]);
});

/* ---------- public website forms ---------- */
route('POST', '/enquiries/', function () {
    $b = body();
    if (blank($b['name'] ?? '')) fail(400, required_err('name'));
    if (blank($b['message'] ?? '')) fail(400, required_err('message'));
    q("INSERT INTO enquiries (name,email,mobile,topic,message) VALUES (?,?,?,?,?)", [mb_substr(trim($b['name']), 0, 120), mb_substr((string)($b['email'] ?? ''), 0, 120), mb_substr((string)($b['mobile'] ?? ''), 0, 20), mb_substr((string)($b['topic'] ?? ''), 0, 120), (string)$b['message']]);
    return R(['id' => last_id()], 201);
});
route('POST', '/leads/demo-requests/', function () {
    $b = body();
    if (blank($b['name'] ?? '') || blank($b['phone'] ?? '')) fail(400, ['non_field_errors' => ['Name and mobile number are required.']]);
    q("INSERT INTO demo_requests (name,institute,phone,need) VALUES (?,?,?,?)", [mb_substr(trim($b['name']), 0, 120), mb_substr((string)($b['institute'] ?? ''), 0, 160), mb_substr(trim($b['phone']), 0, 20), mb_substr((string)($b['need'] ?? ''), 0, 500)]);
    return R(['id' => last_id()], 201);
});
route('POST', '/demo/reset/', function () { auth(DASH); return R('', 204); });
