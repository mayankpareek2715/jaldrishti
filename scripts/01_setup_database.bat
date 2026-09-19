@echo off
REM JalDrishti - one-time database setup (Windows, PostgreSQL 18.4)
REM Run this from a terminal where `psql` is on PATH (PostgreSQL bin folder).
REM You will be prompted for the postgres user's password twice.

echo Creating database "jaldrishti"...
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE jaldrishti;"

echo Applying schema...
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d jaldrishti -f "%~dp0..\database\schema.sql"

echo Loading demo seed data (Bengaluru localities)...
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d jaldrishti -f "%~dp0..\database\seed.sql"

echo Done. Database "jaldrishti" is ready.
pause
