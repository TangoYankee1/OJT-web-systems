# Entity relationships

```mermaid
erDiagram
 users ||--o| students : profile
 users ||--o| faculty : profile
 users ||--o| company_supervisors : profile
 school_departments ||--o{ students : teaches
 companies ||--o{ company_departments : contains
 company_departments ||--o{ company_supervisors : assigns
 students ||--o{ placements : undertakes
 faculty ||--o{ placements : reviews
 company_supervisors |o--o{ placements : supervises
 academic_terms ||--o{ placements : groups
 placements ||--o{ placement_requirements : snapshots
 requirements ||--o{ placement_requirements : template
 placement_requirements ||--o{ uploaded_files : versions
 placements ||--o{ work_schedules : plans
 placements ||--o{ duty_logs : records
 placements ||--o{ evaluations : receives
 evaluations ||--|{ evaluation_scores : snapshots
 evaluation_criteria ||--o{ evaluation_scores : source
 users ||--o{ audit_logs : acts
 users ||--o{ notifications : receives
```

Foreign keys restrict historical deletion. Current upload is a nullable reverse reference added after both tables exist. Services verify ownership. Sessions use adapter-defined primary keys. Migrations include operational migration history and reserved hashed reset tokens.
