# Seeds

Executable reference and opt-in demonstration seeds live in backend/scripts/seed.js because passwords must be hashed in Node and supplied outside Git.

- npm run db:seed from backend installs missing stable reference codes without resetting institution-edited values.
- Set DEMO_PASSWORD temporarily, then npm run db:seed -- --demo to create labeled synthetic companies, students, faculty, supervisor and pending/rejected placements. Development/test only; repeat execution retains existing records/passwords.
- Demo hours (486) are illustrative. Replace reference templates, term and rubric with approved policy before institutional use.

No working password or private document belongs in a SQL seed.
