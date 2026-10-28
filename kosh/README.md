# >>> BACKEND AALA AAHE (PHP + MySQL) <<<
`backend/` folder = PHP API, `backend/database/sahyadri_coaching.sql` = phpMyAdmin madhe import karaychi file.
Setup steps: `backend/SETUP.md`.  (`.env` madhe `VITE_USE_MOCK=false` already kela aahe; demo mode pahije tar `true` kara.)

# Sahyadri Easy Coaching website (React + Vite) — Blue theme

## Website kasa chalu karaycha (open karun baghayla)
1. Node.js install kara (https://nodejs.org — LTS version) — ek-veli.
2. Windows: `start.bat` var double-click kara.  Mac/Linux: `./start.sh`
   (kinva terminal madhe: `npm install` nantar `npm run dev`)
3. Browser aaplyaa-aap ughdel: http://localhost:5173

> index.html direct double-click kelyas page blank disto — Vite/React project asalyane to server through chalto. Upar dilele 2 steps vapra.

## Hosting (live karayla)
`npm run build` -> `dist/` folder upload kara (Netlify / Vercel / cPanel). SPA fallback ON theva (sarva path -> index.html).

## Pages
Website: / /features /how-it-works /analytics /reports /faq /contact /admin /teacher /student /exam-flow
Admin Dashboard: /dashboard (+ /tests /students /analysis /reports /settings)
Student Dashboard: /student-dashboard

Colors: `src/kosh.css` (variables at top) + `src/theme.css` (blue theme, overrides).

## Backend (Django REST Framework) kasa jodaycha
Front-end ata backend-ready aahe: sagle API calls `src/services` madhun jatat (Axios), settings `.env` madhe.

1. `.env` madhe `VITE_USE_MOCK=false` ani `VITE_API_BASE_URL=http://127.0.0.1:8000/api` thewa (restart `npm run dev`).
2. Django madhe `docs/API_CONTRACT.md` pramane endpoints banva (CORS: `django-cors-headers`).
3. Field/URL naave vegli asatil tar fakt `src/services/mappers.js` ani `src/services/api/endpoints.js` badla.

`VITE_USE_MOCK=true` (default) asel tar backend shivay pahile sarkhach demo chalto (login: admin@param.in / Admin@123, student@param.in / Student@123).
Mock data `src/mocks` madhe aahe — backend live zalyavar to folder delete kara.

## Logins (4 separate pages)
/admin-login · /student-login · /parent-login · /staff-login (Staff & Trainer)   (/login = common page, any role)
Wrong portal => error (e.g. a student cannot sign in on /admin-login).
Demo (mock mode): admin@param.in / Admin@123 · student@param.in / Student@123 · parent@param.in / Parent@123 · staff@param.in / Staff@123 · trainer@param.in / Trainer@123

## Admin dashboard — new modules
/dashboard/registrations  — all registrations: search/filter, add, edit, activate/deactivate, delete, CSV export
/dashboard/staff          — staff & trainer accounts: add, edit, remove (admin only)
/dashboard/parents        — parent logins linked to a registered student: add, edit, delete (admin only)
/dashboard/questions      — MCQ question bank: standard + subject + 4 options + correct answer + marks
/dashboard/papers         — question paper sets per standard & subject, publish/unpublish, print paper / answer key
/dashboard/reg-reports    — registration, question and paper reports with CSV export
Parent portal: /parent-dashboard (login: /parent-login)

## Online exams (Admin -> Student)
1. Admin: Question Bank -> Question Papers (Publish).
2. Admin -> **Tests -> Create test**: choose the **Standard** (only students of that standard see it) and optionally a published Question Paper of that standard (duration + marks come from the paper). Draft = hidden; Scheduled = visible, starts on the test date; Mark completed = closed.
3. Student Dashboard -> **Tests** tab shows tests of the student's standard. Start exam: timer, Next/Previous, palette, Submit (auto-submit when time ends), result + answer review.
4. Admin -> Tests -> **Results (n)**: score, right/wrong/skipped per student, CSV.

## Question bank, auto paper, batches, checking & results (new)
- **Question Bank** (`/dashboard/questions`): per standard + subject, two types — **MCQ** (auto-checked) and **Subjective** (teacher gives marks). Std chips on top show how many questions each standard has.
- **Question Papers** (`/dashboard/papers` -> Create paper): choose standard + subject, then
  - **Auto**: type (MCQ / Subjective / both), *No. of questions* and optional *Total marks* -> picks a random set that adds up exactly (click *Generate again* for another set). If it is impossible you get a clear message.
  - **Manual select**: search + tick questions.
  - **Change**: swaps one selected question with another unused one (same marks first). Use the arrows to re-order, ✕ to remove.
  - **Preview paper**: live preview while building; **Preview** button on the list shows the paper / answer key and prints it.
- **Batches** (`/dashboard/batches`): group registered students of one standard. In **Tests -> Create test** (or the **Assign** button) pick one or more batches; none selected = whole standard.
- **Results** (Tests -> **Results (n)**):
  - MCQ marks are automatic. Subjective answers: **Check** -> give marks per answer (partial saving allowed).
  - **Announce result** / **Hide result**: students see "Submitted - result awaited" until you announce; then marks + answer review.
  - **Reset** (one student) / **Reset test (all)**: deletes the attempt(s) so students can write the test again.
Backend contract for all of this: `docs/API_CONTRACT.md` (last section).

## Paper preview / print (A4) and Study Material (new)
- **Question Papers -> Preview / Print**: shows the paper at real **A4 size** in **Single column** or **Double column** layout, with or without the answer key. 🖨 **Print paper** / **Print answer key** print in the chosen layout (choose "Save as PDF" in the print window for a PDF). The same A4 preview is available while building a paper (**Preview paper (A4)**).
- **Study Material** (`/dashboard/materials`): admin uploads **notes** (PDF / Word / PowerPoint / Excel / image) or adds **video links**, per standard + subject; edit / delete anytime. Students see them in **Student Dashboard -> Study Material** (only their own standard). Demo mode: notes up to about 1 MB; real backend: see `docs/API_CONTRACT.md`.



## Glassmorphism navbar + footer (new)
All styles are in `src/glass.css` (imported last in `src/main.jsx`). Change the look from the 4 variables at the top: `--glass-tint` (colour/darkness), `--glass-blur` (frost strength), `--glass-line` (border), `--glass-shine` (top highlight). The footer link grid and the (c) strip are frosted glass cards over the network image.
Also fixed: `html, body { overflow-x:hidden }` (theme.css) stopped the navbar from staying on top while scrolling; now only `html` clips, so the navbar is sticky.

## LMS — Learning Management System (new)
Standards **5th-10th** (school subjects) and **11th / 12th / Dropper** with exam target **JEE (Main) · JEE (Advanced) · NEET · MHT-CET**.
- **Registration** (`/register`, Admin -> Registrations): 11th / 12th / Dropper students must choose an *Exam target*; 5th-10th need none. Registrations can be filtered by target and exported (CSV).
- **Admin -> LMS Courses** (`/dashboard/courses`): create a course = standard + (exam target) + subject. Subjects follow the target (JEE: PCM, NEET: PCB, MHT-CET: PCM + Biology). Target "All streams" = common course for every 11th/12th student.
  - **Lessons**: Video (YouTube/Drive link), Notes (PDF/Drive link), Live class (meeting link + schedule), Practice (points the student to the Tests tab). Grouped by chapter; re-order with the arrows.
  - **Publish / Unpublish** (Draft = hidden), **Progress** (per-student completion %), Edit, Delete.
- **Student Dashboard -> My Courses**: only courses of the student's own standard + exam target. Course cards with progress, lesson player (YouTube plays inside the page), *Mark as completed*, *Next lesson*.
- **Demo mode** loads 38 sample courses. Demo logins (password `Student@123`): `abhijeet` (10th, password Student@123) · `kavya` (11th JEE Main) · `om` (12th JEE Advanced) · `aditya` (12th NEET) · `tanvi` (11th MHT-CET). Sample video lessons open a YouTube *search* — replace them with your real lecture links in LMS Courses -> Lessons.
- Tip: for batch-wise tests create Batches such as "12th NEET" (Batches page) and assign tests to them; the LMS itself already separates students by standard + target.
- Backend contract: `docs/API_CONTRACT.md` (last section).

## Multi-branch + White-label + Super Admin panel (new)
- **Look fixed**: the dashboard header (title "Overview", "Download reports" button) was dark text on a dark blue band — the website's top photo band was also drawn behind the dashboards. Fixed in `src/branding/branding.css` (plus cleaner white cards / soft shadows).
- **Branches**: every student, staff, parent, batch, test, study material and LMS course belongs to ONE branch. Question Bank and Question Papers stay shared (head-office bank).
- **Roles**: **Super Admin** (all branches; `/dashboard/branches` = *Branches & Brands* panel + top-bar *branch switcher*), **Branch Admin** (role `admin`, sees only own branch), Staff / Trainer / Student / Parent (own branch only).
- **White-label brand per branch** (Branches & Brands -> Add / Edit branch): brand name, full institute name, tagline, logo upload, primary + dark colour, optional own domain. Navbar, footer, dashboards, printed papers and all blue colours follow the branch brand.
  - Which brand is shown: logged-in branch user -> branch of the super admin's switcher -> link `/?branch=<code>` (remembered; `/?branch=default` clears it) -> website domain -> default Sahyadri brand.
  - **Registration** asks for the branch (pre-selected and locked when the site is opened as a branch).
- **Super admin panel**: totals (branches / students / courses / staff), per-branch table, *Open panel* (work inside a branch), *Preview site*, Edit, Activate/Deactivate, Delete (only when empty). When creating a branch you can also create its Branch Admin login.
- Demo logins (mock mode): `superadmin@param.in / Super@123` (Admin login page) · `admin@param.in / Admin@123` (Nashik main branch) · `admin.pune / Admin@123` · `admin.mumbai / Admin@123` · students (Student@123): `sakshi` (Pune, 12th NEET), `rahul` (Mumbai, 11th JEE Main), plus the earlier ones. Try `/?branch=pune` and `/?branch=mumbai` to see the green / purple white-label sites.
- Backend contract: `docs/API_CONTRACT.md` (last section).

## Attendance — manual + biometric import + reports (new)
Admin dashboard -> **Attendance** (`/dashboard/attendance`), 3 tabs. Also open to Staff / Trainer logins.
- **Mark attendance**: pick a date (default today), filter by standard / batch / search, press **Present / Absent / Late / Leave** per student (or *Mark all Present*), add a note, **Save**. Already-saved days load again and can be corrected.
- **Import biometric file**: export the *attendance log* from your machine / its PC software (CSV, TXT, DAT or Excel **.xlsx**; for old .xls use *Save As .xlsx/.csv* in Excel). Upload it -> the screen guesses which column is the User ID and which is the date/time (you can change it) -> check the preview -> **Import**.
  - First punch of the day = In time, last punch = Out time. Optional **Late after** time. Optional: students with no punch on those days become **Absent** (only on days someone punched, never overwrites existing records).
  - Link students to the machine: **Registrations -> Edit -> Biometric ID** = the User ID enrolled on the machine. If empty we try mobile number, then registration number. IDs that match nobody are listed so you can fix them.
  - *Download a sample file* button shows the expected layout. Date format DD/MM/YYYY or MM/DD/YYYY can be chosen.
- **Attendance report**: month picker + standard / batch / search. *Student-wise* (P / A / L / Lv for each day, totals and %, students below the "Low below %" limit are marked red) and *Day-wise* (counts per date). **Export CSV** and **Print**.
- **Student Dashboard -> Attendance** and **Parent portal** show the child's month calendar and %.
- Demo mode: every demo student gets Biometric ID 101, 102, ... and 3 weeks of sample attendance.
- Backend contract: `docs/API_CONTRACT.md` (last section). Automatic sync from the machine (no file) needs the Django backend.

## Test notifications to students (new)
- When you **create** a test (status Scheduled) or **Publish** a draft, the students of that standard (and of the assigned batches, if any) in that branch get a notification automatically. Announcing a result also notifies them.
- **Tests -> 🔔 Notify** (on any Scheduled test) sends the reminder again whenever you want.
- Students see it under the 🔔 bell in the Student Dashboard (red number = unread).
- Backend: `POST /tests/<id>/notify/` -> `{ sent }`; `GET /student/notifications/`; `POST /student/notifications/mark-all-read/`.

## Student portal — full menu (new)
Student Dashboard side menu: **Dashboard · Profile · My Courses · Tests · All Results · Mock Tests · View Notes · Mark Attendance · Send Message · Analysis · Logout**
- **Profile**: the student's own registration details (read-only).
- **All Results**: every test written (score, %, "View answers"), summary cards, plus mock-test practice history.
- **Mock Tests**: published question papers of the student's standard (MCQ part), timer, instant result with answer review, unlimited attempts (practice only).
- **View Notes**: the existing Study Material tab (notes download + video links).
- **Mark Attendance**: one tap marks TODAY as Present (with time, source "Self"); never overwrites a teacher / biometric record. Month calendar below.
- **Send Message**: student writes to the institute; admin / staff reply under **Dashboard -> Messages** (`/dashboard/messages`), the reply shows in the student's list.
- Backend contract: `docs/API_CONTRACT.md` (last section).


## Parent portal (new)
Login: `/parent-login` (or the common `/login`) — demo `parent@param.in / Parent@123`. Admin creates real parent logins in **Dashboard -> Parents** (each parent is linked to one registered student).
After login the parent sees a dashboard with the sidebar:
- **Student Profile** — child's registration details + the parent's own account
- **Student Result** — all online tests written (score, %, rank once the admin has announced the result) and the tests still to be written
- **Student Attendance** — month calendar + this month / overall attendance %
- **View Notices** — announcements written by the admin + test alerts (red badge = new since the last visit)
- **Send Message** — write to the institute and read the reply
**Admin side:** **Dashboard -> Notices** (new: publish / edit / pin / delete notices for Parents, a standard or everyone) and **Dashboard -> Messages** (now shows parent messages too, marked with 👨‍👩‍👧; reply there and the parent sees it).
Backend contract: `docs/API_CONTRACT.md` (last section).

## Teacher / Staff dashboard (new)
Staff & Trainer logins (`/staff-login`, demo: `staff@param.in / Staff@123`, `trainer@param.in / Trainer@123`) now land on a **Teacher panel** (same `/dashboard` URL, own menu + home page). Admin-only pages (Registrations, Parents, Staff, Settings, Branches, Registration Reports) are hidden and blocked for teachers.
- **Home**: counts (students, batches, scheduled tests, today's attendance) + quick-action cards.
- **Batches & Students**: *Create batch* (can start empty), **Add / remove students** (saved instantly, search, "Add all shown"), Edit, Delete.
- **Assign Test**: Tests -> Create test / **Assign** -> pick one or more batches (none = whole standard). Students are notified automatically.
- **Question Papers / Question Bank**: set papers (auto or manual), preview / print.
- **Send Notes**: Study Material -> Upload notes / video link -> **Send to** = whole standard or only selected batches (new). Students see it in *View Notes*.
- **Send Notification** (`/dashboard/notify`, new): message to *selected batches*, a *whole standard* or *chosen students*. Students get it under the bell; parents see it in View Notices.
- **Mark Attendance**: manual (Present / Absent / Late / Leave) or biometric import.
- **All Reports** (`/dashboard/teacher-reports`, new): batch report, test report, student report, day-wise attendance, low-attendance list (below 75%) — each with CSV export; period 7 / 30 / 90 days. Links to the monthly attendance sheet and Analysis.
- Backend (Django) additions: `POST /notifications/send/` body `{title, message, audience: "batches"|"standard"|"students", batch_ids, standard, student_ids}` -> `{sent}`; materials accept optional `batch_ids` (empty = whole standard) and `/student/materials/` must filter by the student's batches.
