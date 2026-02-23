@echo off
:: --- CONFIGURATION ---
:: CHANGE THESE TO MATCH YOUR SETUP
set DB_NAME=gigstr
set DB_USER=root
set DB_PASS=
set BACKUP_DIR=E:\Gigstr_Backups

:: This creates a timestamp like 2024-10-28_0930
set DATE=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%%time:~3,2%
set DATE=%DATE: =0%
set FILE_NAME="%BACKUP_DIR%\ledger_backup_%DATE%.sql"

:: --- CREATE DIRECTORY IF MISSING ---
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: --- ACTIVITY CHECK ---
echo Checking for recent activity...
"C:\xampp\mysql\bin\mysql.exe" -u %DB_USER% -e "SELECT COUNT(*) FROM dates WHERE dateUpdated > NOW() - INTERVAL 1 DAY" %DB_NAME% -N > activity_check.tmp
set /p ACTIVITY=<activity_check.tmp
del activity_check.tmp

:: --- LOGIC ---
:: Get day of week (1=Mon, 2=Tue... 7=Sun)
for /f "tokens=2 delims==" %%a in ('wmic path win32_localtime get dayofweek /value') do set DayOfWeek=%%a

if %ACTIVITY% GTR 0 (
    echo Activity detected in the last 24 hours.
    goto RUN_BACKUP
) else if %DayOfWeek% EQU 1 (
    echo It's Monday! Running the weekly forced backup.
    goto RUN_BACKUP
) else (
    echo No activity detected and not Monday. Skipping backup.
    goto END
)

:RUN_BACKUP
echo Starting Database Dump...
"C:\xampp\mysql\bin\mysqldump.exe" -u %DB_USER% %DB_NAME% > %FILE_NAME%
echo Success! Backup saved to %BACKUP_DIR%

:END
timeout /t 5