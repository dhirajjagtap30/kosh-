-- =====================================================================
-- Sahyadri Easy Coaching (kosh) - MySQL / MariaDB database
-- phpMyAdmin madhe: Import -> ha file nivda -> Go
-- Database naav: sahyadri_coaching   (aadhi create hot nahi tar ha file karel)
-- Based on docs/API_CONTRACT.md  (PHP API: backend/ folder)
-- =====================================================================
CREATE DATABASE IF NOT EXISTS `sahyadri_coaching` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sahyadri_coaching`;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------- Branches (white-label) ----------
CREATE TABLE `branches` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `code` VARCHAR(40) NOT NULL,
  `city` VARCHAR(80) DEFAULT '',
  `address` VARCHAR(255) DEFAULT '',
  `phone` VARCHAR(30) DEFAULT '',
  `email` VARCHAR(120) DEFAULT '',
  `brand_name` VARCHAR(80) DEFAULT '',
  `institute_name` VARCHAR(120) DEFAULT '',
  `tagline` VARCHAR(160) DEFAULT '',
  `logo` MEDIUMTEXT,
  `primary_color` CHAR(7) NOT NULL DEFAULT '#2563eb',
  `dark_color` CHAR(7) NOT NULL DEFAULT '#0a2463',
  `domain` VARCHAR(120) DEFAULT NULL,
  `status` ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_branch_code` (`code`),
  UNIQUE KEY `uq_branch_domain` (`domain`)
) ENGINE=InnoDB;

-- ---------- Users (login: superadmin, admin, staff, trainer, student, parent) ----------
-- password_hash = password_hash() / crypt hash. Kadhihi plain password thevu naka.
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 0,          -- 0 = super admin
  `role` ENUM('superadmin','admin','staff','trainer','student','parent') NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(120) DEFAULT NULL,
  `username` VARCHAR(60) NOT NULL,
  `mobile` VARCHAR(20) DEFAULT '',
  `password_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email` (`email`),
  KEY `idx_role_branch` (`role`,`branch_id`)
) ENGINE=InnoDB;


-- ---------- Login tokens (ek user - kitihi devices) ----------
CREATE TABLE `api_tokens` (
  `token` CHAR(64) NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `expires_at` DATETIME NOT NULL,
  PRIMARY KEY (`token`),
  KEY `idx_tok_user` (`user_id`),
  CONSTRAINT `fk_tok_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Student registrations (student profile; user_id = student login) ----------
CREATE TABLE `registrations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(120) NOT NULL,
  `mobile` VARCHAR(20) NOT NULL,
  `standard` VARCHAR(30) NOT NULL,                       -- 5th..12th, Dropper / Repeater
  `target` ENUM('','JEE (Main)','JEE (Advanced)','NEET','MHT-CET') NOT NULL DEFAULT '',
  `medium` VARCHAR(30) DEFAULT '',
  `date_of_birth` DATE DEFAULT NULL,
  `email` VARCHAR(120) DEFAULT '',
  `parent_name` VARCHAR(120) DEFAULT '',
  `parent_mobile` VARCHAR(20) DEFAULT '',
  `school_name` VARCHAR(160) DEFAULT '',
  `biometric_id` VARCHAR(20) DEFAULT NULL,
  `status` ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  `registered_on` DATE NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reg_biometric` (`branch_id`,`biometric_id`),
  KEY `idx_reg_std` (`branch_id`,`standard`),
  KEY `idx_reg_user` (`user_id`),
  CONSTRAINT `fk_reg_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- Parents (linked to one child) ----------
CREATE TABLE `parents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `branch_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED DEFAULT NULL,                -- registrations.id
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_parent_user` (`user_id`),
  CONSTRAINT `fk_parent_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_parent_student` FOREIGN KEY (`student_id`) REFERENCES `registrations`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- Legacy students list (/students/) ----------
CREATE TABLE `students` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `name` VARCHAR(120) NOT NULL,
  `batch` VARCHAR(80) DEFAULT '',
  `phone` VARCHAR(20) DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- ---------- Batches ----------
CREATE TABLE `batches` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `standard` VARCHAR(30) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_batch` (`branch_id`,`standard`,`name`)
) ENGINE=InnoDB;

CREATE TABLE `batch_students` (
  `batch_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,                    -- registrations.id
  PRIMARY KEY (`batch_id`,`student_id`),
  CONSTRAINT `fk_bs_batch` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bs_student` FOREIGN KEY (`student_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Question bank ----------
CREATE TABLE `questions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `standard` VARCHAR(30) NOT NULL,
  `subject` VARCHAR(40) NOT NULL,
  `chapter` VARCHAR(120) DEFAULT '',
  `type` ENUM('MCQ','Subjective') NOT NULL DEFAULT 'MCQ',
  `question` TEXT NOT NULL,
  `options` JSON DEFAULT NULL,                           -- MCQ: 4 options, Subjective: []
  `answer` TINYINT DEFAULT NULL,                         -- MCQ: 0-3
  `model_answer` TEXT,
  `marks` DECIMAL(6,2) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_q` (`standard`,`subject`)
) ENGINE=InnoDB;

-- ---------- Papers ----------
CREATE TABLE `papers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `title` VARCHAR(160) NOT NULL,
  `standard` VARCHAR(30) NOT NULL,
  `subject` VARCHAR(40) NOT NULL,
  `duration` INT NOT NULL DEFAULT 30,
  `status` ENUM('Draft','Published') NOT NULL DEFAULT 'Draft',
  `created_on` DATE NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `paper_questions` (
  `paper_id` INT UNSIGNED NOT NULL,
  `question_id` INT UNSIGNED NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`paper_id`,`question_id`),
  CONSTRAINT `fk_pq_paper` FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pq_question` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Tests (online exams) ----------
CREATE TABLE `tests` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `name` VARCHAR(160) NOT NULL,
  `type` VARCHAR(40) DEFAULT 'Mock',                     -- DPP, Chapter-wise, Mock, Final Test
  `batch` VARCHAR(80) DEFAULT '',
  `standard` VARCHAR(30) NOT NULL,
  `paper_id` INT UNSIGNED DEFAULT NULL,
  `date` DATE NOT NULL,
  `duration` INT NOT NULL DEFAULT 60,
  `total_marks` DECIMAL(7,2) NOT NULL DEFAULT 0,
  `status` ENUM('Draft','Scheduled','Completed') NOT NULL DEFAULT 'Draft',
  `result_announced` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_test_std` (`branch_id`,`standard`),
  CONSTRAINT `fk_test_paper` FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE `test_batches` (
  `test_id` INT UNSIGNED NOT NULL,
  `batch_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`test_id`,`batch_id`),
  CONSTRAINT `fk_tb_test` FOREIGN KEY (`test_id`) REFERENCES `tests`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tb_batch` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Exam attempts + answers ----------
CREATE TABLE `attempts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `test_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,                    -- registrations.id
  `score` DECIMAL(7,2) NOT NULL DEFAULT 0,
  `total` DECIMAL(7,2) NOT NULL DEFAULT 0,
  `correct` INT NOT NULL DEFAULT 0,
  `wrong` INT NOT NULL DEFAULT 0,
  `unattempted` INT NOT NULL DEFAULT 0,
  `mcq_score` DECIMAL(7,2) NOT NULL DEFAULT 0,
  `subjective_score` DECIMAL(7,2) NOT NULL DEFAULT 0,
  `pending_review` TINYINT(1) NOT NULL DEFAULT 0,
  `submitted_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attempt` (`test_id`,`student_id`),
  CONSTRAINT `fk_att_test` FOREIGN KEY (`test_id`) REFERENCES `tests`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_att_student` FOREIGN KEY (`student_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `attempt_answers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `attempt_id` INT UNSIGNED NOT NULL,
  `question_id` INT UNSIGNED NOT NULL,
  `chosen` TINYINT DEFAULT NULL,                         -- MCQ option index
  `written` TEXT,                                        -- Subjective answer
  `awarded` DECIMAL(6,2) DEFAULT NULL,                   -- NULL = not checked yet
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_aa` (`attempt_id`,`question_id`),
  CONSTRAINT `fk_aa_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `attempts`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_aa_question` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Mock tests (student practice, unlimited attempts) ----------
CREATE TABLE `mock_attempts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `paper_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `score` DECIMAL(7,2) NOT NULL DEFAULT 0,
  `total` DECIMAL(7,2) NOT NULL DEFAULT 0,
  `correct` INT NOT NULL DEFAULT 0,
  `wrong` INT NOT NULL DEFAULT 0,
  `unattempted` INT NOT NULL DEFAULT 0,
  `answers` JSON DEFAULT NULL,
  `submitted_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ma_paper` FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ma_student` FOREIGN KEY (`student_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Study material ----------
CREATE TABLE `materials` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `title` VARCHAR(160) NOT NULL,
  `standard` VARCHAR(30) NOT NULL,
  `subject` VARCHAR(40) NOT NULL,
  `kind` ENUM('Note','Video') NOT NULL,
  `description` VARCHAR(500) DEFAULT '',
  `url` VARCHAR(500) DEFAULT '',                         -- Video link
  `file_name` VARCHAR(200) DEFAULT '',
  `file_path` VARCHAR(300) DEFAULT '',                   -- uploads/ madhil path (Note)
  `created_on` DATE NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `material_batches` (
  `material_id` INT UNSIGNED NOT NULL,
  `batch_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`material_id`,`batch_id`),
  CONSTRAINT `fk_mb_material` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mb_batch` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- LMS courses / lessons / progress ----------
CREATE TABLE `courses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `title` VARCHAR(160) NOT NULL,
  `standard` VARCHAR(30) NOT NULL,
  `target` VARCHAR(20) NOT NULL DEFAULT '',
  `subject` VARCHAR(40) NOT NULL,
  `description` TEXT,
  `status` ENUM('Draft','Published') NOT NULL DEFAULT 'Draft',
  `created_on` DATE NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `lessons` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `course_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `chapter` VARCHAR(120) DEFAULT '',
  `kind` ENUM('Video','Notes','Live class','Practice') NOT NULL DEFAULT 'Video',
  `url` VARCHAR(500) DEFAULT '',
  `minutes` INT DEFAULT 0,
  `when_text` VARCHAR(80) DEFAULT '',                    -- live class schedule ("when")
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_lesson_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `course_progress` (
  `course_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `lesson_id` INT UNSIGNED NOT NULL,
  `done_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`course_id`,`student_id`,`lesson_id`),
  CONSTRAINT `fk_cp_course` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cp_student` FOREIGN KEY (`student_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cp_lesson` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Attendance (manual + biometric + self) ----------
CREATE TABLE `attendance` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` INT UNSIGNED NOT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('Present','Absent','Late','Leave') NOT NULL,
  `in_time` CHAR(5) DEFAULT '',
  `out_time` CHAR(5) DEFAULT '',
  `source` ENUM('Manual','Biometric','Self') NOT NULL DEFAULT 'Manual',
  `note` VARCHAR(200) DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_att_day` (`student_id`,`date`),
  CONSTRAINT `fk_attd_student` FOREIGN KEY (`student_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Notices (for parents) ----------
CREATE TABLE `notices` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `text` VARCHAR(2000) NOT NULL,
  `audience` ENUM('Parents','Students','Everyone') NOT NULL DEFAULT 'Parents',
  `standard` VARCHAR(30) NOT NULL DEFAULT '',
  `pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- ---------- Messages (student / parent -> admin, with reply) ----------
CREATE TABLE `messages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `from_role` ENUM('Student','Parent') NOT NULL DEFAULT 'Student',
  `sender_name` VARCHAR(140) NOT NULL,
  `sender_user_id` INT UNSIGNED DEFAULT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `text` VARCHAR(1000) NOT NULL,
  `reply` VARCHAR(1000) DEFAULT NULL,
  `replied_on` DATETIME DEFAULT NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_msg_student` FOREIGN KEY (`student_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Notifications ----------
CREATE TABLE `notifications` (                           -- admin-side bell
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 1,
  `text` VARCHAR(300) NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `student_notifications` (                   -- student / parent alerts
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_id` INT UNSIGNED NOT NULL,
  `text` VARCHAR(500) NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sn_student` FOREIGN KEY (`student_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Settings (one row per branch) ----------
CREATE TABLE `settings` (
  `branch_id` INT UNSIGNED NOT NULL,
  `institute` VARCHAR(140) NOT NULL,
  `email` VARCHAR(120) DEFAULT '',
  `phone` VARCHAR(30) DEFAULT '',
  `low_score_below` INT NOT NULL DEFAULT 40,
  `notify_email` TINYINT(1) NOT NULL DEFAULT 1,
  `notify_low_score` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`branch_id`)
) ENGINE=InnoDB;

-- ---------- Website forms ----------
CREATE TABLE `enquiries` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(120) DEFAULT '',
  `mobile` VARCHAR(20) DEFAULT '',
  `topic` VARCHAR(120) DEFAULT '',
  `message` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE `demo_requests` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `institute` VARCHAR(160) DEFAULT '',
  `phone` VARCHAR(20) DEFAULT '',
  `need` VARCHAR(500) DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- SEED DATA  (demo logins - production madhe passwords nakki badla!)
-- =====================================================================
INSERT INTO `branches` (`id`,`name`,`code`,`city`,`address`,`phone`,`email`,`brand_name`,`institute_name`,`tagline`,`logo`,`primary_color`,`dark_color`,`domain`,`status`) VALUES
(1,'Nashik (Main Branch)','nashik','Nashik','College Road, Nashik','0253 2000001','nashik@param.in','Sahyadri','Sahyadri Easy Coaching','EASY COACHING • JEE • NEET • MHT-CET','/logo.png','#2563eb','#0a2463',NULL,'Active'),
(2,'Pune Branch','pune','Pune','FC Road, Pune','020 2000002','pune@param.in','Shivneri','Shivneri Academy','SCIENCE ACADEMY • NEET • JEE','','#059669','#064e3b','shivneri.example.com','Active'),
(3,'Mumbai Branch','mumbai','Mumbai','Dadar, Mumbai','022 2000003','mumbai@param.in','Konkan Scholars','Konkan Scholars Institute','MHT-CET • BOARDS • FOUNDATION','','#7c3aed','#3b0764','konkan.example.com','Active');

INSERT INTO `settings` (`branch_id`,`institute`,`email`,`phone`) VALUES
(1,'Sahyadri Easy Coaching','nashik@param.in','0253 2000001'),
(2,'Shivneri Academy','pune@param.in','020 2000002'),
(3,'Konkan Scholars Institute','mumbai@param.in','022 2000003');

-- Demo logins:  superadmin/Super@123  admin/Admin@123  abhijeet/Student@123
--               parent/Parent@123  staff/Staff@123  trainer/Trainer@123
INSERT INTO `users` (`id`,`branch_id`,`role`,`name`,`email`,`username`,`mobile`,`password_hash`) VALUES
(1,0,'superadmin','Super Admin','superadmin@param.in','superadmin','','$6$ngnEECHRNAzZJXpy$t05voy6L/y6mHG/UpOCuBdY/hrC3hrXzuErUE1wtOsTT2gSxza2380nMQEy7FEgytNHxmkjNoKA6Gs4FHXMXC.'),
(2,1,'admin','Institute Admin','admin@param.in','admin','','$6$6wVmlcejmjvcvVpi$lMyiNvxV1SoUj916.dhGibzeAQgVlZwh0myulztYrDD1dO.8jV.hdQtOn9AOhWYYq7lPnMHhpwhpLRDl.iPx8/'),
(3,1,'student','Abhijeet','student@param.in','abhijeet','9876510000','$6$9IK2eMWONgfbfxzX$JYaxCmC26ohUTgQcieLSYQwMpXFzzDoEiCBzSmtcgDtzHEH8yRwVu2ZHpgmYX3SiXFHT9aUzkRYsUCN3XQ5/U/'),
(4,1,'parent','Demo Parent','parent@param.in','parent','','$6$7irmwrS7AxpXjMd7$GfbwDkFKgC/GrXnhM//17ZKxArZjyBB32oPPn0lSxCzMf64PG/.ZDhNtf3XEkh3AuALh5KuzpYxIX.Zc5rCIM0'),
(5,1,'staff','Demo Staff','staff@param.in','staff','','$6$PiSMMrTZIq.4nOsJ$esHH8o22lLxK76.ESbXAqIaUedWAHTm55RwOM745bprqMtbmte8ITGx8Zq3JdzQFhRsCCwIEjOxmZ7Kap3ARB0'),
(6,1,'trainer','Demo Trainer','trainer@param.in','trainer','','$6$WFcWZHUwZgmXiDiE$aROZx70d..NYHPb1FrRQF.SlZxg67g.djLyflON/SqED7VWdkzf1b//C3HYFLuzUZlIICI/jh3k1ZfZ6vdxn.1');

INSERT INTO `registrations` (`id`,`branch_id`,`user_id`,`name`,`mobile`,`standard`,`target`,`medium`,`date_of_birth`,`email`,`parent_name`,`parent_mobile`,`school_name`,`biometric_id`,`status`,`registered_on`) VALUES
(1,1,3,'Abhijeet','9876510000','12th','NEET','English','2008-05-10','student@param.in','Demo Parent','9990000001','City High School','101','Active','2026-10-26');

INSERT INTO `parents` (`user_id`,`branch_id`,`student_id`) VALUES (4,1,1);
