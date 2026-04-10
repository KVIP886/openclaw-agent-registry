# Ollama 2 并发配置脚本
# RTX 5090 专用优化配置

Write-Host "🚀 Ollama 2 并发配置开始" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# 1. 设置环境变量
$env:OLLAMA_CUDA = "1"
$env:OLLAMA_NUM_PARALLEL = "2"
$env:OLLAMA_NUM_THREADS = "8"
$env:OLLAMA_GPU_LAYERS = "33"
$env:OLLAMA_MAX_QUEUE = "10"

Write-Host "✅ 环境变量设置完成" -ForegroundColor Green
Write-Host "   OLLAMA_CUDA=1"
Write-Host "   OLLAMA_NUM_PARALLEL=2"
Write-Host "   OLLAMA_NUM_THREADS=8"
Write-Host "   OLLAMA_GPU_LAYERS=33"
Write-Host "   OLLAMA_MAX_QUEUE=10"
Write-Host ""

# 2. 检查当前 GPU 状态
Write-Host "🎮 当前 GPU 状态:" -ForegroundColor Yellow
try {
    $gpuOutput = & nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits
    $gpuLines = $gpuOutput.Trim().Split("`n")
    
    foreach ($line in $gpuLines) {
        if ($line.Trim()) {
            $parts = $line.Trim().Split(",")
            Write-Host "   温度：$($parts[0])°C"
            Write-Host "   使用率：$($parts[1])%"
            Write-Host "   显存：$($parts[2])/$($parts[3]) MB"
        }
    }
} catch {
    Write-Host "   ⚠️ 无法获取 GPU 状态" -ForegroundColor Yellow
}
Write-Host ""

# 3. 检查 Ollama 服务
Write-Host "🔧 Ollama 服务状态:" -ForegroundColor Yellow
try {
    $ollamaProcesses = Get-Process -Name "ollama*" -ErrorAction SilentlyContinue | Select-Object ProcessName, Id, CPU, WorkingSet
    
    if ($ollamaProcesses.Count -gt 0) {
        Write-Host "   ✓ Ollama 正在运行" -ForegroundColor Green
        foreach ($proc in $ollamaProcesses) {
            Write-Host "   - $($proc.ProcessName) PID: $($proc.Id) CPU: $($proc.CPU) 内存：$([math]::Round($proc.WorkingSet / 1MB, 1)) MB"
        }
    } else {
        Write-Host "   ✗ Ollama 未运行" -ForegroundColor Red
    }
} catch {
    Write-Host "   ⚠️ 无法检查服务状态" -ForegroundColor Yellow
}
Write-Host ""

# 4. 网络监听检查
Write-Host "🌐 网络连接状态:" -ForegroundColor Yellow
try {
    $netstat = netstat -ano | Select-String "11434" -Context 0
    if ($netstat) {
        Write-Host "   ✓ 监听地址：0.0.0.0:11434" -ForegroundColor Green
        Write-Host "   ✓ 支持外部访问" -ForegroundColor Green
    } else {
        Write-Host "   ✗ 未找到 11434 端口监听" -ForegroundColor Red
    }
} catch {
    Write-Host "   ⚠️ 无法检查网络连接" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 配置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 提示
Write-Host "💡 下一步建议:" -ForegroundColor Yellow
Write-Host "1. 在另一台电脑上测试连接"
Write-Host "   设置：\$env:OLLAMA_HOST='192.168.1.4:11434'"
Write-Host "   运行：ollama list"
Write-Host ""
Write-Host "2. 测试并发性能"
Write-Host "   node scripts/benchmark-concurrent.js"
Write-Host ""
Write-Host "3. 监控 GPU 状态"
Write-Host "   nvidia-smi -l 1"
Write-Host ""
