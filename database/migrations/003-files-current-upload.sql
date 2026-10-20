CREATE TABLE uploaded_files (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  placement_requirement_id INT UNSIGNED NOT NULL,
  uploaded_by INT UNSIGNED NOT NULL,
  storage_key VARCHAR(100) NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  version INT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_file_version (placement_requirement_id,version),
  KEY ix_file_uploader (uploaded_by),
  CONSTRAINT fk_file_requirement FOREIGN KEY (placement_requirement_id) REFERENCES placement_requirements(id) ON DELETE RESTRICT,
  CONSTRAINT fk_file_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE placement_requirements ADD KEY ix_pr_upload (current_upload_id), ADD CONSTRAINT fk_requirement_current_upload FOREIGN KEY (current_upload_id) REFERENCES uploaded_files(id) ON DELETE RESTRICT;
