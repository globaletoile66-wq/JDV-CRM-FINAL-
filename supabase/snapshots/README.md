# JDV CRM - Supabase current-state snapshot

Source:
- Supabase project: arxhppptxeeyeexkdyjv
- Repository: globaletoile66-wq/JDV-CRM-FINAL-

Files:
- current_database_schema.sql: PostgreSQL schema-only dump of the remote database. It contains database objects such as tables, constraints, indexes, functions, triggers, views, policies and related schema definitions available to pg_dump. It intentionally contains no table data.
- remote_migration_history.txt: migration history reported by the linked Supabase project.

Safety:
- This workflow does not run supabase migration repair.
- It does not reset, drop or alter the Supabase database.
- It does not fabricate historical migration SQL.
- Production table data and live authentication records are not committed to GitHub.
- The seven existing historical migration SQL files remain untouched.

Important:
This snapshot represents the current database structure, not a reconstruction of every historical migration body.
