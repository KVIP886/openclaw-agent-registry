@echo off
echo ========================================
echo Ollama 2 并发配置 - RTX 5090 专用
echo ========================================
echo.

echo [1/4] 设置 GPU 加速...
set OLLAMA_CUDA=1
echo     ✓ OLLAMA_CUDA=1

echo [2/4] 设置并发数=2...
set OLLAMA_NUM_PARALLEL=2
echo     ✓ OLLAMA_NUM_PARALLEL=2

echo [3/4] 设置 CPU 线程...
set OLLAMA_NUM_THREADS=8
echo     ✓ OLLAMA_NUM_THREADS=8

echo [4/4] 设置 GPU 层数...
set OLLAMA_GPU_LAYERS=33
echo     ✓ OLLAMA_GPU_LAYERS=33

echo.
echo ========================================
echo 配置已应用！
echo ========================================
echo.
echo 下一步操作:
echo [1] 重启 Ollama 服务
echo [2] 测试并发性能
echo [3] 查看 GPU 状态
echo.
pause
