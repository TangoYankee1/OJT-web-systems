CREATE TABLE evaluation_criteria (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  rubric_version INT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL,
  label VARCHAR(180) NOT NULL,
  max_score DECIMAL(7,2) NOT NULL CHECK (max_score > 0),
  sort_order SMALLINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_rubric_code (rubric_version,code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE evaluations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  placement_id INT UNSIGNED NOT NULL,
  evaluator_id INT UNSIGNED NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('midterm','final')),
  rubric_version INT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','finalized')),
  remarks TEXT NULL,
  submitted_at DATETIME(3) NULL,
  finalized_by INT UNSIGNED NULL,
  finalized_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_placement_evaluation (placement_id,type),
  KEY ix_evaluator (evaluator_id),
  KEY ix_finalizer (finalized_by),
  CONSTRAINT fk_evaluation_placement FOREIGN KEY (placement_id) REFERENCES placements(id) ON DELETE RESTRICT,
  CONSTRAINT fk_evaluation_author FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_evaluation_finalizer FOREIGN KEY (finalized_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE evaluation_scores (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  evaluation_id INT UNSIGNED NOT NULL,
  criterion_id INT UNSIGNED NOT NULL,
  label_snapshot VARCHAR(180) NOT NULL,
  max_score_snapshot DECIMAL(7,2) NOT NULL CHECK (max_score_snapshot > 0),
  score DECIMAL(7,2) NULL,
  remarks TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_evaluation_criterion (evaluation_id,criterion_id),
  KEY ix_score_criterion (criterion_id),
  CONSTRAINT fk_score_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_score_criterion FOREIGN KEY (criterion_id) REFERENCES evaluation_criteria(id) ON DELETE RESTRICT,
  CHECK (score IS NULL OR (score >= 0 AND score <= max_score_snapshot))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

