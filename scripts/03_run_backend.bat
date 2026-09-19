@echo off
REM JalDrishti - starts the Spring Boot backend on port 8080.
REM Set DB_USERNAME / DB_PASSWORD env vars first if your postgres credentials differ
REM from the defaults in backend/src/main/resources/application.yml.
cd /d "%~dp0..\backend"
mvn spring-boot:run
