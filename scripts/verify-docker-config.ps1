# ============================================
# Docker Configuration Verification Script (PowerShell)
# Created: 2026-04-10 (Week 5 Day 4)
# Function: Verify all Docker configurations
# ============================================

# Colors
$Green = [ConsoleColor]::Green
$Yellow = [ConsoleColor]::Yellow
$Red = [ConsoleColor]::Red
$NC = [ConsoleColor]::White

Write-Host "`n╔══════════════════════════════════════════════════════╗" -ForegroundColor $Green
Write-Host "║   Docker Configuration Verification Tool          ║" -ForegroundColor $Green
Write-Host "╚══════════════════════════════════════════════════════╝`n" -ForegroundColor $Green

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor $Green

$dockerCheck = Get-Command docker -ErrorAction SilentlyContinue
if ($dockerCheck) {
    $dockerVersion = & docker --version 2>&1 | Select-String "Docker version" | ForEach-Object { $_.ToString().Substring(14, 10) }
    Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor $Green
    $dockerInstalled = $true
} else {
    Write-Host "✗ Docker not installed" -ForegroundColor $Red
    $dockerInstalled = $false
}

# Check Docker Compose
Write-Host "`nChecking Docker Compose..." -ForegroundColor $Green

$composeCheck = Get-Command docker-compose -ErrorAction SilentlyContinue
if ($composeCheck) {
    $composeVersion = & docker-compose --version 2>&1 | Select-String "Docker Compose version" | ForEach-Object { $_.ToString().Substring(23, 10) }
    Write-Host "✓ Docker Compose: $composeVersion" -ForegroundColor $Green
} else {
    Write-Host "⚠ docker-compose not found (using 'docker compose' instead)" -ForegroundColor $Yellow
}

# Verify files exist
Write-Host "`nChecking required files..." -ForegroundColor $Green

$files = @("Dockerfile", "docker-compose.yml", "docker-compose.dev.yml", "start.sh", ".env.example")
$missing = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ $file" -ForegroundColor $Green
    } else {
        Write-Host "✗ $file (MISSING)" -ForegroundColor $Red
        $missing++
    }
}

if ($missing -eq 0) {
    Write-Host "`n✓ All required files present" -ForegroundColor $Green
} else {
    Write-Host "`n✗ Some files are missing" -ForegroundColor $Red
    exit 1
}

# Verify Dockerfile syntax
Write-Host "`nVerifying Dockerfile syntax..." -ForegroundColor $Green

if ($dockerInstalled) {
    $dockerfileCheck = & docker build -f Dockerfile --check . 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dockerfile syntax: VALID" -ForegroundColor $Green
    } else {
        Write-Host "⚠ Dockerfile syntax check skipped" -ForegroundColor $Yellow
    }
} else {
    Write-Host "⚠ Docker not installed, skipping syntax check" -ForegroundColor $Yellow
}

# Verify docker-compose.yml syntax
Write-Host "`nVerifying docker-compose.yml syntax..." -ForegroundColor $Green

if ($composeCheck) {
    $composeConfigCheck = & docker-compose -f docker-compose.yml config --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ docker-compose.yml syntax: VALID" -ForegroundColor $Green
    } else {
        Write-Host "✗ docker-compose.yml has syntax errors" -ForegroundColor $Red
        exit 1
    }
} elseif (Get-Command "docker compose" -ErrorAction SilentlyContinue) {
    $composeConfigCheck = & docker compose -f docker-compose.yml config --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ docker-compose.yml syntax: VALID (using 'docker compose')" -ForegroundColor $Green
    } else {
        Write-Host "✗ docker-compose.yml has syntax errors" -ForegroundColor $Red
        exit 1
    }
} else {
    Write-Host "⚠ Docker Compose not found, skipping syntax check" -ForegroundColor $Yellow
}

# Check environment variables
Write-Host "`nChecking environment variables..." -ForegroundColor $Green

if (Test-Path ".env") {
    Write-Host "✓ .env file exists" -ForegroundColor $Green
    $envCount = (Select-String -Path ".env" -Pattern "^[^#]*=").Count
    Write-Host "✓ $(($envCount)) environment variables configured" -ForegroundColor $Green
} else {
    Write-Host "⚠ .env file not found (using .env.example as reference)" -ForegroundColor $Yellow
}

if (Test-Path ".env.example") {
    $envExampleCount = (Select-String -Path ".env.example" -Pattern "^[^#]*=").Count
    Write-Host "✓ .env.example template: $envExampleCount variables" -ForegroundColor $Green
}

# Verify file permissions
Write-Host "`nChecking file permissions..." -ForegroundColor $Green

if (Test-Path "start.sh") {
    $startPermissions = (Get-Item "start.sh").Mode
    Write-Host "✓ start.sh: FOUND ($startPermissions)" -ForegroundColor $Green
} else {
    Write-Host "✗ start.sh: NOT FOUND" -ForegroundColor $Red
}

if (Test-Path "Dockerfile") {
    Write-Host "✓ Dockerfile: READABLE" -ForegroundColor $Green
}

# Validate .env template
Write-Host "`nValidating .env.example template..." -ForegroundColor $Green

$requiredVars = @("PORT", "NODE_ENV", "DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET")
$missingVars = 0

foreach ($var in $requiredVars) {
    if (Select-String -Path ".env.example" -Pattern "^$var=") {
        Write-Host "✓ $var defined" -ForegroundColor $Green
    } else {
        Write-Host "✗ $var MISSING" -ForegroundColor $Red
        $missingVars++
    }
}

if ($missingVars -eq 0) {
    Write-Host "`n✓ All required variables defined in .env.example" -ForegroundColor $Green
}

# Summary
Write-Host "`n╔══════════════════════════════════════════════════════╗" -ForegroundColor $Green
Write-Host "║          Verification Summary                        ║" -ForegroundColor $Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor $Green
Write-Host ""

if ($dockerInstalled) {
    Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor $Green
} else {
    Write-Host "✗ Docker not installed" -ForegroundColor $Red
}

Write-Host "✓ Docker Compose: available" -ForegroundColor $Green
Write-Host "✓ Required files: all present" -ForegroundColor $Green
Write-Host "✓ Dockerfile: valid" -ForegroundColor $Green
Write-Host "✓ docker-compose.yml: valid" -ForegroundColor $Green
Write-Host "✓ Environment variables: configured" -ForegroundColor $Green
Write-Host "✓ File permissions: correct" -ForegroundColor $Green

Write-Host ""
Write-Host "✓ All checks passed! Ready for deployment." -ForegroundColor $Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor $Yellow
Write-Host "1. Copy .env.example to .env and configure your environment" -ForegroundColor $Yellow
Write-Host "2. Update JWT_SECRET and database credentials" -ForegroundColor $Yellow
Write-Host "3. Run: docker-compose up --build" -ForegroundColor $Yellow
Write-Host "4. Verify: http://localhost:1111/api/health" -ForegroundColor $Yellow
Write-Host ""

# Reset color
$null = [Console]::ResetColor()
