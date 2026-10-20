CREATE TABLE work_schedules (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  placement_id INT UNSIGNED NOT NULL,
  weekday TINYINT UNSIGNED NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes SMALLINT UNSIGNED NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ix_schedule_placement (placement_id),
  CONSTRAINT fk_schedule_placement FOREIGN KEY (placement_id) REFERENCES placements(id) ON DELETE RESTRICT,
  CHECK (effective_to >= effective_from),
  CHECK (end_time > start_time),
  CHECK (break_minutes < TIME_TO_SEC(TIMEDIFF(end_time,start_time))/60)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE duty_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  placement_id INT UNSIGNED NOT NULL,
  work_date DATE NOT NULL,
  clock_in DATETIME(3) NOT NULL,
  clock_out DATETIME(3) NOT NULL,
  break_minutes SMALLINT UNSIGNED NOT NULL,
  credited_minutes INT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  remarks TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY ix_duty_status_date (placement_id,status,work_date),
  KEY ix_duty_reviewer (reviewed_by),
  CONSTRAINT fk_duty_placement FOREIGN KEY (placement_id) REFERENCES placements(id) ON DELETE RESTRICT,
  CONSTRAINT fk_duty_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT,
  CHECK (clock_out > clock_in),
  CHECK (credited_minutes > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

