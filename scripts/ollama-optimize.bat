@echo off
echo ========================================
echo Ollama RTX 5090 优化配置脚本
echo ========================================
echo.

echo [1] 设置 GPU 加速...
set OLLAMA_CUDA=1
echo     OLLAMA_CUDA=1

echo [2] 设置并发请求数...
set OLLAMA_NUM_PARALLEL=4
echo     OLLAMA_NUM_PARALLEL=4

echo [3] 设置 CPU 线程...
set OLLAMA_NUM_THREADS=8
echo     OLLAMA_NUM_THREADS=8

echo [4] 设置队列限制...
set OLLAMA_MAX_QUEUE=10
echo     OLLAMA_MAX_QUEUE=10

echo [5] 设置 GPU 层数...
set OLLAMA_GPU_LAYERS=33
echo     OLLAMA_GPU_LAYERS=33

echo.
echo ========================================
echo 配置完成！
echo ========================================
echo 下一步：重启 Ollama 服务
echo.
pause
