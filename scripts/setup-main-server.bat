@echo off
echo ========================================
echo Ollama 主服务器配置 (RTX 5090)
echo ========================================
echo.

echo [1/4] 设置监听所有网络接口...
set OLLAMA_HOST=0.0.0.0:11434
echo     ✓ OLLAMA_HOST=0.0.0.0:11434

echo [2/4] 设置 GPU 加速...
set OLLAMA_CUDA=1
echo     ✓ OLLAMA_CUDA=1

echo [3/4] 设置 2 并发...
set OLLAMA_NUM_PARALLEL=2
echo     ✓ OLLAMA_NUM_PARALLEL=2

echo [4/4] 设置 GPU 层数...
set OLLAMA_GPU_LAYERS=33
echo     ✓ OLLAMA_GPU_LAYERS=33

echo.
echo ========================================
echo 配置完成！
echo ========================================
echo 下一步:
echo [1] 重启 Ollama 服务
echo [2] 确认防火墙已开放 11434 端口
echo [3] 测试客户端连接
echo.
pause
