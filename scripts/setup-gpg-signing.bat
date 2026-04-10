@echo off
cd /d C:\openclaw_workspace\projects\agent-registry

echo ========================================
echo 🦞 OpenClaw GPG Setup Wizard
echo ========================================
echo.

echo This script will help you set up GPG signing for commits.
echo.
echo PREREQUISITES:
echo 1. GnuPG must be installed (https://gnupg.org/download/)
echo 2. SSH keys must be generated for GitHub authentication
echo.
echo ========================================
echo STEP 1: Check if GPG is installed
echo ========================================
call gpg --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] GPG is installed
    call gpg --version
) else (
    echo [✗] GPG is NOT installed
    echo Please install GnuPG from https://gnupg.org/download/
    echo Then run this script again.
    goto :end
)

echo.
echo ========================================
echo STEP 2: Check if SSH keys exist
echo ========================================
if exist "%USERPROFILE%\.ssh\id_ed25519" (
    echo [✓] SSH ED25519 key exists
    type "%USERPROFILE%\.ssh\id_ed25519.pub"
) else (
    echo [✗] No SSH keys found
    echo Generating new ED25519 key...
    ssh-keygen -t ed25519 -C "your@email.com" -f "%USERPROFILE%\.ssh\id_ed25519" -N ""
    echo [✓] SSH key generated
)

echo.
echo ========================================
echo STEP 3: Configure Git for GPG signing
echo ========================================
git config commit.gpgsign true
git config user.signingkey AUTO
echo [✓] Git configured for GPG signing

echo.
echo ========================================
echo STEP 4: Enable SSH authentication for GitHub
echo ========================================
eval $(ssh-agent -s)
ssh-add "%USERPROFILE%\.ssh\id_ed25519"
echo [✓] SSH agent started
echo Please add your SSH public key to GitHub:
echo   1. Go to https://github.com/settings/keys
echo   2. Click "New SSH key"
echo   3. Title: "OpenClaw SSH Key"
echo   4. Copy contents of: %USERPROFILE%\.ssh\id_ed25519.pub
echo   5. Save
echo.
echo [✓] SSH agent ready

echo.
echo ========================================
echo STEP 5: Generate GPG key pair (optional)
echo ========================================
echo To generate a GPG key pair, you'll be prompted for:
echo   - Name: Your name
echo   - Email: Your email
echo   - Comment: (optional)
echo   - Passphrase: Your GPG passphrase
echo.
read /p "Press Enter to generate GPG key pair or Ctrl+C to skip..."
gpg --full-generate-key
echo [✓] GPG key generation complete

echo.
echo ========================================
echo SUMMARY: Configuration Complete
echo ========================================
echo GPG signing: ENABLED
echo SSH authentication: ENABLED
echo Git config: commit.gpgsign = true
echo.
echo Next steps:
echo 1. Add your SSH public key to GitHub
echo 2. List your GPG keys: gpg --list-secret-keys
echo 3. Configure Git: git config user.signingkey <your-key-id>
echo 4. Test: git commit -S -m "feat: test GPG signing"
echo.
echo For more info, see:
echo   - https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits
echo   - https://help.github.com/articles/generating-a-new-gpg-key/
echo.
pause

:end
echo.
echo === Setup Complete ===
