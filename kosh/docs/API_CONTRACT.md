# API contract (React ⇄ backend)

> Implemented in PHP + MySQL: see `backend/` (routes_*.php). Django-specific notes below are only the original wording.

The front-end is already wired to these endpoints through `src/services/*`.
Right now they are answered by the built-in mock (`src/mocks`). To go live:

1. Build the endpoints below in Django REST Framework.
2. In `.env` set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL=http://127.0.0.1:8000/api`.
3. Restart `npm run dev`. No component needs to change.

If your serializer field names differ, change **only** `src/services/mappers.js`.
If your URLs differ, change **only** `src/services/api/endpoints.js`.

## Conventions
- JSON, **snake_case** field names, trailing slashes (DRF router default).
- Auth header: `Authorization: Bearer <access>` (set `VITE_AUTH_SCHEME=Token` for DRF TokenAuthentication).
- A **401** on any call except login = session expired → the app logs the user out automatically.
- Errors: normal DRF bodies are understood — `{"detail": "..."}`, `{"field": ["msg"]}`, `{"non_field_errors": ["msg"]}`.
- Lists may be plain arrays **or** DRF-paginated `{count,next,previous,results}` (all pages are followed automatically).
- CORS: install `django-cors-headers` and allow the Vite origin (`http://localhost:5173`).

## Endpoints

| Method | URL | Request body | Response |
|---|---|---|---|
| POST | `/auth/login/` | `{identifier, password}` (identifier = email **or** username) | `{access, user:{id, role:"admin"\|"staff"\|"trainer"\|"student", name, email, username}}` — 401 `{detail}` on bad credentials |
| POST | `/auth/logout/` | – | 204 (optional; best-effort, e.g. blacklist refresh token) |
| POST | `/auth/register/` | student self-registration: `{name, mobile, standard, medium, date_of_birth:"YYYY-MM-DD", email, parent_name, parent_mobile, school_name, username, password}` | 201 — 400 DRF field errors (e.g. `{username:["This ID is already taken."]}`). Creates a user with role `student`; `username` is the student's login ID |
| GET | `/staff/` | – | **admin only.** `[{id, name, role:"staff"\|"trainer", mobile, email, username}]` — never returns passwords |
| POST | `/staff/` | `{name, role, mobile, email, username, password}` — admin chooses the login ID and password | 201 staff (no password in response) |
| DELETE | `/staff/:id/` | – | 204 (admin only) |
| POST | `/enquiries/` | `{name, email, mobile, topic, message}` | 201 |
| GET | `/students/` | – | `[{id, name, batch, phone}]` |
| POST | `/students/` | `{name, batch, phone}` | 201 student |
| DELETE | `/students/:id/` | – | 204 |
| GET | `/tests/` | – | `[{id, name, type, batch, date:"YYYY-MM-DD", duration, total_marks, status:"Draft"\|"Scheduled"\|"Completed"}]` |
| POST | `/tests/` | `{name, type, batch, date, duration, total_marks, status}` | 201 test |
| PATCH | `/tests/:id/` | `{status}` | 200 test |
| DELETE | `/tests/:id/` | – | 204 |
| GET | `/results/` | – | one row per student per **completed** test: `[{test_id, student_id, score, marks, subjects:{"Physics":62.5,"Chemistry":48,"Mathematics":71}}]` — `score` and subject values are percentages (0–100) |
| GET | `/settings/` | – | `{institute, email, phone, low_score_below, notify_email, notify_low_score}` |
| PATCH | `/settings/` | any of the above fields | 200 settings |
| GET | `/notifications/` | – | `[{id, text, read}]` newest first |
| POST | `/notifications/mark-all-read/` | – | 204 |
| GET | `/student/dashboard/` | – (student comes from the token) | see below |
| POST | `/leads/demo-requests/` | `{name, institute, phone, need}` | 201 |
| POST | `/demo/reset/` | – | **mock/dev only** — not needed in production (the "Reset demo data" button is hidden when `VITE_USE_MOCK=false`) |

Server-side side effects the UI expects: creating a test or student should also create a notification
(`Test "X" created.` / `Student X added.`); the front-end re-reads `/results/` and `/notifications/` after every change.

### `GET /student/dashboard/`
```json
{
  "student": {"name": "Abhijeet", "institute": "…", "batch": "Regular - Target 2027", "rank": 1, "accuracy": 1.6, "tests_done": 2},
  "stats": {"total": 2, "completed": 2, "pending": 0, "missed": 0, "avg_accuracy": null,
            "correct": 1.6, "incorrect": 4.11, "unattempted": 94.3, "avg_time": "0s", "overall": 2.03},
  "subjects": [{"name": "PCM", "value": 1.35}, {"name": "PHYSICS", "value": 2.71}],
  "trend": [3, 6, 2.5, 4, 4, 1.5, 3.5, 3, 1.5, 4.5],
  "upcoming_exams": [{"id": 1, "name": "NEET Final Test", "date": "2026-10-20"}],
  "unread_notifications": 10
}
```
`trend` = last 10 test scores in %, oldest → newest. `subjects[].icon` is optional (emoji; a default is chosen if omitted).

## Where things live
```
src/config/env.js            reads .env (only place that touches import.meta.env)
src/services/api/            axios instance, interceptors, endpoint list, error normalising, pagination helper
src/services/*Service.js     one file per resource (the only code that talks HTTP)
src/services/mappers.js      snake_case ⇄ camelCase
src/auth/session.js          login session + token storage
src/mocks/                   mock API + demo data  → delete this folder when Django is live
src/components/StatusViews   loading / error pieces
```
To remove the mock completely: delete `src/mocks`, then in `Login.jsx` drop the `DEMO_ACCOUNTS` import/block and in `axiosClient.js` drop the `if (env.USE_MOCK)` block.

## Roles
`admin`, `staff`, `trainer` open `/dashboard`; `student` opens `/student-dashboard`. Only `admin` sees **Staff & Trainers** (`/dashboard/staff`).
Enforce the same rules in Django permissions — the front-end only hides things. Hash passwords (Django does this by default);
that is why the admin sees a staff member's password only once, right after creating the account.

## Registrations, parents, question bank, papers (new)
All four are plain DRF ModelViewSets: GET /x/, POST /x/, PATCH /x/<id>/, DELETE /x/<id>/ (snake_case JSON).
- /registrations/ : name, mobile, standard, medium, date_of_birth, email, parent_name, parent_mobile, school_name, username, password (write-only; blank on PATCH = keep), status "Active|Inactive", registered_on. Inactive users must get 403 on login. POST /auth/register/ creates the same record.
- /parents/ : name, mobile, email, student_id, username, password (write-only)
- /staff/ : now also supports PATCH
- /questions/ : standard, subject, chapter, question, options (array of 4), answer (0-3), marks
- /papers/ : title, standard, subject, duration, status "Draft|Published", question_ids (array); response adds read-only total_marks. All questions must match the paper's standard + subject.
- GET /parent/dashboard/ : { child: <registration without password>, papers: [published papers for the child's standard] }
- Login roles: admin | staff | trainer | student | parent

## Tests as online exams (new)
- /tests/ now also takes `standard` (required; students of that standard see it) and optional `paper_id` (published paper of the same standard). When paper_id is set, duration/total_marks come from the paper. Read-only extras: paper_title, subject, question_count, attempts.
- Student visibility: standard == student's standard, paper_id set, status != Draft. Live when date <= today and status != Completed.
- GET /exam-results/ : [{ id, exam_id (= test id), exam_title, student_name, standard, score, total, correct, wrong, unattempted, submitted_on }]
- GET /student/exams/ : [{ id, title, date, status Scheduled|Live|Closed, standard, subject, duration, question_count, total_marks, my_attempt: {id, score, total}|null }]
- GET /student/exams/<id>/questions/ : { title, duration, questions:[{id, question, options, marks}] } — NO correct answers. 403 if not Live, 409 if already submitted.
- POST /student/exams/<id>/submit/ { answers: { "<question_id>": <option index 0-3> } } -> 201 { id, exam_title, score, total, correct, wrong, unattempted, date, review:[{id, question, options, answer, chosen, marks}] } (score calculated on the server)
- GET /student/exams/<id>/result/ : same body, 404 if not submitted yet.

## Question types, batches, subjective checking, announce & reset (new)
**Questions** — `/questions/` now has `type` ("MCQ" | "Subjective", default MCQ).
- MCQ: `options` (4), `answer` (0-3) as before.
- Subjective: `options` = [], `answer` = null, optional `model_answer` (teacher-only), `marks` > 0.

**Papers** — a paper may mix MCQ and Subjective questions of its standard + subject (same rules as before). "Auto" and "Change question" are UI features that only send a different `question_ids` list.

**Batches** — `/batches/` (ModelViewSet): `name`, `standard`, `student_ids` (registration ids of that standard); read-only `student_count`. Name is unique per standard. Deleting a batch removes it from tests.

**Tests** — `/tests/` also takes `batch_ids` (array; empty = every student of the standard), and returns read-only `batch_names`, `result_announced`, `pending_checks`.
- `PATCH /tests/<id>/ { result_announced: true|false }` — announce / hide the result.
- `PATCH /tests/<id>/ { batch_ids: [...] }` — assign to batches (must be batches of the test's standard).
- `POST /tests/<id>/reset/` — TEST RESET (all): deletes every attempt of the test and sets result_announced=false. Returns the test.
- Student visibility = standard matches AND paper_id set AND status != Draft AND (batch_ids empty OR student is in one of those batches).

**Student exam**
- `GET /student/exams/<id>/questions/` — each question now has `type`; NO answers / model answers.
- `POST /student/exams/<id>/submit/ { answers: { "<qid>": <option index> | "<written text>" } }` — MCQ is auto-checked; Subjective answers are stored with `awarded = null` (pending).
- Until `result_announced` is true, `GET .../result/`, the submit response and `my_attempt` return only `{ id, exam_title, announced:false, date }` (no marks, no review).
- After announcing: `{ announced:true, score, total, correct, wrong, unattempted, mcq_score, subjective_score, review:[...] }`. Review item: MCQ `{id, type:"MCQ", question, options, answer, chosen, marks}`; Subjective `{id, type:"Subjective", question, marks, written, awarded|null, model_answer}`.

**Admin result checking**
- `GET /exam-results/` rows add `id`, `mcq_score`, `subjective_score`, `pending_review` (bool), `has_subjective` (bool).
- `GET /exam-results/<id>/` — one attempt including the full `review` (to check written answers).
- `PATCH /exam-results/<id>/ { marks: { "<subjective question id>": 2.5 } }` — 0 <= marks <= question marks. Server recalculates `score`, `subjective_score`, `pending_review` (false once every subjective answer has marks).
- `DELETE /exam-results/<id>/` — TEST RESET for one student: the attempt is removed and the student can write the test again.

## Study material: notes + video links (new)
`/materials/` — DRF ModelViewSet (admin / staff). Fields: `title`, `standard`, `subject`, `kind` ("Note" | "Video"), `description` (optional), `url` (Video: http/https link), `file` (Note: uploaded file), read-only `file_name`, `file_url` (absolute URL the browser can open/download), `created_on`.
- Create / update with **multipart/form-data** when a file is sent (`file` field + the text fields). PATCH without `file` keeps the old file.
- Validation: Note needs a file; Video needs a valid http/https `url`. Suggested limit 20 MB; allowed: pdf, doc(x), ppt(x), xls(x), txt, png, jpg.
- `GET /student/materials/` — material of the logged-in student's standard (newest first), same fields.
(Demo mode keeps the file in browser storage as a data URL, so it is limited to about 1 MB.)

## LMS: exam target, courses, lessons, progress (new)
**Registration** — `/registrations/` and `POST /auth/register/` take a new field `target`: `"JEE (Main)" | "JEE (Advanced)" | "NEET" | "MHT-CET"`. Required when `standard` is `11th`, `12th` or `Dropper / Repeater`; ignored (stored as `""`) for 5th-10th.

**Courses** — `/courses/` (ModelViewSet, admin / staff). Fields: `title`, `standard`, `target` ("" = school class or common to all streams), `subject`, `description`, `status` (`Draft` | `Published`), `lessons` (array, below), read-only `created_on`, `lesson_count`, `learner_count`, `avg_progress` (0-100).
- Lesson: `{ id, title, chapter, kind: "Video"|"Notes"|"Live class"|"Practice", url, minutes, when }` — `url` must be http/https when set; `when` = live-class schedule text. Lesson `id` is unique inside the course (the server assigns it to new lessons); the array order is the display order. Saving `lessons` replaces the list.
- `GET /courses/<id>/progress/` — one row per active registered student who may see the course: `{ student_id, name, standard, target, done, total, percent }`.
- Deleting a course deletes its progress.

**Student** (logged-in student, identified by token)
- `GET /student/courses/` — Published courses where `course.standard == student.standard` AND (`course.target == ""` OR `course.target == student.target`). Each: `{ id, title, standard, target, subject, description, lessons, done_lesson_ids, percent }`.
- `POST /student/courses/<id>/progress/ { lesson_id, done: true|false }` — marks / un-marks a lesson; returns the course in the same shape. 404 if the course is not visible to the student.

## Multi-branch + white-label (new)
**Branch** — `/branches/` (ModelViewSet, **super admin only**). Fields: `name`, `code` (unique slug, used in `/?branch=<code>`), `city`, `address`, `phone`, `email`, `brand_name` (top-bar name), `institute_name`, `tagline`, `logo` (URL or data URL; a real backend should use an image upload), `primary_color`, `dark_color` (`#rrggbb`), `domain` (unique, optional), `status` (`Active`|`Inactive`); read-only `student_count`, `course_count`, `staff_count`, `test_count`. On **create** you may also send `admin_name`, `admin_username`, `admin_password`, `admin_email` -> creates a Branch Admin (role `admin`) for the branch. Delete is refused while the branch still has students/courses/tests/batches/materials/staff.
- `GET /branches/public/` — **no login**: Active branches with brand fields only (`id, code, name, city, brand_name, institute_name, tagline, logo, primary_color, dark_color, domain, phone, email`). Used for white-label branding and the registration branch list.

**Ownership** — `registrations`, `staff`, `parents`, `batches`, `courses`, `materials`, `tests` (and `students`) have a `branch_id` (read-only on update; responses of registrations / staff / parents / batches / courses add `branch_name`).
- Login response `user` now has `branch_id` (0 for the super admin). Role `superadmin` is new; `admin` = Branch Admin.
- A branch user (admin / staff / trainer) only ever lists and edits records of `user.branch_id`; other branches' ids answer 404. New records get the caller's branch automatically.
- **Super admin**: sees every branch unless the request has header `X-Branch-Id: <id>` (then only that branch; creates go into it). Creating a branch-owned record without a branch (no header) -> 400 `{ branch_id: ["Select a branch…"] }`.
- Students / parents: all `/student/*` and `/parent/*` data is limited to their own branch (courses, tests, study material).
- `POST /auth/register/` takes `branch_id` (required, an Active branch).

## Attendance: manual + biometric (new)
**Registration** — `/registrations/` takes a new optional field `biometric_id` (string, max 20): the User ID of the student on the attendance machine. Must be unique inside a branch (400 `{ "biometric_id": [...] }` otherwise). Device-ID matching order: `biometric_id` -> student's `mobile` -> registration `id`; compare numeric IDs as numbers (`"007" == "7"`), text IDs case-insensitively.

**Record** (one per student per day, unique on `student_id + date`): `{ id, student_id, date: "YYYY-MM-DD", status: "Present"|"Absent"|"Late"|"Leave", in_time: "HH:MM"|"", out_time: "HH:MM"|"", source: "Manual"|"Biometric", note }`. Only students of the caller's branch are visible (same branch rules as above).

- `GET /attendance/?from=YYYY-MM-DD&to=YYYY-MM-DD` — records in the range (both optional). Plain array or DRF-paginated.
- `POST /attendance/mark/ { date, records: [{ student_id, status, note }] }` — manual marking of one day; creates or updates (`source = "Manual"`, existing `in_time/out_time` are kept). Future dates -> 400 `{ "date": [...] }`. Returns `{ saved }`.
- `POST /attendance/import/ { punches: [{ biometric_id, timestamp }], late_after: "HH:MM"|"", mark_absent: true|false }` — the browser reads the device export (CSV / TXT / DAT / XLSX), keeps the first and last punch of each student per day and sends them. `timestamp` = `"YYYY-MM-DD HH:MM"` (or just the date). The server, per student + day: `in_time` = earliest punch, `out_time` = latest punch (only when there is more than one), `status` = `Late` if `late_after` is set and `in_time > late_after`, else `Present`, `source = "Biometric"` (overwrites an existing record of that day). If `mark_absent` is true, for every date that has at least one matched punch, every Active student of the branch who has **no** record that day (and was registered on/before it) gets an `Absent` record; existing records are never overwritten. A super admin without `X-Branch-Id` gets 400. Returns `{ students_matched, created, updated, absent_marked, days, skipped_rows, unknown_ids: [...] }`.
- `GET /student/attendance/` — the logged-in student's own records (all dates).
- `GET /parent/attendance/` — records of the parent's linked child.

**Attendance %** (computed in the UI) = (Present + Late) / (Present + Late + Absent + Leave) of the days marked for that student.

**Automatic sync from a device (optional, backend only)** — a browser cannot reach a machine on your LAN. For push-style sync, point the device (ZKTeco ADMS / "cloud server" setting, eSSL / Realtime push) at a Django view that accepts its punches and stores them with the same rules as `/attendance/import/` (the punch lines are `<device user id> <timestamp> ...`). Keep that endpoint on a secret token, not on the normal login.

## Test notifications to students (new)
Recipients of a test = Active registrations of the test's branch + `standard` (and members of `batch_ids` when set). Create them when a test is created with status != Draft, when Draft -> Scheduled, when `result_announced` turns true, and on request:
- `POST /tests/<id>/notify/` -> `{ sent }` (400 if Draft or nobody to notify).
- `GET /student/notifications/` -> `[{ id, text, created_on, read }]` newest first. `POST /student/notifications/mark-all-read/` -> 204.
- `GET /student/dashboard/` `unread_notifications` = the student's unread count.

## Student portal extras (new)
- `GET /student/profile/` -> the student's registration (no password) + `branch_name`.
- `GET /student/mock-tests/` -> `[{ id, title, subject, standard, duration, question_count, total_marks, attempts, best, last: { score, total, date } | null }]` = Published papers of the student's standard that contain MCQ questions. `GET /student/mock-tests/<id>/questions/` -> `{ title, duration, questions: [{ id, type:"MCQ", question, options, marks }] }` (no answers). `POST /student/mock-tests/<id>/submit/ { answers: { questionId: optionIndex } }` -> `{ id, title, score, total, correct, wrong, unattempted, submitted_on, review: [...] }` (stored per student, unlimited attempts).
- `POST /student/attendance/mark/` — marks TODAY for the logged-in student: `status = "Present"`, `in_time = now`, `source = "Self"`. 409 `{ detail }` if today already has a record. Attendance `source` is now `Manual | Biometric | Self`.
- `GET /student/messages/` -> own messages `[{ id, subject, text, created_on, reply, replied_on }]` newest first; `POST /student/messages/ { subject, text }` (text <= 1000 chars) -> 201.
- Admin / staff (branch rules as usual): `GET /messages/` (all students' messages of the branch), `PATCH /messages/<id>/ { reply }`, `DELETE /messages/<id>/`. A new message should also create an admin notification.


## Parent portal — profile, results, notices, messages (new)
All `/parent/*` endpoints are for the logged-in **parent** (role `parent`) and return only data of the parent's **own linked child** (`parents.student_id`). Any other role -> 403 `{detail:"Parents only."}`. A parent with no linked child gets empty data.

- `GET /parent/dashboard/` — `{ child, papers }` (unchanged, see above).
- `GET /parent/profile/` — `{ parent: { name, mobile, email, username }, child: <registration without password> + branch_name }`.
- `GET /parent/results/` — `{ results: [...], pending: [...] }`.
  - `results[]` = every exam attempt of the child: `{ id, exam_title, subject, test_date, submitted_on, announced }`. **Only when the test's `result_announced` is true** also: `{ score, total, percent, correct, wrong, unattempted, rank, appeared }` (`rank` = 1 + number of attempts of the same exam with a higher score, `appeared` = attempts of that exam). Newest first.
  - `pending[]` = tests of the child's standard/branch/batches that the child has not written: `{ id, title, subject, date, status: "Live"|"Scheduled"|"Closed", total_marks }`.
- `GET /parent/attendance/` — records of the child (unchanged, see Attendance).
- `GET /parent/notices/` — array, pinned first then newest first: `{ id, kind: "Notice"|"Test", title, text, pinned, created_on }`. `Notice` = rows of `/notices/` with `audience` in (`Parents`,`Everyone`), same branch, and `standard` empty or equal to the child's standard. `Test` = the test alerts sent to the child (see Test notifications).
- `GET /parent/messages/` — the messages this parent sent (newest first): `{ id, student_id, student_name, from_role:"Parent", sender_name, standard, subject, text, created_on, reply, replied_on }`.
- `POST /parent/messages/ { subject, text }` -> 201 (same record). `subject` required (<=100), `text` required (<=1000). Creates a row in the same table as the student messages with `from_role = "Parent"`, `sender_name = "<parent name> (Parent)"`, `student_name` = the child's name, so admin / staff see it in `GET /messages/` and answer with `PATCH /messages/<id>/ { reply }` exactly like student messages. (`from_role` and `sender_name` are new, read-only fields on `/messages/`; `from_role` is `"Student"` for the old ones.) The parent must never see the student's own messages.

### Notices (admin / staff write them)
`/notices/` is a normal ModelViewSet (GET, POST, PATCH `<id>/`, DELETE `<id>/`), branch-scoped like `parents` / `batches` (`branch_id` set from the caller; responses add `branch_name`).
Fields: `title` (required, <=120), `text` (required, <=2000), `audience` `"Parents"|"Students"|"Everyone"` (default `Parents`), `standard` (`""` = all standards), `pinned` (bool), `created_on` (read-only, server time).
Only the **parent** side reads notices in this version (`GET /parent/notices/`); `Students` / `Everyone` can be shown in the student portal later.

## Teacher panel additions
- `POST /notifications/send/` (admin / staff / trainer) body `{ "title", "message", "audience": "batches" | "standard" | "students", "batch_ids": [], "standard": "", "student_ids": [] }` -> `{ "sent": <students reached> }`. 400 when nobody matches. Shows in `GET /student/notifications/` and in the parent's notices (child's alerts).
- `Material` gains `batch_ids: []` (optional). Empty = every student of `standard`; otherwise only students that belong to one of those batches. `GET /student/materials/` applies this filter.
- `Batch.student_ids` may be an empty list (a teacher creates the batch first, then adds students with PATCH).
