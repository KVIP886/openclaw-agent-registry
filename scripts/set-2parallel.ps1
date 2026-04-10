# Ollama 2 并发配置
Write-Host "🚀 Ollama 2 并发配置开始" -ForegroundColor Green

# 设置环境变量
$env:OLLAMA_CUDA = "1"
$env:OLLAMA_NUM_PARALLEL = "2"
$env:OLLAMA_NUM_THREADS = "8"
$env:OLLAMA_GPU_LAYERS = "33"

Write-Host "✅ 配置完成!" -ForegroundColor Green
Write-Host "OLLAMA_CUDA=1"
Write-Host "OLLAMA_NUM_PARALLEL=2"
Write-Host "OLLAMA_NUM_THREADS=8"
Write-Host "OLLAMA_GPU_LAYERS=33"
Write-Host ""
Write-Host "✅ 2 并发模式已启用!" -ForegroundColor Green
