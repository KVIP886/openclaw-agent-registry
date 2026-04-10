@echo off
cd /d C:\openclaw_workspace\projects\agent-registry

echo ========================================
echo 🦞 SSH Key Setup for GitHub
echo ========================================
echo.

echo Step 1: Generate new SSH ED25519 key (if you don't have one)
echo.

if exist "%USERPROFILE%\.ssh\id_ed25519" (
    echo [✓] SSH ED25519 key already exists at: %USERPROFILE%\.ssh\id_ed25519
    echo.
    echo Current SSH key contents:
    echo ----------------------------------------
    type "%USERPROFILE%\.ssh\id_ed25519.pub"
    echo ----------------------------------------
    echo.
) else (
    echo Generating new ED25519 key...
    ssh-keygen -t ed25519 -C "kvip886@users.noreply.github.com" -f "%USERPROFILE%\.ssh\id_ed25519" -N ""
    echo [✓] New SSH ED25519 key generated
    echo.
    echo New key contents:
    echo ----------------------------------------
    type "%USERPROFILE%\.ssh\id_ed25519.pub"
    echo ----------------------------------------
    echo.
)

echo Step 2: Configure Git to use SSH for GitHub
echo.
git remote set-url origin git@github.com:KVIP886/openclaw-agent-registry.git
echo [✓] Git remote URL updated to SSH
echo.

echo Step 3: Add SSH key to ssh-agent
echo.
eval $(ssh-agent -s)
echo [✓] SSH agent started
echo Agent PID: %SSH_AUTH_SOCK%
echo.

echo Step 4: Add your SSH key to the agent
echo.
ssh-add "%USERPROFILE%\.ssh\id_ed25519"
echo [✓] SSH key added to agent
echo.

echo Step 5: Instructions to add SSH key to GitHub
echo.
echo IMPORTANT: You must manually add your SSH public key to GitHub:
echo.
echo 1. Copy the key content above (from "ssh-ed25519" to end)
echo 2. Go to: https://github.com/settings/keys
echo 3. Click "New SSH key" button
echo 4. Title: "OpenClaw SSH Key"
echo 5. Paste the key content
echo 6. Click "Add SSH key"
echo.
echo After adding your key to GitHub, you can test:
echo   ssh -T git@github.com
echo.
echo Expected output:
echo   "Hi KVIP886! You've successfully authenticated, but GitHub does not\nprovide shell access to you."
echo.

echo Step 6: Configure Git for SSH protocol
echo.
git config --global url."git@github.com:".insteadOf "https://github.com/"
echo [✓] Git configured to use SSH protocol for GitHub

echo.
echo ========================================
echo SUMMARY: SSH Setup Complete
echo ========================================
echo.
echo SSH Key: %USERPROFILE%\.ssh\id_ed25519
echo Public Key: %USERPROFILE%\.ssh\id_ed25519.pub
echo Git Remote: git@github.com:KVIP886/openclaw-agent-registry.git
echo.
echo NEXT STEPS:
echo 1. Copy your SSH public key content (shown above)
echo 2. Add it to GitHub: https://github.com/settings/keys
echo 3. Test connection: ssh -T git@github.com
echo 4. Push changes: git push origin main
echo.
echo For more information, see:
echo   - https://docs.github.com/en/authentication/connecting-to-github-with-ssh
echo   - https://docs.github.com/en/authentication/managing-commit-signature-verification/authenticating-to-github-with-ssh
echo.
pause
