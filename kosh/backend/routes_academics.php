<?php
/* question bank, papers, study material, LMS courses */

/* ---------- questions ---------- */
function q_out($x) {
    return ['id' => (int)$x['id'], 'standard' => $x['standard'], 'subject' => $x['subject'], 'chapter' => $x['chapter'], 'type' => $x['type'],
        'question' => $x['question'], 'options' => json_decode($x['options'] ?: '[]', true), 'answer' => $x['answer'] === null ? null : (int)$x['answer'],
        'model_answer' => (string)($x['model_answer'] ?? ''), 'marks' => fnum($x['marks'])];
}
const Q_FIELDS = ['standard', 'subject', 'chapter', 'type', 'question', 'options', 'answer', 'model_answer', 'marks'];
function q_validate(&$x) {
    if (blank($x['standard'] ?? '')) return required_err('standard');
    if (blank($x['subject'] ?? '')) return required_err('subject');
    if (blank($x['question'] ?? '')) return required_err('question');
    $x['type'] = $x['type'] ?? 'MCQ';
    if (!in_array($x['type'], ['MCQ', 'Subjective'], true)) return ['type' => ['Choose MCQ or Subjective.']];
    if (!((float)($x['marks'] ?? 0) > 0)) return ['marks' => ['Marks must be greater than 0.']];
    $x['marks'] = (float)$x['marks'];
    $x['chapter'] = (string)($x['chapter'] ?? '');
    if ($x['type'] === 'Subjective') { $x['options'] = []; $x['answer'] = null; return null; }
    $o = $x['options'] ?? null;
    if (!is_array($o) || count($o) !== 4) return ['options' => ['Fill all 4 options.']];
    foreach ($o as $v) if (blank($v)) return ['options' => ['Fill all 4 options.']];
    $x['options'] = array_values($o);
    if (!in_array((int)($x['answer'] ?? -1), [0, 1, 2, 3], true) || !isset($x['answer']) || $x['answer'] === '') return ['answer' => ['Choose the correct answer.']];
    $x['answer'] = (int)$x['answer'];
    return null;
}
route('GET', '/questions/', function () {
    auth(DASH);
    return R(array_map('q_out', rows("SELECT * FROM questions ORDER BY id")));
});
route('POST', '/questions/', function () {
    $u = auth(DASH);
    $x = array_merge(['type' => 'MCQ', 'chapter' => '', 'model_answer' => ''], pick(body(), Q_FIELDS));
    if ($err = q_validate($x)) fail(400, $err);
    q("INSERT INTO questions (branch_id,standard,subject,chapter,type,question,options,answer,model_answer,marks) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [$u['sc'] ?: 1, $x['standard'], $x['subject'], $x['chapter'], $x['type'], trim($x['question']), json_encode($x['options'], JSON_UNESCAPED_UNICODE), $x['answer'], (string)($x['model_answer'] ?? ''), $x['marks']]);
    return R(q_out(row("SELECT * FROM questions WHERE id=?", [last_id()])), 201);
});
route('PATCH', '/questions/:id/', function ($m) {
    auth(DASH);
    $cur = row("SELECT * FROM questions WHERE id=?", [$m[1]]);
    if (!$cur) fail(404, ['detail' => 'Not found.']);
    $cur['options'] = json_decode($cur['options'] ?: '[]', true);
    $x = array_merge($cur, pick(body(), Q_FIELDS));
    if ($err = q_validate($x)) fail(400, $err);
    q("UPDATE questions SET standard=?,subject=?,chapter=?,type=?,question=?,options=?,answer=?,model_answer=?,marks=? WHERE id=?",
        [$x['standard'], $x['subject'], $x['chapter'], $x['type'], trim($x['question']), json_encode($x['options'], JSON_UNESCAPED_UNICODE), $x['answer'], (string)($x['model_answer'] ?? ''), $x['marks'], $cur['id']]);
    return R(q_out(row("SELECT * FROM questions WHERE id=?", [$cur['id']])));
});
route('DELETE', '/questions/:id/', function ($m) {
    auth(DASH);
    if (!row("SELECT id FROM questions WHERE id=?", [$m[1]])) fail(404, ['detail' => 'Not found.']);
    q("DELETE FROM questions WHERE id=?", [$m[1]]);
    return R('', 204);
});

/* ---------- papers ---------- */
function paper_out($p) {
    $ids = array_map('intval', array_column(rows("SELECT question_id FROM paper_questions WHERE paper_id=? ORDER BY sort_order", [$p['id']]), 'question_id'));
    $total = val("SELECT COALESCE(SUM(q.marks),0) FROM paper_questions pq JOIN questions q ON q.id=pq.question_id WHERE pq.paper_id=?", [$p['id']]);
    return ['id' => (int)$p['id'], 'title' => $p['title'], 'standard' => $p['standard'], 'subject' => $p['subject'], 'duration' => (int)$p['duration'], 'status' => $p['status'], 'question_ids' => $ids, 'created_on' => $p['created_on'], 'total_marks' => (float)$total];
}
function paper_validate(&$p) {
    if (blank($p['title'] ?? '')) return required_err('title');
    if (blank($p['standard'] ?? '')) return required_err('standard');
    if (blank($p['subject'] ?? '')) return required_err('subject');
    if (!((int)($p['duration'] ?? 0) >= 1)) return ['duration' => ['Duration must be at least 1 minute.']];
    $p['duration'] = (int)$p['duration'];
    if (!in_array($p['status'] ?? '', ['Draft', 'Published'], true)) $p['status'] = 'Draft';
    $ids = array_values(array_map('intval', is_array($p['question_ids'] ?? null) ? $p['question_ids'] : []));
    if (!$ids) return ['question_ids' => ['Select at least one question.']];
    $uniq = array_values(array_unique($ids));
    $n = (int)val("SELECT COUNT(*) FROM questions WHERE standard=? AND subject=? AND id IN (" . ph(count($uniq)) . ")", array_merge([$p['standard'], $p['subject']], $uniq));
    if ($n !== count($uniq)) return ['question_ids' => ['All questions must belong to the same standard and subject.']];
    $p['question_ids'] = $uniq;
    return null;
}
function paper_save_questions($id, $ids) {
    q("DELETE FROM paper_questions WHERE paper_id=?", [$id]);
    foreach ($ids as $i => $qid) q("INSERT INTO paper_questions (paper_id,question_id,sort_order) VALUES (?,?,?)", [$id, $qid, $i]);
}
route('GET', '/papers/', function () {
    auth(DASH);
    return R(array_map('paper_out', rows("SELECT * FROM papers ORDER BY id")));
});
route('POST', '/papers/', function () {
    $u = auth(DASH);
    $p = array_merge(['status' => 'Draft'], pick(body(), ['title', 'standard', 'subject', 'duration', 'status', 'question_ids']));
    if ($err = paper_validate($p)) fail(400, $err);
    q("INSERT INTO papers (branch_id,title,standard,subject,duration,status,created_on) VALUES (?,?,?,?,?,?,?)", [$u['sc'] ?: 1, trim($p['title']), $p['standard'], $p['subject'], $p['duration'], $p['status'], today()]);
    $id = last_id();
    paper_save_questions($id, $p['question_ids']);
    return R(paper_out(row("SELECT * FROM papers WHERE id=?", [$id])), 201);
});
route('PATCH', '/papers/:id/', function ($m) {
    auth(DASH);
    $cur = row("SELECT * FROM papers WHERE id=?", [$m[1]]);
    if (!$cur) fail(404, ['detail' => 'Not found.']);
    $cur['question_ids'] = array_column(rows("SELECT question_id FROM paper_questions WHERE paper_id=? ORDER BY sort_order", [$cur['id']]), 'question_id');
    $p = array_merge($cur, pick(body(), ['title', 'standard', 'subject', 'duration', 'status', 'question_ids']));
    if ($err = paper_validate($p)) fail(400, $err);
    q("UPDATE papers SET title=?,standard=?,subject=?,duration=?,status=? WHERE id=?", [trim($p['title']), $p['standard'], $p['subject'], $p['duration'], $p['status'], $cur['id']]);
    paper_save_questions($cur['id'], $p['question_ids']);
    return R(paper_out(row("SELECT * FROM papers WHERE id=?", [$cur['id']])));
});
route('DELETE', '/papers/:id/', function ($m) {
    auth(DASH);
    if (!row("SELECT id FROM papers WHERE id=?", [$m[1]])) fail(404, ['detail' => 'Not found.']);
    q("DELETE FROM papers WHERE id=?", [$m[1]]);
    return R('', 204);
});

/* ---------- study material ---------- */
function mat_out($m) {
    $bids = array_map('intval', array_column(rows("SELECT batch_id FROM material_batches WHERE material_id=? ORDER BY batch_id", [$m['id']]), 'batch_id'));
    return ['id' => (int)$m['id'], 'branch_id' => (int)$m['branch_id'], 'title' => $m['title'], 'standard' => $m['standard'], 'subject' => $m['subject'], 'kind' => $m['kind'], 'description' => $m['description'], 'url' => $m['url'],
        'file_name' => $m['file_name'], 'file_url' => $m['file_path'] ? base_url() . '/uploads/' . rawurlencode($m['file_path']) : '', 'created_on' => $m['created_on'], 'batch_ids' => $bids];
}
function mat_batch_ids($b) {
    if (isset($b['batch_ids_json'])) { $j = json_decode($b['batch_ids_json'], true); return ids_arr(is_array($j) ? $j : []); }
    return ids_arr($b['batch_ids'] ?? []);
}
function mat_upload() {
    if (!isset($_FILES['file']) || $_FILES['file']['error'] === UPLOAD_ERR_NO_FILE) return null;
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) fail(400, ['file' => ['Upload failed (file too large for the server? check php.ini upload_max_filesize).']]);
    if ($f['size'] > MAX_UPLOAD_BYTES) fail(400, ['file' => ['File is too large (max 20 MB).']]);
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, explode(',', UPLOAD_EXT), true)) fail(400, ['file' => ['Allowed files: ' . UPLOAD_EXT . '.']]);
    $stored = bin2hex(random_bytes(12)) . '.' . $ext;
    if (!is_dir(__DIR__ . '/uploads')) @mkdir(__DIR__ . '/uploads', 0755, true);
    if (!move_uploaded_file($f['tmp_name'], __DIR__ . '/uploads/' . $stored)) fail(500, ['detail' => 'Could not save the file. Check that backend/uploads is writable.']);
    return [$stored, mb_substr(basename($f['name']), 0, 200)];
}
function mat_validate(&$m, $hasFile) {
    if (blank($m['title'] ?? '')) return required_err('title');
    if (blank($m['standard'] ?? '')) return required_err('standard');
    if (blank($m['subject'] ?? '')) return required_err('subject');
    if (!in_array($m['kind'] ?? '', ['Note', 'Video'], true)) return ['kind' => ['Choose Note or Video.']];
    if ($m['kind'] === 'Video' && !preg_match('#^https?://\S+\.\S+#i', trim((string)($m['url'] ?? '')))) return ['url' => ['Enter a valid video link starting with http:// or https://']];
    if ($m['kind'] === 'Note' && !$hasFile) return ['file' => ['Choose a file to upload.']];
    $m['title'] = trim($m['title']);
    return null;
}
function mat_save_batches($id, $ids) {
    q("DELETE FROM material_batches WHERE material_id=?", [$id]);
    foreach ($ids as $b) q("INSERT IGNORE INTO material_batches (material_id,batch_id) VALUES (?,?)", [$id, $b]);
}
route('GET', '/materials/', function () {
    $u = auth(DASH);
    return R(array_map('mat_out', rows("SELECT * FROM materials WHERE 1=1" . sc_and('branch_id', $u) . " ORDER BY id")));
});
route('POST', '/materials/', function () {
    $u = auth(DASH);
    $body = body();
    $m = array_merge(['description' => '', 'url' => ''], pick($body, ['title', 'standard', 'subject', 'kind', 'description', 'url']));
    $up = mat_upload();
    if ($err = mat_validate($m, (bool)$up)) fail(400, $err);
    $branch = branch_for($u, $body);
    $isNote = $m['kind'] === 'Note';
    q("INSERT INTO materials (branch_id,title,standard,subject,kind,description,url,file_name,file_path,created_on) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [$branch, $m['title'], $m['standard'], $m['subject'], $m['kind'], mb_substr((string)$m['description'], 0, 500), $isNote ? '' : trim($m['url']), $isNote ? $up[1] : '', $isNote ? $up[0] : '', today()]);
    $id = last_id();
    mat_save_batches($id, mat_batch_ids($body));
    return R(mat_out(row("SELECT * FROM materials WHERE id=?", [$id])), 201);
});
route('PATCH', '/materials/:id/', function ($m) {
    $u = auth(DASH);
    $cur = row("SELECT * FROM materials WHERE id=?" . sc_and('branch_id', $u), [$m[1]]);
    if (!$cur) fail(404, ['detail' => 'Not found.']);
    $body = body();
    $x = array_merge($cur, pick($body, ['title', 'standard', 'subject', 'kind', 'description', 'url']));
    $up = mat_upload();
    if ($err = mat_validate($x, (bool)$up || $cur['file_path'] !== '')) fail(400, $err);
    $file = $cur['file_path']; $fname = $cur['file_name'];
    if ($x['kind'] === 'Video') { if ($file) @unlink(__DIR__ . '/uploads/' . $file); $file = ''; $fname = ''; }
    elseif ($up) { if ($file) @unlink(__DIR__ . '/uploads/' . $file); $file = $up[0]; $fname = $up[1]; $x['url'] = ''; }
    else { $x['url'] = ''; }
    q("UPDATE materials SET title=?,standard=?,subject=?,kind=?,description=?,url=?,file_name=?,file_path=? WHERE id=?",
        [$x['title'], $x['standard'], $x['subject'], $x['kind'], mb_substr((string)$x['description'], 0, 500), $x['kind'] === 'Video' ? trim($x['url']) : '', $fname, $file, $cur['id']]);
    if (isset($body['batch_ids']) || isset($body['batch_ids_json'])) mat_save_batches($cur['id'], mat_batch_ids($body));
    return R(mat_out(row("SELECT * FROM materials WHERE id=?", [$cur['id']])));
});
route('DELETE', '/materials/:id/', function ($m) {
    $u = auth(DASH);
    $cur = row("SELECT * FROM materials WHERE id=?" . sc_and('branch_id', $u), [$m[1]]);
    if (!$cur) fail(404, ['detail' => 'Not found.']);
    if ($cur['file_path']) @unlink(__DIR__ . '/uploads/' . $cur['file_path']);
    q("DELETE FROM materials WHERE id=?", [$cur['id']]);
    return R('', 204);
});

/* ---------- LMS courses ---------- */
function course_lessons($cid) {
    return array_map(function ($l) { return ['id' => (int)$l['id'], 'title' => $l['title'], 'chapter' => $l['chapter'], 'kind' => $l['kind'], 'url' => $l['url'], 'minutes' => (int)$l['minutes'], 'when' => $l['when_text']]; },
        rows("SELECT * FROM lessons WHERE course_id=? ORDER BY sort_order, id", [$cid]));
}
function course_learners($c) {
    return rows("SELECT id, name, standard, target FROM registrations WHERE status='Active' AND branch_id=? AND standard=? AND (?='' OR target=?) ORDER BY id", [$c['branch_id'], $c['standard'], $c['target'], $c['target']]);
}
function course_out($c) {
    $lessons = course_lessons($c['id']);
    $learners = course_learners($c);
    $done = [];
    foreach (rows("SELECT student_id, COUNT(*) AS n FROM course_progress WHERE course_id=? GROUP BY student_id", [$c['id']]) as $r) $done[(int)$r['student_id']] = (int)$r['n'];
    $avg = 0;
    if ($learners && $lessons) { $sum = 0; foreach ($learners as $l) $sum += round(($done[(int)$l['id']] ?? 0) / count($lessons) * 100); $avg = (int)round($sum / count($learners)); }
    return ['id' => (int)$c['id'], 'branch_id' => (int)$c['branch_id'], 'branch_name' => $c['branch_name'] ?? '', 'title' => $c['title'], 'standard' => $c['standard'], 'target' => $c['target'], 'subject' => $c['subject'],
        'description' => (string)$c['description'], 'status' => $c['status'], 'lessons' => $lessons, 'created_on' => $c['created_on'], 'lesson_count' => count($lessons), 'learner_count' => count($learners), 'avg_progress' => $avg];
}
function course_select() { return "SELECT c.*, b.name AS branch_name FROM courses c LEFT JOIN branches b ON b.id=c.branch_id"; }
function course_validate(&$c) {
    if (blank($c['title'] ?? '')) return required_err('title');
    if (blank($c['standard'] ?? '')) return required_err('standard');
    if (!in_array($c['standard'], TARGET_STANDARDS, true)) $c['target'] = '';
    if (blank($c['subject'] ?? '')) return required_err('subject');
    if (!in_array($c['status'] ?? '', ['Published', 'Draft'], true)) return ['status' => ['Choose Published or Draft.']];
    $out = [];
    foreach (is_array($c['lessons'] ?? null) ? $c['lessons'] : [] as $l) {
        if (blank($l['title'] ?? '')) return ['lessons' => ['Every lesson needs a title.']];
        if (!in_array($l['kind'] ?? '', ['Video', 'Notes', 'Live class', 'Practice'], true)) return ['lessons' => ["Lesson \"{$l['title']}\": choose a valid type."]];
        $url = trim((string)($l['url'] ?? ''));
        if (in_array($l['kind'], ['Video', 'Notes'], true) && $url !== '' && !preg_match('#^https?://\S+\.\S+#i', $url)) return ['lessons' => ["Lesson \"{$l['title']}\": the link must start with http:// or https://"]];
        $out[] = ['id' => (int)($l['id'] ?? 0), 'title' => trim($l['title']), 'chapter' => trim((string)($l['chapter'] ?? '')), 'kind' => $l['kind'], 'url' => $url, 'minutes' => (int)($l['minutes'] ?? 0), 'when' => trim((string)($l['when'] ?? ''))];
    }
    $c['lessons'] = $out;
    $c['title'] = trim($c['title']);
    return null;
}
/* keeps lessons that already exist (so progress is kept), adds new ones, removes the ones that were dropped */
function course_save_lessons($cid, $lessons) {
    $existing = array_map('intval', array_column(rows("SELECT id FROM lessons WHERE course_id=?", [$cid]), 'id'));
    $keep = [];
    foreach ($lessons as $i => $l) {
        if ($l['id'] && in_array($l['id'], $existing, true)) {
            q("UPDATE lessons SET title=?,chapter=?,kind=?,url=?,minutes=?,when_text=?,sort_order=? WHERE id=? AND course_id=?", [$l['title'], $l['chapter'], $l['kind'], $l['url'], $l['minutes'], $l['when'], $i, $l['id'], $cid]);
            $keep[] = $l['id'];
        } else {
            q("INSERT INTO lessons (course_id,title,chapter,kind,url,minutes,when_text,sort_order) VALUES (?,?,?,?,?,?,?,?)", [$cid, $l['title'], $l['chapter'], $l['kind'], $l['url'], $l['minutes'], $l['when'], $i]);
            $keep[] = last_id();
        }
    }
    foreach ($existing as $id) if (!in_array($id, $keep, true)) q("DELETE FROM lessons WHERE id=?", [$id]);
}
route('GET', '/courses/', function () {
    $u = auth(DASH);
    return R(array_map('course_out', rows(course_select() . " WHERE 1=1" . sc_and('c.branch_id', $u) . " ORDER BY c.id")));
});
route('POST', '/courses/', function () {
    $u = auth(DASH);
    $body = body();
    $c = array_merge(['status' => 'Draft', 'target' => '', 'description' => '', 'lessons' => []], pick($body, ['title', 'standard', 'target', 'subject', 'description', 'status', 'lessons']));
    $branch = branch_for($u, $body);
    if ($err = course_validate($c)) fail(400, $err);
    q("INSERT INTO courses (branch_id,title,standard,target,subject,description,status,created_on) VALUES (?,?,?,?,?,?,?,?)", [$branch, $c['title'], $c['standard'], (string)$c['target'], $c['subject'], (string)$c['description'], $c['status'], today()]);
    $id = last_id();
    course_save_lessons($id, $c['lessons']);
    return R(course_out(row(course_select() . " WHERE c.id=?", [$id])), 201);
});
route('PATCH', '/courses/:id/', function ($m) {
    $u = auth(DASH);
    $cur = row(course_select() . " WHERE c.id=?" . sc_and('c.branch_id', $u), [$m[1]]);
    if (!$cur) fail(404, ['detail' => 'Not found.']);
    $cur['lessons'] = course_lessons($cur['id']);
    $c = array_merge($cur, pick(body(), ['title', 'standard', 'target', 'subject', 'description', 'status', 'lessons']));
    if ($err = course_validate($c)) fail(400, $err);
    q("UPDATE courses SET title=?,standard=?,target=?,subject=?,description=?,status=? WHERE id=?", [$c['title'], $c['standard'], (string)$c['target'], $c['subject'], (string)$c['description'], $c['status'], $cur['id']]);
    course_save_lessons($cur['id'], $c['lessons']);
    return R(course_out(row(course_select() . " WHERE c.id=?", [$cur['id']])));
});
route('DELETE', '/courses/:id/', function ($m) {
    $u = auth(DASH);
    if (!row("SELECT id FROM courses WHERE id=?" . sc_and('branch_id', $u), [$m[1]])) fail(404, ['detail' => 'Not found.']);
    q("DELETE FROM courses WHERE id=?", [$m[1]]);
    return R('', 204);
});
route('GET', '/courses/:id/progress/', function ($m) {
    $u = auth(DASH);
    $c = row("SELECT * FROM courses WHERE id=?" . sc_and('branch_id', $u), [$m[1]]);
    if (!$c) fail(404, ['detail' => 'Not found.']);
    $total = (int)val("SELECT COUNT(*) FROM lessons WHERE course_id=?", [$c['id']]);
    $done = [];
    foreach (rows("SELECT student_id, COUNT(*) AS n FROM course_progress WHERE course_id=? GROUP BY student_id", [$c['id']]) as $r) $done[(int)$r['student_id']] = (int)$r['n'];
    $out = [];
    foreach (course_learners($c) as $l) {
        $d = $done[(int)$l['id']] ?? 0;
        $out[] = ['student_id' => (int)$l['id'], 'name' => $l['name'], 'standard' => $l['standard'], 'target' => $l['target'], 'done' => $d, 'total' => $total, 'percent' => $total ? (int)round($d / $total * 100) : 0];
    }
    usort($out, function ($a, $b) { return $b['percent'] <=> $a['percent']; });
    return R($out);
});
