# Data dictionary

Generated from the six numbered SQL migrations. Each definition below includes exact type, nullability, defaults, checks, keys and deletion rules. Business IDs are unsigned INT. Timestamps are UTC DATETIME(3), local work dates are DATE, rubric scores DECIMAL(7,2).

## school_departments

Source: 001-identity-directories.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| code | code VARCHAR(30) NOT NULL UNIQUE |
| name | name VARCHAR(150) NOT NULL |
| is_active | is_active TINYINT(1) NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)) |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |

## academic_terms

Source: 001-identity-directories.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| academic_year | academic_year VARCHAR(9) NOT NULL |
| semester | semester VARCHAR(20) NOT NULL |
| start_date | start_date DATE NOT NULL |
| end_date | end_date DATE NOT NULL |
| is_active | is_active TINYINT(1) NOT NULL DEFAULT 0 CHECK (is_active IN (0,1)) |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| UNIQUE | UNIQUE KEY uq_term (academic_year,semester) |
| CONSTRAINT | CONSTRAINT chk_term_dates CHECK (end_date >= start_date) |

## users

Source: 001-identity-directories.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| email | email VARCHAR(254) NOT NULL UNIQUE |
| password_hash | password_hash VARCHAR(255) NOT NULL |
| full_name | full_name VARCHAR(150) NOT NULL |
| role | role VARCHAR(20) NOT NULL CHECK (role IN ('admin','faculty','student','supervisor')) |
| is_active | is_active TINYINT(1) NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)) |
| must_change_password | must_change_password TINYINT(1) NOT NULL DEFAULT 1 CHECK (must_change_password IN (0,1)) |
| session_version | session_version INT UNSIGNED NOT NULL DEFAULT 1 |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |

## students

Source: 001-identity-directories.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| user_id | user_id INT UNSIGNED NOT NULL UNIQUE |
| student_number | student_number VARCHAR(40) NOT NULL UNIQUE |
| course | course VARCHAR(80) NOT NULL |
| year_level | year_level TINYINT UNSIGNED NOT NULL CHECK (year_level BETWEEN 1 AND 6) |
| school_department_id | school_department_id INT UNSIGNED NOT NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| KEY | KEY ix_students_department (school_department_id) |
| CONSTRAINT | CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_student_department FOREIGN KEY (school_department_id) REFERENCES school_departments(id) ON DELETE RESTRICT |

## faculty

Source: 001-identity-directories.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| user_id | user_id INT UNSIGNED NOT NULL UNIQUE |
| employee_number | employee_number VARCHAR(40) NOT NULL UNIQUE |
| school_department_id | school_department_id INT UNSIGNED NOT NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| KEY | KEY ix_faculty_department (school_department_id) |
| CONSTRAINT | CONSTRAINT fk_faculty_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_faculty_department FOREIGN KEY (school_department_id) REFERENCES school_departments(id) ON DELETE RESTRICT |

## companies

Source: 001-identity-directories.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| name | name VARCHAR(180) NOT NULL |
| address | address TEXT NOT NULL |
| contact_email | contact_email VARCHAR(254) NULL |
| contact_phone | contact_phone VARCHAR(30) NULL |
| is_active | is_active TINYINT(1) NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)) |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |

## company_departments

Source: 001-identity-directories.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| company_id | company_id INT UNSIGNED NOT NULL |
| department_name | department_name VARCHAR(150) NOT NULL |
| is_active | is_active TINYINT(1) NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)) |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| UNIQUE | UNIQUE KEY uq_company_department (company_id,department_name) |
| CONSTRAINT | CONSTRAINT fk_department_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT |

## company_supervisors

Source: 001-identity-directories.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| user_id | user_id INT UNSIGNED NOT NULL UNIQUE |
| company_department_id | company_department_id INT UNSIGNED NOT NULL |
| position | position VARCHAR(100) NULL |
| contact_phone | contact_phone VARCHAR(30) NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| KEY | KEY ix_supervisor_department (company_department_id) |
| CONSTRAINT | CONSTRAINT fk_supervisor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_supervisor_department FOREIGN KEY (company_department_id) REFERENCES company_departments(id) ON DELETE RESTRICT |

## placements

Source: 002-placements-requirements.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| student_id | student_id INT UNSIGNED NOT NULL |
| faculty_id | faculty_id INT UNSIGNED NOT NULL |
| supervisor_id | supervisor_id INT UNSIGNED NULL |
| academic_term_id | academic_term_id INT UNSIGNED NOT NULL |
| deployment_type | deployment_type VARCHAR(10) NOT NULL CHECK (deployment_type IN ('company','school')) |
| company_department_id | company_department_id INT UNSIGNED NULL |
| school_department_id | school_department_id INT UNSIGNED NULL |
| start_date | start_date DATE NOT NULL |
| end_date | end_date DATE NOT NULL |
| required_minutes | required_minutes INT UNSIGNED NOT NULL CHECK (required_minutes > 0) |
| status | status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','active','completed','rejected','cancelled')) |
| status_remarks | status_remarks TEXT NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| live_student_id | live_student_id INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status IN ('pending','approved','active') THEN student_id ELSE NULL END) PERSISTENT |
| UNIQUE | UNIQUE KEY uq_live_student (live_student_id) |
| KEY | KEY ix_placement_faculty (faculty_id,status) |
| KEY | KEY ix_placement_supervisor (supervisor_id,status) |
| KEY | KEY ix_placement_student (student_id,status) |
| KEY | KEY ix_placement_term (academic_term_id,status) |
| KEY | KEY ix_placement_company (company_department_id) |
| KEY | KEY ix_placement_school (school_department_id) |
| CONSTRAINT | CONSTRAINT fk_placement_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_placement_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_placement_supervisor FOREIGN KEY (supervisor_id) REFERENCES company_supervisors(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_placement_term FOREIGN KEY (academic_term_id) REFERENCES academic_terms(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_placement_company FOREIGN KEY (company_department_id) REFERENCES company_departments(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_placement_school FOREIGN KEY (school_department_id) REFERENCES school_departments(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT chk_placement_dates CHECK (end_date >= start_date) |
| CONSTRAINT | CONSTRAINT chk_placement_host CHECK ((deployment_type='company' AND company_department_id IS NOT NULL AND school_department_id IS NULL) OR (deployment_type='school' AND school_department_id IS NOT NULL AND company_department_id IS NULL AND supervisor_id IS NULL)) |

## requirements

Source: 002-placements-requirements.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| code | code VARCHAR(40) NOT NULL UNIQUE |
| title | title VARCHAR(180) NOT NULL |
| description | description TEXT NOT NULL |
| stage | stage VARCHAR(20) NOT NULL CHECK (stage IN ('pre_deployment','ongoing','completion')) |
| is_required | is_required TINYINT(1) NOT NULL DEFAULT 1 CHECK (is_required IN (0,1)) |
| is_active | is_active TINYINT(1) NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)) |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |

## placement_requirements

Source: 002-placements-requirements.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| placement_id | placement_id INT UNSIGNED NOT NULL |
| requirement_id | requirement_id INT UNSIGNED NOT NULL |
| title_snapshot | title_snapshot VARCHAR(180) NOT NULL |
| stage_snapshot | stage_snapshot VARCHAR(20) NOT NULL CHECK (stage_snapshot IN ('pre_deployment','ongoing','completion')) |
| is_required_snapshot | is_required_snapshot TINYINT(1) NOT NULL CHECK (is_required_snapshot IN (0,1)) |
| status | status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected')) |
| current_upload_id | current_upload_id INT UNSIGNED NULL |
| submitted_at | submitted_at DATETIME(3) NULL |
| verified_by | verified_by INT UNSIGNED NULL |
| verified_at | verified_at DATETIME(3) NULL |
| remarks | remarks TEXT NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| UNIQUE | UNIQUE KEY uq_placement_requirement (placement_id,requirement_id) |
| KEY | KEY ix_pr_requirement (requirement_id) |
| KEY | KEY ix_pr_reviewer (verified_by) |
| CONSTRAINT | CONSTRAINT fk_requirement_placement FOREIGN KEY (placement_id) REFERENCES placements(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_requirement_template FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_requirement_reviewer FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE RESTRICT |

## uploaded_files

Source: 003-files-current-upload.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| placement_requirement_id | placement_requirement_id INT UNSIGNED NOT NULL |
| uploaded_by | uploaded_by INT UNSIGNED NOT NULL |
| storage_key | storage_key VARCHAR(100) NOT NULL UNIQUE |
| original_name | original_name VARCHAR(255) NOT NULL |
| mime_type | mime_type VARCHAR(100) NOT NULL |
| size_bytes | size_bytes INT UNSIGNED NOT NULL |
| sha256 | sha256 CHAR(64) NOT NULL |
| version | version INT UNSIGNED NOT NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| UNIQUE | UNIQUE KEY uq_file_version (placement_requirement_id,version) |
| KEY | KEY ix_file_uploader (uploaded_by) |
| CONSTRAINT | CONSTRAINT fk_file_requirement FOREIGN KEY (placement_requirement_id) REFERENCES placement_requirements(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_file_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT |

## work_schedules

Source: 004-schedules-duty-logs.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| placement_id | placement_id INT UNSIGNED NOT NULL |
| weekday | weekday TINYINT UNSIGNED NOT NULL CHECK (weekday BETWEEN 1 AND 7) |
| start_time | start_time TIME NOT NULL |
| end_time | end_time TIME NOT NULL |
| break_minutes | break_minutes SMALLINT UNSIGNED NOT NULL |
| effective_from | effective_from DATE NOT NULL |
| effective_to | effective_to DATE NOT NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| KEY | KEY ix_schedule_placement (placement_id) |
| CONSTRAINT | CONSTRAINT fk_schedule_placement FOREIGN KEY (placement_id) REFERENCES placements(id) ON DELETE RESTRICT |
| CHECK | CHECK (effective_to >= effective_from) |
| CHECK | CHECK (end_time > start_time) |
| CHECK | CHECK (break_minutes < TIME_TO_SEC(TIMEDIFF(end_time,start_time))/60) |

## duty_logs

Source: 004-schedules-duty-logs.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| placement_id | placement_id INT UNSIGNED NOT NULL |
| work_date | work_date DATE NOT NULL |
| clock_in | clock_in DATETIME(3) NOT NULL |
| clock_out | clock_out DATETIME(3) NOT NULL |
| break_minutes | break_minutes SMALLINT UNSIGNED NOT NULL |
| credited_minutes | credited_minutes INT UNSIGNED NOT NULL |
| status | status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')) |
| reviewed_by | reviewed_by INT UNSIGNED NULL |
| reviewed_at | reviewed_at DATETIME(3) NULL |
| remarks | remarks TEXT NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| KEY | KEY ix_duty_status_date (placement_id,status,work_date) |
| KEY | KEY ix_duty_reviewer (reviewed_by) |
| CONSTRAINT | CONSTRAINT fk_duty_placement FOREIGN KEY (placement_id) REFERENCES placements(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_duty_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT |
| CHECK | CHECK (clock_out > clock_in) |
| CHECK | CHECK (credited_minutes > 0) |

## evaluation_criteria

Source: 005-evaluations.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| rubric_version | rubric_version INT UNSIGNED NOT NULL |
| code | code VARCHAR(40) NOT NULL |
| label | label VARCHAR(180) NOT NULL |
| max_score | max_score DECIMAL(7,2) NOT NULL CHECK (max_score > 0) |
| sort_order | sort_order SMALLINT UNSIGNED NOT NULL |
| is_active | is_active TINYINT(1) NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)) |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| UNIQUE | UNIQUE KEY uq_rubric_code (rubric_version,code) |

## evaluations

Source: 005-evaluations.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| placement_id | placement_id INT UNSIGNED NOT NULL |
| evaluator_id | evaluator_id INT UNSIGNED NOT NULL |
| type | type VARCHAR(10) NOT NULL CHECK (type IN ('midterm','final')) |
| rubric_version | rubric_version INT UNSIGNED NOT NULL |
| status | status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','finalized')) |
| remarks | remarks TEXT NULL |
| submitted_at | submitted_at DATETIME(3) NULL |
| finalized_by | finalized_by INT UNSIGNED NULL |
| finalized_at | finalized_at DATETIME(3) NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| UNIQUE | UNIQUE KEY uq_placement_evaluation (placement_id,type) |
| KEY | KEY ix_evaluator (evaluator_id) |
| KEY | KEY ix_finalizer (finalized_by) |
| CONSTRAINT | CONSTRAINT fk_evaluation_placement FOREIGN KEY (placement_id) REFERENCES placements(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_evaluation_author FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_evaluation_finalizer FOREIGN KEY (finalized_by) REFERENCES users(id) ON DELETE RESTRICT |

## evaluation_scores

Source: 005-evaluations.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| evaluation_id | evaluation_id INT UNSIGNED NOT NULL |
| criterion_id | criterion_id INT UNSIGNED NOT NULL |
| label_snapshot | label_snapshot VARCHAR(180) NOT NULL |
| max_score_snapshot | max_score_snapshot DECIMAL(7,2) NOT NULL CHECK (max_score_snapshot > 0) |
| score | score DECIMAL(7,2) NULL |
| remarks | remarks TEXT NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| updated_at | updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) |
| UNIQUE | UNIQUE KEY uq_evaluation_criterion (evaluation_id,criterion_id) |
| KEY | KEY ix_score_criterion (criterion_id) |
| CONSTRAINT | CONSTRAINT fk_score_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE RESTRICT |
| CONSTRAINT | CONSTRAINT fk_score_criterion FOREIGN KEY (criterion_id) REFERENCES evaluation_criteria(id) ON DELETE RESTRICT |
| CHECK | CHECK (score IS NULL OR (score >= 0 AND score <= max_score_snapshot)) |

## sessions

Source: 006-sessions-audit-notifications.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| session_id | session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY |
| expires | expires INT UNSIGNED NOT NULL |
| data | data MEDIUMTEXT COLLATE utf8mb4_bin |

## audit_logs

Source: 006-sessions-audit-notifications.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| actor_id | actor_id INT UNSIGNED NULL |
| action | action VARCHAR(80) NOT NULL |
| entity_type | entity_type VARCHAR(50) NOT NULL |
| entity_id | entity_id INT UNSIGNED NULL |
| details_json | details_json LONGTEXT NOT NULL CHECK (JSON_VALID(details_json)) |
| request_id | request_id VARCHAR(64) NOT NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| KEY | KEY ix_audit_time (created_at,id) |
| KEY | KEY ix_audit_actor (actor_id) |
| CONSTRAINT | CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT |

## notifications

Source: 006-sessions-audit-notifications.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| recipient_id | recipient_id INT UNSIGNED NOT NULL |
| event_type | event_type VARCHAR(60) NOT NULL |
| entity_type | entity_type VARCHAR(50) NOT NULL |
| entity_id | entity_id INT UNSIGNED NOT NULL |
| message | message VARCHAR(500) NOT NULL |
| read_at | read_at DATETIME(3) NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| KEY | KEY ix_notification_recipient (recipient_id,read_at,created_at) |
| CONSTRAINT | CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE RESTRICT |

## password_reset_tokens

Source: 006-sessions-audit-notifications.sql. InnoDB; utf8mb4_unicode_ci (sessions uses utf8mb4_bin).

| Column / constraint | Exact SQL definition |
| --- | --- |
| id | id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY |
| user_id | user_id INT UNSIGNED NOT NULL |
| token_hash | token_hash CHAR(64) NOT NULL UNIQUE |
| expires_at | expires_at DATETIME(3) NOT NULL |
| consumed_at | consumed_at DATETIME(3) NULL |
| created_at | created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) |
| KEY | KEY ix_reset_user (user_id) |
| CONSTRAINT | CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT |

## Deferred upload reference

003-files-current-upload.sql adds placement_requirements.current_upload_id -> uploaded_files.id with ON DELETE RESTRICT and ix_pr_upload. Services additionally check current upload ownership.

## schema_migrations

Bootstrapped by scripts/migrate.js before the six files: id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, version VARCHAR(150) NOT NULL UNIQUE, checksum CHAR(64) NOT NULL, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), InnoDB/utf8mb4_unicode_ci. Applied filenames/checksums are immutable.

## State and business rules

One live placement is enforced by the student-row transaction lock and generated nullable live_student_id unique key. Hosts are mutually exclusive, historical references RESTRICT deletion, requirements/rubrics are snapshots, and all score checks use the snapshot maximum. Sessions exactly match express-mysql-session 3.0.3 schema.sql; createDatabaseTable is disabled. See decisions.md for application constraints and actor rules.

