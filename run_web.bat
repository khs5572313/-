@echo off
chcp 65001 >nul
REM 판독 웹앱 실행: http://127.0.0.1:8000
cd /d %~dp0
if exist .env for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do set "%%a=%%b"
python -m uvicorn webapp.server:app --host 127.0.0.1 --port 8000
pause
