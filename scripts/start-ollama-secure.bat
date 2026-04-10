@echo off
REM Ollama Environment Configuration - Local Only
set OLLAMA_HOST=127.0.0.1:11434
set OLLAMA_NUM_PARALLEL=2
set OLLAMA_NUM_THREADS=8
set OLLAMA_GPU_LAYERS=33
set OLLAMA_MAX_QUEUE=10
set OLLAMA_MODELS=C:\Users\况和平\.ollama\models

echo Starting Ollama with secure configuration...
start "" "C:\Users\况和平\AppData\Local\Programs\Ollama\ollama.exe"
timeout /t 3 /nobreak >nul
netstat -ano | findstr ":11434"
