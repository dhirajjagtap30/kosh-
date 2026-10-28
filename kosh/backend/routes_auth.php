<?php
/* auth, registrations, staff, parents, branches */

function user_json($u) {
    return ['id' => (int)$u['id'], 'role' => $u['role'], 'name' => $u['name'], 'email' => $u['email'] ?? '', 'username' => $u['username'], 'branch_id' => (int)$u['branch_id']];
}

route('POST', '/auth/login/', function () {
    $b = body();
    $id = strtolower(trim((string)($b['identifier'] ?? '')));
    $pw = (string)($b['password'] ?? '');
    $u = $id !== '' ? row("SELECT * FROM users WHERE LOWER(username)=? OR LOWER(email)=? LIMIT 1", [$id, $id]) : null;
    if (!$u || !password_verify($pw, $u['password_hash'])) fail(401, ['detail' => 'Incorrect email/username or password.']);
    if ($u['status'] === 'Inactive') fail(403, ['detail' => 'This account is inactive. Please contact the institute.']);
    $bid = (int)$u['branch_id'];
    if ($bid) {
        $br = row("SELECT status FROM branches WHERE id=?", [$bid]);
        if ($br && $br['status'] === 'Inactive') fail(403, ['detail' => 'This branch is inactive. Please contact the head office.']);
    }
    q("DELETE FROM api_tokens WHERE expires_at<NOW()");
    $tok = bin2hex(random_bytes(32));
    q("INSERT INTO api_tokens (token,user_id,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL " . (int)TOKEN_HOURS . " HOUR))", [$tok, $u['id']]);
    return R(['access' => $tok, 'user' => user_json($u)]);
});

route('POST', '/auth/logout/', function () {
    $t = bearer();
    if ($t) q("DELETE FROM api_tokens WHERE token=?", [$t]);
    return R('', 204);
});

/* ---------- registrations ---------- */
function reg_select() {
    return "SELECT r.*, u.username, b.name AS branch_name FROM registrations r LEFT JOIN users u ON u.id=r.user_id LEFT JOIN branches b ON b.id=r.branch_id";
}
function reg_out($r) {
    return ['id' => (int)$r['id'], 'branch_id' => (int)$r['branch_id'], 'branch_name' => $r['branch_name'] ?? '', 'name' => $r['name'], 'mobile' => $r['mobile'],
        'standard' => $r['standard'], 'target' => $r['target'] ?? '', 'medium' => $r['medium'], 'date_of_birth' => $r['date_of_birth'] ?? '', 'email' => $r['email'],
        'parent_name' => $r['parent_name'], 'parent_mobile' => $r['parent_mobile'], 'school_name' => $r['school_name'], 'username' => $r['username'] ?? '',
        'status' => $r['status'], 'biometric_id' => $r['biometric_id'] ?? '', 'registered_on' => $r['registered_on']];
}
function reg_validate(&$r, $selfRegId, $selfUserId, $needPw) {
    if (blank($r['name'] ?? '')) return required_err('name');
    if (!is_phone($r['mobile'] ?? '')) return ['mobile' => ['Mobile number must be 10 digits.']];
    if (blank($r['standard'] ?? '')) return required_err('standard');
    if (in_array($r['standard'], TARGET_STANDARDS, true)) {
        if (!in_array($r['target'] ?? '', EXAM_TARGETS, true)) return ['target' => ['Choose the exam target (JEE Main / JEE Advanced / NEET / MHT-CET).']];
    } else { $r['target'] = ''; }
    if (blank($r['medium'] ?? '')) return required_err('medium');
    if (!is_date($r['date_of_birth'] ?? '')) return ['date_of_birth' => ['Enter a valid date of birth.']];
    $r['email'] = strtolower(trim((string)($r['email'] ?? '')));
    if (!is_email($r['email'])) return ['email' => ['Enter a valid email address.']];
    if (blank($r['parent_name'] ?? '')) return required_err('parent_name');
    if (!is_phone($r['parent_mobile'] ?? '')) return ['parent_mobile' => ['Parent contact number must be 10 digits.']];
    if (blank($r['school_name'] ?? '')) return required_err('school_name');
    $r['username'] = trim((string)($r['username'] ?? ''));
    if (strlen($r['username']) < 3) return ['username' => ['ID must be at least 3 characters.']];
    if ($needPw && strlen((string)($r['password'] ?? '')) < 6) return ['password' => ['Password must be at least 6 characters.']];
    $r['biometric_id'] = trim((string)($r['biometric_id'] ?? ''));
    if ($r['biometric_id'] !== '' && val("SELECT COUNT(*) FROM registrations WHERE branch_id=? AND LOWER(biometric_id)=LOWER(?) AND id<>?", [$r['branch_id'], $r['biometric_id'], (int)$selfRegId]))
        return ['biometric_id' => ['This Biometric ID is already given to another student of this branch.']];
    return username_taken($r['username'], $r['email'], (int)$selfUserId);
}
function reg_insert($branch, $r) {
    $uid = make_user($branch, 'student', trim($r['name']), $r['email'], $r['username'], $r['mobile'], (string)$r['password'], 'Active');
    q("INSERT INTO registrations (branch_id,user_id,name,mobile,standard,target,medium,date_of_birth,email,parent_name,parent_mobile,school_name,biometric_id,status,registered_on) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'Active',?)",
        [$branch, $uid, trim($r['name']), $r['mobile'], $r['standard'], $r['target'], $r['medium'], $r['date_of_birth'], $r['email'], trim($r['parent_name']), $r['parent_mobile'], trim($r['school_name']), $r['biometric_id'] === '' ? null : $r['biometric_id'], today()]);
    return last_id();
}
const REG_FIELDS = ['name', 'mobile', 'standard', 'target', 'medium', 'date_of_birth', 'email', 'parent_name', 'parent_mobile', 'school_name', 'username', 'password', 'status', 'biometric_id'];

route('GET', '/registrations/', function () {
    $u = auth(DASH);
    return R(array_map('reg_out', rows(reg_select() . " WHERE 1=1" . sc_and('r.branch_id', $u) . " ORDER BY r.id")));
});
route('POST', '/registrations/', function () {
    $u = auth(DASH);
    $b = body();
    $branch = branch_for($u, $b);
    $r = pick($b, REG_FIELDS); $r['branch_id'] = $branch;
    if ($err = reg_validate($r, 0, 0, true)) fail(400, $err);
    $id = reg_insert($branch, $r);
    if (($b['status'] ?? '') === 'Inactive') { q("UPDATE registrations SET status='Inactive' WHERE id=?", [$id]); q("UPDATE users SET status='Inactive' WHERE id=(SELECT user_id FROM registrations WHERE id=?)", [$id]); }
    return R(reg_out(row(reg_select() . " WHERE r.id=?", [$id])), 201);
});
route('PATCH', '/registrations/:id/', function ($m) {
    $u = auth(DASH);
    $cur = row(reg_select() . " WHERE r.id=?" . sc_and('r.branch_id', $u), [$m[1]]);
    if (!$cur) fail(404, ['detail' => 'Not found.']);
    $upd = pick(body(), REG_FIELDS);
    if (array_key_exists('password', $upd) && $upd['password'] === '') unset($upd['password']);
    $r = array_merge($cur, $upd);
    $needPw = isset($upd['password']);
    if ($err = reg_validate($r, $cur['id'], $cur['user_id'], $needPw)) fail(400, $err);
    if (!in_array($r['status'], ['Active', 'Inactive'], true)) fail(400, ['status' => ['Choose Active or Inactive.']]);
    q("UPDATE registrations SET name=?,mobile=?,standard=?,target=?,medium=?,date_of_birth=?,email=?,parent_name=?,parent_mobile=?,school_name=?,biometric_id=?,status=? WHERE id=?",
        [trim($r['name']), $r['mobile'], $r['standard'], $r['target'], $r['medium'], $r['date_of_birth'], $r['email'], trim($r['parent_name']), $r['parent_mobile'], trim($r['school_name']), $r['biometric_id'] === '' ? null : $r['biometric_id'], $r['status'], $cur['id']]);
    q("UPDATE users SET name=?, email=?, username=?, mobile=?, status=? WHERE id=?", [trim($r['name']), $r['email'], $r['username'], $r['mobile'], $r['status'], $cur['user_id']]);
    if ($needPw) q("UPDATE users SET password_hash=? WHERE id=?", [password_hash($r['password'], PASSWORD_BCRYPT), $cur['user_id']]);
    return R(reg_out(row(reg_select() . " WHERE r.id=?", [$cur['id']])));
});
function delete_registration($id) {
    $reg = row("SELECT * FROM registrations WHERE id=?", [$id]);
    if (!$reg) return;
    foreach (rows("SELECT user_id FROM parents WHERE student_id=?", [$id]) as $p) q("DELETE FROM users WHERE id=?", [$p['user_id']]);
    q("DELETE FROM registrations WHERE id=?", [$id]);
    if ($reg['user_id']) q("DELETE FROM users WHERE id=?", [$reg['user_id']]);
}
route('DELETE', '/registrations/:id/', function ($m) {
    $u = auth(DASH);
    if (!row("SELECT id FROM registrations WHERE id=?" . sc_and('branch_id', $u), [$m[1]])) fail(404, ['detail' => 'Not found.']);
    delete_registration((int)$m[1]);
    return R('', 204);
});

route('POST', '/auth/register/', function () {
    $b = body();
    $branch = (int)($b['branch_id'] ?? 0);
    if (!$branch || !val("SELECT COUNT(*) FROM branches WHERE id=? AND status='Active'", [$branch])) fail(400, ['branch_id' => ['Select your branch.']]);
    $r = pick($b, REG_FIELDS); $r['branch_id'] = $branch;
    if ($err = reg_validate($r, 0, 0, true)) fail(400, $err);
    reg_insert($branch, $r);
    note($branch, "New registration: {$r['name']} ({$r['standard']}).");
    return R(['detail' => 'Account created.'], 201);
});

/* ---------- staff / trainers (users table) ---------- */
function staff_out($s) {
    return ['id' => (int)$s['id'], 'name' => $s['name'], 'role' => $s['role'], 'mobile' => $s['mobile'] ?? '', 'email' => preg_match('/@branch\.local$/', (string)$s['email']) ? '' : (string)$s['email'], 'username' => $s['username'], 'branch_id' => (int)$s['branch_id'], 'branch_name' => $s['branch_name'] ?? ''];
}
function staff_select() { return "SELECT u.*, b.name AS branch_name FROM users u LEFT JOIN branches b ON b.id=u.branch_id WHERE u.role IN ('admin','staff','trainer')"; }
function staff_validate($u, &$s, $selfId, $needPw) {
    if (blank($s['name'] ?? '')) return required_err('name');
    $allowed = $u['role'] === 'superadmin' ? ['staff', 'trainer', 'admin'] : ['staff', 'trainer'];
    if (!in_array($s['role'] ?? '', $allowed, true)) return ['role' => [$u['role'] === 'superadmin' ? 'Choose Staff, Trainer or Branch Admin.' : 'Choose Staff or Trainer.']];
    if (!blank($s['mobile'] ?? '') && !is_phone($s['mobile'])) return ['mobile' => ['Mobile number must be 10 digits.']];
    $s['email'] = strtolower(trim((string)($s['email'] ?? '')));
    if ($s['email'] !== '' && !is_email($s['email'])) return ['email' => ['Enter a valid email address.']];
    $s['username'] = trim((string)($s['username'] ?? ''));
    if (strlen($s['username']) < 3) return ['username' => ['ID must be at least 3 characters.']];
    if ($needPw && strlen((string)($s['password'] ?? '')) < 6) return ['password' => ['Password must be at least 6 characters.']];
    return username_taken($s['username'], $s['email'], (int)$selfId);
}
route('GET', '/staff/', function () {
    $u = auth(['superadmin', 'admin']);
    return R(array_map('staff_out', rows(staff_select() . sc_and('u.branch_id', $u) . " ORDER BY u.id")));
});
route('POST', '/staff/', function () {
    $u = auth(['superadmin', 'admin']);
    $b = body();
    $branch = branch_for($u, $b);
    $s = pick($b, ['name', 'role', 'mobile', 'email', 'username', 'password']);
    if ($err = staff_validate($u, $s, 0, true)) fail(400, $err);
    $id = make_user($branch, $s['role'], trim($s['name']), $s['email'], $s['username'], (string)($s['mobile'] ?? ''), $s['password']);
    return R(staff_out(row(staff_select() . " AND u.id=?", [$id])), 201);
});
route('PATCH', '/staff/:id/', function ($m) {
    $u = auth(['superadmin', 'admin']);
    $cur = row(staff_select() . " AND u.id=?" . sc_and('u.branch_id', $u), [$m[1]]);
    if (!$cur) fail(404, ['detail' => 'Not found.']);
    $upd = pick(body(), ['name', 'role', 'mobile', 'email', 'username', 'password']);
    if (array_key_exists('password', $upd) && $upd['password'] === '') unset($upd['password']);
    $s = array_merge($cur, $upd);
    if ($s['email'] !== null && preg_match('/@branch\.local$/', (string)$s['email']) && !isset($upd['email'])) $s['email'] = '';
    $needPw = isset($upd['password']);
    if ($err = staff_validate($u, $s, $cur['id'], $needPw)) fail(400, $err);
    q("UPDATE users SET name=?, role=?, mobile=?, email=?, username=? WHERE id=?", [trim($s['name']), $s['role'], (string)($s['mobile'] ?? ''), $s['email'] === '' ? null : $s['email'], $s['username'], $cur['id']]);
    if ($needPw) q("UPDATE users SET password_hash=? WHERE id=?", [password_hash($s['password'], PASSWORD_BCRYPT), $cur['id']]);
    return R(staff_out(row(staff_select() . " AND u.id=?", [$cur['id']])));
});
route('DELETE', '/staff/:id/', function ($m) {
    $u = auth(['superadmin', 'admin']);
    if ((int)$m[1] === $u['id']) fail(400, ['detail' => 'You cannot delete your own account.']);
    if (!row(staff_select() . " AND u.id=?" . sc_and('u.branch_id', $u), [$m[1]])) fail(404, ['detail' => 'Not found.']);
    q("DELETE FROM users WHERE id=?", [$m[1]]);
    return R('', 204);
});

/* ---------- parents ---------- */
function parent_select() {
    return "SELECT p.id, p.student_id, p.branch_id, us.name, us.mobile, us.email, us.username, b.name AS branch_name FROM parents p JOIN users us ON us.id=p.user_id LEFT JOIN branches b ON b.id=p.branch_id";
}
function parent_out($p) {
    return ['id' => (int)$p['id'], 'name' => $p['name'], 'mobile' => $p['mobile'] ?? '', 'email' => $p['email'] ?? '', 'student_id' => $p['student_id'] ? (int)$p['student_id'] : null, 'username' => $p['username'], 'branch_id' => (int)$p['branch_id'], 'branch_name' => $p['branch_name'] ?? ''];
}
function parent_validate($u, &$p, $selfUserId, $needPw) {
    if (blank($p['name'] ?? '')) return required_err('name');
    if (!blank($p['mobile'] ?? '') && !is_phone($p['mobile'])) return ['mobile' => ['Mobile number must be 10 digits.']];
    $p['email'] = strtolower(trim((string)($p['email'] ?? '')));
    if ($p['email'] !== '' && !is_email($p['email'])) return ['email' => ['Enter a valid email address.']];
    if (!val("SELECT COUNT(*) FROM registrations WHERE id=?" . sc_and('branch_id', $u), [(int)($p['student_id'] ?? 0)])) return ['student_id' => ['Choose a registered student.']];
    $p['username'] = trim((string)($p['username'] ?? ''));
    if (strlen($p['username']) < 3) return ['username' => ['ID must be at least 3 characters.']];
    if ($needPw && strlen((string)($p['password'] ?? '')) < 6) return ['password' => ['Password must be at least 6 characters.']];
    return username_taken($p['username'], $p['email'], (int)$selfUserId);
}
route('GET', '/parents/', function () {
    $u = auth(['superadmin', 'admin']);
    return R(array_map('parent_out', rows(parent_select() . " WHERE 1=1" . sc_and('p.branch_id', $u) . " ORDER BY p.id")));
});
route('POST', '/parents/', function () {
    $u = auth(['superadmin', 'admin']);
    $b = body();
    $p = pick($b, ['name', 'mobile', 'email', 'student_id', 'username', 'password']);
    if ($err = parent_validate($u, $p, 0, true)) fail(400, $err);
    $branch = (int)val("SELECT branch_id FROM registrations WHERE id=?", [(int)$p['student_id']]);
    $uid = make_user($branch, 'parent', trim($p['name']), $p['email'], $p['username'], (string)($p['mobile'] ?? ''), $p['password']);
    q("INSERT INTO parents (user_id,branch_id,student_id) VALUES (?,?,?)", [$uid, $branch, (int)$p['student_id']]);
    return R(parent_out(row(parent_select() . " WHERE p.id=?", [last_id()])), 201);
});
route('PATCH', '/parents/:id/', function ($m) {
    $u = auth(['superadmin', 'admin']);
    $cur = row(parent_select() . " WHERE p.id=?" . sc_and('p.branch_id', $u), [$m[1]]);
    if (!$cur) fail(404, ['detail' => 'Not found.']);
    $userId = (int)val("SELECT user_id FROM parents WHERE id=?", [$cur['id']]);
    $upd = pick(body(), ['name', 'mobile', 'email', 'student_id', 'username', 'password']);
    if (array_key_exists('password', $upd) && $upd['password'] === '') unset($upd['password']);
    $p = array_merge($cur, $upd);
    $needPw = isset($upd['password']);
    if ($err = parent_validate($u, $p, $userId, $needPw)) fail(400, $err);
    q("UPDATE users SET name=?, mobile=?, email=?, username=? WHERE id=?", [trim($p['name']), (string)($p['mobile'] ?? ''), $p['email'] === '' ? null : $p['email'], $p['username'], $userId]);
    if ($needPw) q("UPDATE users SET password_hash=? WHERE id=?", [password_hash($p['password'], PASSWORD_BCRYPT), $userId]);
    q("UPDATE parents SET student_id=? WHERE id=?", [(int)$p['student_id'], $cur['id']]);
    return R(parent_out(row(parent_select() . " WHERE p.id=?", [$cur['id']])));
});
route('DELETE', '/parents/:id/', function ($m) {
    $u = auth(['superadmin', 'admin']);
    $p = row("SELECT user_id FROM parents WHERE id=?" . sc_and('branch_id', $u), [$m[1]]);
    if (!$p) fail(404, ['detail' => 'Not found.']);
    q("DELETE FROM users WHERE id=?", [$p['user_id']]);
    return R('', 204);
});

/* ---------- branches (white-label) ---------- */
function branch_counts($b) {
    $id = (int)$b['id'];
    $b['student_count'] = (int)val("SELECT COUNT(*) FROM registrations WHERE branch_id=?", [$id]);
    $b['course_count'] = (int)val("SELECT COUNT(*) FROM courses WHERE branch_id=?", [$id]);
    $b['staff_count'] = (int)val("SELECT COUNT(*) FROM users WHERE branch_id=? AND role IN ('admin','staff','trainer')", [$id]);
    $b['test_count'] = (int)val("SELECT COUNT(*) FROM tests WHERE branch_id=?", [$id]);
    $b['domain'] = $b['domain'] ?? '';
    $b['id'] = $id;
    unset($b['created_at']);
    return $b;
}
route('GET', '/branches/public/', function () {
    return R(array_map(function ($b) { $b['id'] = (int)$b['id']; $b['domain'] = $b['domain'] ?? ''; return $b; },
        rows("SELECT id,code,name,city,brand_name,institute_name,tagline,logo,primary_color,dark_color,domain,phone,email FROM branches WHERE status='Active' ORDER BY id")));
});
const BRANCH_FIELDS = ['name', 'code', 'city', 'address', 'phone', 'email', 'brand_name', 'institute_name', 'tagline', 'logo', 'primary_color', 'dark_color', 'domain', 'status'];
function branch_validate(&$b, $self, $body) {
    if (blank($b['name'] ?? '')) return required_err('name');
    $b['code'] = strtolower(trim((string)($b['code'] ?? '')));
    if (!preg_match('/^[a-z0-9-]{2,20}$/', $b['code'])) return ['code' => ['Branch code: 2-20 letters, digits or hyphen (used in the branch link).']];
    if (val("SELECT COUNT(*) FROM branches WHERE code=? AND id<>?", [$b['code'], (int)$self])) return ['code' => ['This branch code is already used.']];
    if (blank($b['brand_name'] ?? '')) return required_err('brand_name');
    if (!preg_match('/^#[0-9a-f]{6}$/i', (string)($b['primary_color'] ?? '')) || !preg_match('/^#[0-9a-f]{6}$/i', (string)($b['dark_color'] ?? ''))) return ['primary_color' => ['Choose valid colours.']];
    if (strlen((string)($b['logo'] ?? '')) > 400000) return ['logo' => ['Logo is too large (max about 250 KB).']];
    if (!blank($b['email'] ?? '') && !is_email($b['email'])) return ['email' => ['Enter a valid email address.']];
    $b['domain'] = strtolower(trim((string)($b['domain'] ?? '')));
    $b['domain'] = preg_replace('#^https?://#', '', $b['domain']);
    $b['domain'] = preg_replace('#/.*$#', '', $b['domain']);
    if ($b['domain'] !== '' && val("SELECT COUNT(*) FROM branches WHERE domain=? AND id<>?", [$b['domain'], (int)$self])) return ['domain' => ['This domain is already used by another branch.']];
    if (!in_array($b['status'] ?? '', ['Active', 'Inactive'], true)) return ['status' => ['Choose Active or Inactive.']];
    if (!$self && !blank($body['admin_username'] ?? '')) {
        if (blank($body['admin_name'] ?? '')) return ['admin_name' => ['Enter the branch admin name.']];
        if (strlen(trim($body['admin_username'])) < 3) return ['admin_username' => ['Admin ID must be at least 3 characters.']];
        if (strlen((string)($body['admin_password'] ?? '')) < 6) return ['admin_password' => ['Admin password must be at least 6 characters.']];
        return username_taken(trim($body['admin_username']), strtolower(trim((string)($body['admin_email'] ?? ''))), 0);
    }
    return null;
}
route('GET', '/branches/', function () {
    auth(['superadmin']);
    return R(array_map('branch_counts', rows("SELECT * FROM branches ORDER BY id")));
});
route('POST', '/branches/', function () {
    auth(['superadmin']);
    $body = body();
    $b = array_merge(['status' => 'Active', 'logo' => '', 'tagline' => '', 'domain' => '', 'primary_color' => '#2563eb', 'dark_color' => '#0a2463', 'city' => '', 'address' => '', 'phone' => '', 'email' => '', 'institute_name' => ''], pick($body, BRANCH_FIELDS));
    if ($err = branch_validate($b, 0, $body)) fail(400, $err);
    db()->beginTransaction();
    q("INSERT INTO branches (name,code,city,address,phone,email,brand_name,institute_name,tagline,logo,primary_color,dark_color,domain,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [trim($b['name']), $b['code'], $b['city'], $b['address'], $b['phone'], $b['email'], $b['brand_name'], $b['institute_name'], $b['tagline'], $b['logo'], $b['primary_color'], $b['dark_color'], $b['domain'] === '' ? null : $b['domain'], $b['status']]);
    $id = last_id();
    q("INSERT INTO settings (branch_id,institute,email,phone) VALUES (?,?,?,?)", [$id, $b['institute_name'] ?: $b['name'], $b['email'], $b['phone']]);
    if (!blank($body['admin_username'] ?? '')) {
        $un = trim($body['admin_username']);
        $em = strtolower(trim((string)($body['admin_email'] ?? '')));
        make_user($id, 'admin', trim($body['admin_name']), $em !== '' ? $em : $un . '@branch.local', $un, '', $body['admin_password']);
    }
    db()->commit();
    return R(branch_counts(row("SELECT * FROM branches WHERE id=?", [$id])), 201);
});
route('PATCH', '/branches/:id/', function ($m) {
    auth(['superadmin']);
    $cur = row("SELECT * FROM branches WHERE id=?", [$m[1]]);
    if (!$cur) fail(404, ['detail' => 'Not found.']);
    $b = array_merge($cur, pick(body(), BRANCH_FIELDS));
    if ($err = branch_validate($b, $cur['id'], [])) fail(400, $err);
    q("UPDATE branches SET name=?,code=?,city=?,address=?,phone=?,email=?,brand_name=?,institute_name=?,tagline=?,logo=?,primary_color=?,dark_color=?,domain=?,status=? WHERE id=?",
        [trim($b['name']), $b['code'], $b['city'], $b['address'], $b['phone'], $b['email'], $b['brand_name'], $b['institute_name'], $b['tagline'], $b['logo'], $b['primary_color'], $b['dark_color'], $b['domain'] === '' ? null : $b['domain'], $b['status'], $cur['id']]);
    return R(branch_counts(row("SELECT * FROM branches WHERE id=?", [$cur['id']])));
});
route('DELETE', '/branches/:id/', function ($m) {
    auth(['superadmin']);
    $id = (int)$m[1];
    if (!row("SELECT id FROM branches WHERE id=?", [$id])) fail(404, ['detail' => 'Not found.']);
    if ((int)val("SELECT COUNT(*) FROM branches") <= 1) fail(400, ['detail' => 'At least one branch must exist.']);
    $busy = 0;
    foreach (['registrations', 'courses', 'tests', 'batches', 'materials'] as $t) $busy += (int)val("SELECT COUNT(*) FROM $t WHERE branch_id=?", [$id]);
    $busy += (int)val("SELECT COUNT(*) FROM users WHERE branch_id=? AND role IN ('staff','trainer')", [$id]);
    if ($busy) fail(400, ['detail' => 'This branch still has students, staff, courses or tests. Deactivate it instead of deleting.']);
    q("DELETE FROM users WHERE branch_id=? AND role='admin'", [$id]);
    q("DELETE FROM settings WHERE branch_id=?", [$id]);
    q("DELETE FROM branches WHERE id=?", [$id]);
    return R('', 204);
});
