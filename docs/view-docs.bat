@echo off
REM OpenClaw Agent Registry - View API Documentation
REM Created: 2026-04-09

title OpenClaw API Documentation Viewer

echo.
echo ========================================
echo  OpenClaw Agent Registry API Documentation
echo ========================================
echo.

REM 检查是否已安装 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python and try again.
    pause
    exit /b 1
)

REM 检查是否需要安装 http.server
python -c "from http.server import serve_simple" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Starting documentation server...
)

echo [INFO] Documentation location: %CD%\docs
echo.
echo [INFO] Opening browser to: http://localhost:8000/docs/
echo.
echo [INFO] Press Ctrl+C to stop the server
echo.

REM 切换到 docs 目录
cd /d "%~dp0docs"

REM 启动本地服务器
python -m http.server 8000

echo.
echo ========================================
echo  Documentation server stopped
echo ========================================
pause
