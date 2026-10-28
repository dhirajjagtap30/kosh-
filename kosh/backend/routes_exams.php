<?php
/* tests (online exams), attempts, results, student exams, mock tests */

/* ---------- tests ---------- */
function test_note($t) {
    return 'New ' . ($t['type'] ?: 'test') . ': "' . $t['name'] . '" on ' . $t['date'] . ($t['duration'] ? ' (' . $t['duration'] . ' min)' : '') . '. Open the Tests tab to attempt it.';
}
function test_batch_ids($tid) { return array_map('intval', array_column(rows("SELECT batch_id FROM test_batches WHERE test_id=? ORDER BY batch_id", [$tid]), 'batch_id')); }
function test_out($t) {
    $p = $t['paper_id'] ? row("SELECT * FROM papers WHERE id=?", [$t['paper_id']]) : null;
    $qc = 0; $total = (float)$t['total_marks'];
    if ($p) {
        $qc = (int)val("SELECT COUNT(*) FROM paper_questions WHERE paper_id=?", [$p['id']]);
        $total = (float)val("SELECT COALESCE(SUM(q.marks),0) FROM paper_questions pq JOIN questions q ON q.id=pq.question_id WHERE pq.paper_id=?", [$p['id']]);
    }
    $bids = test_batch_ids($t['id']);
    $names = $bids ? array_column(rows("SELECT name FROM batches WHERE id IN (" . ph(count($bids)) . ") ORDER BY id", $bids), 'name') : [];
    return ['id' => (int)$t['id'], 'branch_id' => (int)$t['branch_id'], 'name' => $t['name'], 'type' => $t['type'], 'batch' => $t['batch'], 'date' => $t['date'], 'duration' => $p ? (int)$p['duration'] : (int)$t['duration'], 'total_marks' => $total,
        'status' => $t['status'], 'standard' => $t['standard'], 'paper_id' => $t['paper_id'] ? (int)$t['paper_id'] : null, 'paper_title' => $p ? $p['title'] : '', 'subject' => $p ? $p['subject'] : '', 'question_count' => $qc,
        'attempts' => (int)val("SELECT COUNT(*) FROM attempts WHERE test_id=?", [$t['id']]), 'batch_ids' => $bids, 'batch_names' => $names, 'result_announced' => (bool)$t['result_announced'],
        'pending_checks' => (int)val("SELECT COUNT(*) FROM attempts WHERE test_id=? AND pending_review=1", [$t['id']])];
}
function test_save_batches($tid, $ids) {
    q("DELETE FROM test_batches WHERE test_id=?", [$tid]);
    foreach ($ids as $b) q("INSERT INTO test_batches (test_id,batch_id) VALUES (?,?)", [$tid, $b]);
}
function batches_ok($standard, $branch, $ids) {
    if (!$ids) return true;
    return (int)val("SELECT COUNT(*) FROM batches WHERE standard=? AND branch_id=? AND id IN (" . ph(count($ids)) . ")", array_merge([$standard, $branch], $ids)) === count($ids);
}
function notify_test($t, $text) {
    return push_students(recipients((int)$t['branch_id'], $t['standard'], test_batch_ids($t['id'])), $text);
}
route('GET', '/tests/', function () {
    $u = auth(DASH);
    return R(array_map('test_out', rows("SELECT * FROM tests t WHERE 1=1" . sc_and('t.branch_id', $u) . " ORDER BY t.id")));
});
route('POST', '/tests/', function () {
    $u = auth(DASH);
    $b = body();
    if (blank($b['name'] ?? '')) fail(400, required_err('name'));
    if (blank($b['standard'] ?? '')) fail(400, ['standard' => ['Select the standard.']]);
    $branch = branch_for($u, $b);
    $paper = !empty($b['paper_id']) ? row("SELECT * FROM papers WHERE id=?", [(int)$b['paper_id']]) : null;
    if (!empty($b['paper_id']) && (!$paper || $paper['status'] !== 'Published' || $paper['standard'] !== $b['standard'])) fail(400, ['paper_id' => ['Choose a published question paper of the same standard.']]);
    if (!$paper && (!((int)($b['duration'] ?? 0) >= 1) || !((float)($b['total_marks'] ?? 0) >= 1))) fail(400, ['non_field_errors' => ['Duration and total marks must be at least 1.']]);
    $bids = ids_arr($b['batch_ids'] ?? []);
    if (!batches_ok($b['standard'], $branch, $bids)) fail(400, ['batch_ids' => ['Choose batches of the same standard.']]);
    $status = in_array($b['status'] ?? '', ['Draft', 'Scheduled', 'Completed'], true) ? $b['status'] : 'Scheduled';
    if (!is_date($b['date'] ?? '')) fail(400, ['date' => ['Choose a valid date.']]);
    q("INSERT INTO tests (branch_id,name,type,batch,standard,paper_id,date,duration,total_marks,status) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [$branch, trim($b['name']), (string)($b['type'] ?? ''), (string)($b['batch'] ?? ''), $b['standard'], $paper ? $paper['id'] : null, $b['date'], (int)($b['duration'] ?? 0), (float)($b['total_marks'] ?? 0), $status]);
    $id = last_id();
    test_save_batches($id, $bids);
    $t = row("SELECT * FROM tests WHERE id=?", [$id]);
    note($branch, "Test \"{$t['name']}\" created for Std {$t['standard']}.");
    if ($status !== 'Draft') notify_test($t, test_note($t));
    return R(test_out($t), 201);
});
route('PATCH', '/tests/:id/', function ($m) {
    $u = auth(DASH);
    $t = row("SELECT * FROM tests WHERE id=?" . sc_and('branch_id', $u), [$m[1]]);
    if (!$t) fail(404, ['detail' => 'Not found.']);
    $b = body();
    if (!empty($b['status'])) {
        if (!in_array($b['status'], ['Draft', 'Scheduled', 'Completed'], true)) fail(400, ['status' => ['Invalid status.']]);
        if ($t['status'] === 'Draft' && $b['status'] === 'Scheduled') notify_test($t, test_note($t));
        q("UPDATE tests SET status=? WHERE id=?", [$b['status'], $t['id']]);
    }
    if (array_key_exists('result_announced', $b)) {
        $new = ($b['result_announced'] === true || $b['result_announced'] === 1 || $b['result_announced'] === '1' || $b['result_announced'] === 'true') ? 1 : 0;
        q("UPDATE tests SET result_announced=? WHERE id=?", [$new, $t['id']]);
        if ($new) note($t['branch_id'], "Result of \"{$t['name']}\" announced to Std {$t['standard']}.");
        if ($new && !$t['result_announced']) notify_test($t, "Result of \"{$t['name']}\" is announced. Check your marks in the Tests tab.");
    }
    if (array_key_exists('batch_ids', $b)) {
        $ids = ids_arr($b['batch_ids']);
        if (!batches_ok($t['standard'], $t['branch_id'], $ids)) fail(400, ['batch_ids' => ['Choose batches of the same standard.']]);
        test_save_batches($t['id'], $ids);
    }
    return R(test_out(row("SELECT * FROM tests WHERE id=?", [$t['id']])));
});
route('DELETE', '/tests/:id/', function ($m) {
    $u = auth(DASH);
    if (!row("SELECT id FROM tests WHERE id=?" . sc_and('branch_id', $u), [$m[1]])) fail(404, ['detail' => 'Not found.']);
    q("DELETE FROM tests WHERE id=?", [$m[1]]);
    return R('', 204);
});
route('POST', '/tests/:id/reset/', function ($m) {
    $u = auth(DASH);
    $t = row("SELECT * FROM tests WHERE id=?" . sc_and('branch_id', $u), [$m[1]]);
    if (!$t) fail(404, ['detail' => 'Not found.']);
    q("DELETE FROM attempts WHERE test_id=?", [$t['id']]);
    q("UPDATE tests SET result_announced=0 WHERE id=?", [$t['id']]);
    return R(test_out(row("SELECT * FROM tests WHERE id=?", [$t['id']])));
});
route('POST', '/tests/:id/notify/', function ($m) {
    $u = auth(DASH);
    $t = row("SELECT * FROM tests WHERE id=?" . sc_and('branch_id', $u), [$m[1]]);
    if (!$t) fail(404, ['detail' => 'Not found.']);
    if ($t['status'] === 'Draft') fail(400, ['detail' => 'Publish the test first, then notify students.']);
    $sent = notify_test($t, test_note($t));
    if (!$sent) fail(400, ['detail' => "No active students found in Std {$t['standard']}" . (test_batch_ids($t['id']) ? ' (selected batches)' : '') . '.']);
    return R(['sent' => $sent]);
});

/* ---------- attempts ---------- */
function attempt_review($aid) {
    $out = [];
    foreach (rows("SELECT aa.*, q.type, q.question, q.options, q.answer, q.marks, q.model_answer FROM attempt_answers aa JOIN questions q ON q.id=aa.question_id WHERE aa.attempt_id=? ORDER BY aa.id", [$aid]) as $r) {
        if ($r['type'] === 'Subjective')
            $out[] = ['id' => (int)$r['question_id'], 'type' => 'Subjective', 'question' => $r['question'], 'options' => [], 'marks' => fnum($r['marks']), 'model_answer' => (string)$r['model_answer'], 'written' => (string)$r['written'], 'awarded' => fnum($r['awarded'])];
        else
            $out[] = ['id' => (int)$r['question_id'], 'type' => 'MCQ', 'question' => $r['question'], 'options' => json_decode($r['options'] ?: '[]', true), 'answer' => (int)$r['answer'], 'marks' => fnum($r['marks']), 'chosen' => $r['chosen'] === null ? null : (int)$r['chosen']];
    }
    return $out;
}
function score_attempt($aid) {
    $correct = $wrong = $un = 0; $mcq = $subj = $total = 0.0; $pending = 0;
    foreach (rows("SELECT aa.chosen, aa.awarded, q.type, q.answer, q.marks FROM attempt_answers aa JOIN questions q ON q.id=aa.question_id WHERE aa.attempt_id=?", [$aid]) as $r) {
        $total += (float)$r['marks'];
        if ($r['type'] === 'Subjective') { if ($r['awarded'] === null) $pending = 1; else $subj += (float)$r['awarded']; continue; }
        if ($r['chosen'] === null) $un++;
        elseif ((int)$r['chosen'] === (int)$r['answer']) { $correct++; $mcq += (float)$r['marks']; }
        else $wrong++;
    }
    q("UPDATE attempts SET correct=?,wrong=?,unattempted=?,mcq_score=?,subjective_score=?,score=?,total=?,pending_review=? WHERE id=?", [$correct, $wrong, $un, $mcq, $subj, $mcq + $subj, $total, $pending, $aid]);
}
function result_out($a, $t) {
    if (!$t['result_announced']) return ['id' => (int)$a['id'], 'exam_title' => $t['name'], 'announced' => false, 'date' => iso($a['submitted_on']), 'review' => []];
    return ['id' => (int)$a['id'], 'exam_title' => $t['name'], 'announced' => true, 'score' => fnum($a['score']), 'total' => fnum($a['total']), 'correct' => (int)$a['correct'], 'wrong' => (int)$a['wrong'], 'unattempted' => (int)$a['unattempted'],
        'mcq_score' => fnum($a['mcq_score']), 'subjective_score' => fnum($a['subjective_score']), 'date' => iso($a['submitted_on']), 'review' => attempt_review($a['id'])];
}
function exam_state($t) { return $t['status'] === 'Completed' ? 'Closed' : ($t['date'] > today() ? 'Scheduled' : 'Live'); }
function takeable_sql() {
    return "t.branch_id=? AND t.standard=? AND t.paper_id IS NOT NULL AND t.status<>'Draft' AND (NOT EXISTS (SELECT 1 FROM test_batches tb WHERE tb.test_id=t.id) OR EXISTS (SELECT 1 FROM test_batches tb JOIN batch_students bs ON bs.batch_id=tb.batch_id WHERE tb.test_id=t.id AND bs.student_id=?))";
}
function takeable_tests($reg) {
    return rows("SELECT t.* FROM tests t WHERE " . takeable_sql() . " ORDER BY t.date DESC, t.id DESC", [$reg['branch_id'], $reg['standard'], $reg['id']]);
}
function takeable_one($id, $reg) {
    $t = row("SELECT t.* FROM tests t WHERE t.id=? AND " . takeable_sql(), [$id, $reg['branch_id'], $reg['standard'], $reg['id']]);
    if (!$t) fail(404, ['detail' => 'Not found.']);
    return $t;
}
function paper_questions($paperId) {
    return rows("SELECT q.* FROM paper_questions pq JOIN questions q ON q.id=pq.question_id WHERE pq.paper_id=? ORDER BY pq.sort_order", [$paperId]);
}

/* ---------- student exams ---------- */
route('GET', '/student/exams/', function () {
    [$u, $reg] = me_student();
    $out = [];
    foreach (takeable_tests($reg) as $t) {
        $o = test_out($t);
        $a = row("SELECT * FROM attempts WHERE test_id=? AND student_id=?", [$t['id'], $reg['id']]);
        $my = null;
        if ($a) $my = $t['result_announced'] ? ['id' => (int)$a['id'], 'score' => fnum($a['score']), 'total' => fnum($a['total']), 'announced' => true] : ['id' => (int)$a['id'], 'announced' => false];
        $out[] = ['id' => (int)$t['id'], 'title' => $t['name'], 'date' => $t['date'], 'status' => exam_state($t), 'standard' => $t['standard'], 'subject' => $o['subject'], 'duration' => $o['duration'], 'question_count' => $o['question_count'],
            'total_marks' => $o['total_marks'], 'result_announced' => (bool)$t['result_announced'], 'my_attempt' => $my];
    }
    return R($out);
});
route('GET', '/student/exams/:id/questions/', function ($m) {
    [$u, $reg] = me_student();
    $t = takeable_one($m[1], $reg);
    if (row("SELECT id FROM attempts WHERE test_id=? AND student_id=?", [$t['id'], $reg['id']])) fail(409, ['detail' => 'You have already submitted this exam.']);
    $st = exam_state($t);
    if ($st !== 'Live') fail(403, ['detail' => $st === 'Closed' ? 'This exam is closed.' : "This exam starts on {$t['date']}."]);
    $p = row("SELECT * FROM papers WHERE id=?", [$t['paper_id']]);
    $qs = array_map(function ($q) { return ['id' => (int)$q['id'], 'type' => $q['type'], 'question' => $q['question'], 'options' => json_decode($q['options'] ?: '[]', true), 'marks' => fnum($q['marks'])]; }, paper_questions($t['paper_id']));
    return R(['title' => $t['name'], 'duration' => (int)$p['duration'], 'questions' => $qs]);
});
route('POST', '/student/exams/:id/submit/', function ($m) {
    [$u, $reg] = me_student();
    $t = takeable_one($m[1], $reg);
    if (row("SELECT id FROM attempts WHERE test_id=? AND student_id=?", [$t['id'], $reg['id']])) fail(409, ['detail' => 'You have already submitted this exam.']);
    if (exam_state($t) === 'Scheduled') fail(403, ['detail' => 'This exam has not started yet.']);
    $answers = body()['answers'] ?? [];
    if (!is_array($answers)) $answers = [];
    db()->beginTransaction();
    q("INSERT INTO attempts (test_id,student_id) VALUES (?,?)", [$t['id'], $reg['id']]);
    $aid = last_id();
    foreach (paper_questions($t['paper_id']) as $qq) {
        $g = $answers[$qq['id']] ?? null;
        if ($qq['type'] === 'Subjective') q("INSERT INTO attempt_answers (attempt_id,question_id,written,awarded) VALUES (?,?,?,NULL)", [$aid, $qq['id'], $g === null ? '' : (string)$g]);
        else q("INSERT INTO attempt_answers (attempt_id,question_id,chosen) VALUES (?,?,?)", [$aid, $qq['id'], ($g === null || $g === '' || !is_numeric($g)) ? null : (int)$g]);
    }
    score_attempt($aid);
    db()->commit();
    $a = row("SELECT * FROM attempts WHERE id=?", [$aid]);
    note($t['branch_id'], "{$reg['name']} submitted \"{$t['name']}\"" . ($a['pending_review'] ? ' - subjective answers need checking.' : " ({$a['score']}/{$a['total']})."));
    return R(result_out($a, $t), 201);
});
route('GET', '/student/exams/:id/result/', function ($m) {
    [$u, $reg] = me_student();
    $a = row("SELECT * FROM attempts WHERE test_id=? AND student_id=?", [$m[1], $reg['id']]);
    if (!$a) fail(404, ['detail' => 'No result yet.']);
    return R(result_out($a, row("SELECT * FROM tests WHERE id=?", [$m[1]])));
});

/* ---------- admin: exam results + checking ---------- */
function exam_result_out($a, $withReview) {
    $hasSubj = (bool)val("SELECT COUNT(*) FROM attempt_answers aa JOIN questions q ON q.id=aa.question_id WHERE aa.attempt_id=? AND q.type='Subjective'", [$a['id']]);
    $o = ['id' => (int)$a['id'], 'exam_id' => (int)$a['test_id'], 'exam_title' => $a['exam_title'], 'student_id' => (int)$a['student_id'], 'student_name' => $a['student_name'], 'standard' => $a['standard'],
        'score' => fnum($a['score']), 'total' => fnum($a['total']), 'correct' => (int)$a['correct'], 'wrong' => (int)$a['wrong'], 'unattempted' => (int)$a['unattempted'], 'submitted_on' => iso($a['submitted_on']),
        'mcq_score' => fnum($a['mcq_score']), 'subjective_score' => fnum($a['subjective_score']), 'pending_review' => (bool)$a['pending_review'], 'has_subjective' => $hasSubj];
    if ($withReview) $o['review'] = attempt_review($a['id']);
    return $o;
}
function attempt_select() {
    return "SELECT a.*, t.name AS exam_title, r.name AS student_name, r.standard FROM attempts a JOIN tests t ON t.id=a.test_id JOIN registrations r ON r.id=a.student_id";
}
route('GET', '/exam-results/', function () {
    $u = auth(DASH);
    return R(array_map(function ($a) { return exam_result_out($a, false); }, rows(attempt_select() . " WHERE 1=1" . sc_and('t.branch_id', $u) . " ORDER BY a.id DESC")));
});
route('GET', '/exam-results/:id/', function ($m) {
    $u = auth(DASH);
    $a = row(attempt_select() . " WHERE a.id=?" . sc_and('t.branch_id', $u), [$m[1]]);
    if (!$a) fail(404, ['detail' => 'Not found.']);
    return R(exam_result_out($a, true));
});
route('PATCH', '/exam-results/:id/', function ($m) {
    $u = auth(DASH);
    $a = row(attempt_select() . " WHERE a.id=?" . sc_and('t.branch_id', $u), [$m[1]]);
    if (!$a) fail(404, ['detail' => 'Not found.']);
    $given = body()['marks'] ?? [];
    if (!is_array($given)) $given = [];
    foreach ($given as $qid => $v) {
        $r = row("SELECT aa.id, q.marks, q.question FROM attempt_answers aa JOIN questions q ON q.id=aa.question_id WHERE aa.attempt_id=? AND aa.question_id=? AND q.type='Subjective'", [$a['id'], (int)$qid]);
        if (!$r) continue;
        if (!is_numeric($v) || (float)$v < 0 || (float)$v > (float)$r['marks']) fail(400, ['marks' => ['Marks for "' . mb_substr($r['question'], 0, 30) . '…" must be between 0 and ' . (float)$r['marks'] . '.']]);
        q("UPDATE attempt_answers SET awarded=? WHERE id=?", [(float)$v, $r['id']]);
    }
    score_attempt($a['id']);
    return R(exam_result_out(row(attempt_select() . " WHERE a.id=?", [$a['id']]), true));
});
route('DELETE', '/exam-results/:id/', function ($m) {
    $u = auth(DASH);
    $a = row(attempt_select() . " WHERE a.id=?" . sc_and('t.branch_id', $u), [$m[1]]);
    if (!$a) fail(404, ['detail' => 'Not found.']);
    q("DELETE FROM attempts WHERE id=?", [$a['id']]);
    note((int)val("SELECT branch_id FROM tests WHERE id=?", [$a['test_id']]), "Attempt of {$a['student_name']} reset - the student can write the test again.");
    return R('', 204);
});

/* legacy dashboard "results": one row per attempt of a Completed test, scores as percentages */
route('GET', '/results/', function () {
    $u = auth(DASH);
    $out = [];
    foreach (rows("SELECT a.test_id, a.student_id, a.score, a.total, p.subject FROM attempts a JOIN tests t ON t.id=a.test_id LEFT JOIN papers p ON p.id=t.paper_id WHERE t.status='Completed'" . sc_and('t.branch_id', $u)) as $r) {
        $pct = (float)$r['total'] > 0 ? round((float)$r['score'] / (float)$r['total'] * 100, 1) : 0;
        $subj = $r['subject'] ? [$r['subject'] => $pct] : [];
        $out[] = ['test_id' => (int)$r['test_id'], 'student_id' => (int)$r['student_id'], 'score' => $pct, 'marks' => fnum($r['score']), 'subjects' => $subj ?: new stdClass()];
    }
    return R($out);
});

/* ---------- mock tests (self practice) ---------- */
function mock_papers($reg) {
    $out = [];
    foreach (rows("SELECT * FROM papers WHERE standard=? AND status='Published' ORDER BY id", [$reg['standard']]) as $p) {
        $qs = array_values(array_filter(paper_questions($p['id']), function ($q) { return $q['type'] !== 'Subjective'; }));
        if ($qs) $out[] = [$p, $qs];
    }
    return $out;
}
function mock_one($id, $reg) {
    foreach (mock_papers($reg) as $x) if ((int)$x[0]['id'] === (int)$id) return $x;
    fail(404, ['detail' => 'Not found.']);
}
route('GET', '/student/mock-tests/', function () {
    [$u, $reg] = me_student();
    $out = [];
    foreach (mock_papers($reg) as [$p, $qs]) {
        $tries = rows("SELECT * FROM mock_attempts WHERE paper_id=? AND student_id=? ORDER BY id", [$p['id'], $reg['id']]);
        $last = $tries ? end($tries) : null;
        $out[] = ['id' => (int)$p['id'], 'title' => $p['title'], 'subject' => $p['subject'], 'standard' => $p['standard'], 'duration' => (int)($p['duration'] ?: 30), 'question_count' => count($qs),
            'total_marks' => (float)array_sum(array_map(function ($q) { return (float)$q['marks']; }, $qs)), 'attempts' => count($tries), 'best' => $tries ? max(array_map(function ($a) { return (float)$a['score']; }, $tries)) : null,
            'last' => $last ? ['score' => fnum($last['score']), 'total' => fnum($last['total']), 'date' => iso($last['submitted_on'])] : null];
    }
    return R($out);
});
route('GET', '/student/mock-tests/:id/questions/', function ($m) {
    [$u, $reg] = me_student();
    [$p, $qs] = mock_one($m[1], $reg);
    return R(['title' => $p['title'], 'duration' => (int)($p['duration'] ?: 30), 'questions' => array_map(function ($q) { return ['id' => (int)$q['id'], 'type' => 'MCQ', 'question' => $q['question'], 'options' => json_decode($q['options'] ?: '[]', true), 'marks' => fnum($q['marks'])]; }, $qs)]);
});
route('POST', '/student/mock-tests/:id/submit/', function ($m) {
    [$u, $reg] = me_student();
    [$p, $qs] = mock_one($m[1], $reg);
    $answers = body()['answers'] ?? [];
    if (!is_array($answers)) $answers = [];
    $review = []; $correct = $un = 0; $score = $total = 0.0;
    foreach ($qs as $q) {
        $g = $answers[$q['id']] ?? null;
        $chosen = ($g === null || $g === '' || !is_numeric($g)) ? null : (int)$g;
        $total += (float)$q['marks'];
        if ($chosen === null) $un++; elseif ($chosen === (int)$q['answer']) { $correct++; $score += (float)$q['marks']; }
        $review[] = ['id' => (int)$q['id'], 'type' => 'MCQ', 'question' => $q['question'], 'options' => json_decode($q['options'] ?: '[]', true), 'answer' => (int)$q['answer'], 'marks' => fnum($q['marks']), 'chosen' => $chosen];
    }
    $wrong = count($qs) - $correct - $un;
    q("INSERT INTO mock_attempts (paper_id,student_id,score,total,correct,wrong,unattempted,answers) VALUES (?,?,?,?,?,?,?,?)", [$p['id'], $reg['id'], $score, $total, $correct, $wrong, $un, json_encode($answers)]);
    $id = last_id();
    return R(['id' => $id, 'paper_id' => (int)$p['id'], 'title' => $p['title'], 'submitted_on' => iso(date('Y-m-d H:i:s')), 'score' => $score, 'total' => $total, 'correct' => $correct, 'wrong' => $wrong, 'unattempted' => $un, 'review' => $review], 201);
});
