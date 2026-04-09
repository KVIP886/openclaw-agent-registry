@echo off
REM OpenClaw API Documentation - Build and Preview
REM Created: 2026-04-09

title OpenClaw API Documentation Builder

echo.
echo ========================================
echo  OpenClaw API Documentation Builder
echo ========================================
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

echo [INFO] Node.js version: %node_version%
node --version | findstr /C:"v" >nul 2>&1 || (
    node --version
)

REM 检查是否已安装 Redoc CLI
where redoc-cli >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing Redoc CLI...
    npm install -g redoc-cli
)

REM 检查是否已安装 Swagger CLI
where swagger-cli >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing Swagger CLI...
    npm install -g swagger-cli
)

echo.
echo [INFO] Building documentation...
echo.

REM 创建 dist 目录
if not exist "%~dp0dist" mkdir "%~dp0dist"

REM 构建 Redoc HTML
echo [1/3] Building Redoc HTML...
redoc-cli build "%~dp0docs\openapi.yaml" -o "%~dp0dist\redoc.html" --options hideHostname --options sortPropsAlphabetically --options.theme.openapi.color.primary="#1a73e8"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build Redoc HTML
    pause
    exit /b 1
)

REM 构建 Swagger YAML
echo [2/3] Bundling Swagger YAML...
swagger-cli bundle "%~dp0docs\openapi.yaml" -o "%~dp0dist\swagger-bundled.yaml" --format yaml
if %errorlevel% neq 0 (
    echo [ERROR] Failed to bundle Swagger YAML
    pause
    exit /b 1
)

REM 复制文档文件
echo [3/3] Copying documentation files...
copy "%~dp0docs\openapi.yaml" "%~dp0dist\" >nul
copy "%~dp0docs\README.md" "%~dp0dist\" >nul
copy "%~dp0docs\CI_CD_CONFIG.md" "%~dp0dist\" >nul

echo.
echo ========================================
echo  ✅ Documentation build completed!
echo ========================================
echo.
echo Output directory: %~dp0dist
echo.
echo Files created:
echo   - redoc.html (interactive API documentation)
echo   - swagger-bundled.yaml (consolidated OpenAPI spec)
echo   - openapi.yaml (original spec)
echo   - README.md (documentation guide)
echo   - CI_CD_CONFIG.md (CI/CD configuration)
echo.
echo To view documentation, run:
echo   start "%~dp0dist\redoc.html"
echo.

REM 询问是否立即查看
set /p VIEW="Would you like to view the documentation now? (Y/N): "
if /i "%VIEW%"=="Y" (
    start "%~dp0dist\redoc.html"
)

echo.
pause
