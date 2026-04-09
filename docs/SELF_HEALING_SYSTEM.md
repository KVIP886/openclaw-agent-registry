# OpenClaw 自愈系统完整记录

**记录日期**: 2026-04-10 01:22  
**记录人**: OpenClaw  
**状态**: ✅ 完整记录

---

## 🎯 问题背景

### **用户原始问题**
1. **运行时卡住/死循环问题**
   - 程序运行中卡住
   - 进入死循环无法退出
   - 需要紧急停止和恢复机制

2. **GPU/CPU 错误调度问题**
   - RTX 5090 显卡应该处理的任务
   - 系统错误地使用 CPU 处理
   - 导致程序卡住
   - GPU 利用率低但显存占用高

3. **温度监控与保护需求**
   - GPU/CPU 温度过高导致系统不稳定
   - 需要实时监控温度
   - 需要自动保护机制

---

## 🛠️ 解决方案

### **1. 紧急停止与恢复系统**

#### **📄 核心文件**
- **位置**: `scripts/emergency-stop.js`
- **功能**: 检测卡住进程，自动停止并恢复

#### **📋 功能清单**
- ✅ 诊断系统状态
- ✅ 检查进程 CPU/内存使用
- ✅ 检查 GPU 状态
- ✅ 检查文件锁
- ✅ 自动停止卡住进程
- ✅ 清理临时文件
- ✅ 重启服务
- ✅ 验证系统状态

#### **🔧 使用方式**
```bash
node scripts/emergency-stop.js
```

**选择操作**:
1. 自动恢复
2. 手动处理
3. 查看详细信息
4. 退出

---

### **2. 进程监控守护进程**

#### **📄 核心文件**
- **位置**: `scripts/process-monitor.js`
- **功能**: 自动监控进程，自动处理卡死

#### **📋 功能清单**
- ✅ 实时监控进程状态
- ✅ CPU 使用率检测 (>90% 触发)
- ✅ 内存泄漏检测
- ✅ GPU 使用情况监控
- ✅ 自动处理卡死进程
- ✅ 自动清理资源
- ✅ 日志记录

#### **🔧 使用方式**
```bash
node scripts/process-monitor.js
```

**守护进程参数**:
- 检查间隔：60 秒
- CPU 阈值：90%
- 内存阈值：95%
- 超时时间：5 分钟

---

### **3. GPU/CPU 调度修复工具**

#### **📄 核心文件**
- **位置**: `scripts/fix-gpu-cpu-switch.js`
- **功能**: 自动检测和修复 GPU/CPU 错误调度

#### **📋 功能清单**
- ✅ 诊断 GPU 调度状态
- ✅ 检查 Ollama GPU 配置
- ✅ 检查环境变量
- ✅ 检查当前 GPU 使用情况
- ✅ 自动修复 CPU 处理 GPU 任务
- ✅ 设置正确的环境变量
- ✅ 清理临时文件
- ✅ 创建 .env 配置文件
- ✅ 验证修复结果

#### **🔧 使用方式**
```bash
node scripts/fix-gpu-cpu-switch.js
```

**选择操作**:
1. 修复 GPU/CPU 调度错误
2. 创建 .env 配置文件
3. 验证修复结果
4. 退出

---

### **4. 温度监控系统**

#### **📄 核心文件**
- **位置**: `scripts/temp-monitor.js`
- **功能**: 实时监控 GPU/CPU 温度

#### **📋 功能清单**
- ✅ 实时监控 GPU 温度
- ✅ 监控显存温度
- ✅ 监控 CPU 温度
- ✅ 监控主板温度
- ✅ 检查温度阈值告警
- ✅ 历史记录查看
- ✅ 自定义阈值设置
- ✅ 自动告警

#### **🔧 使用方式**
```bash
node scripts/temp-monitor.js
```

**监控参数**:
- GPU 警告阈值：80°C
- GPU 临界阈值：90°C
- CPU 警告阈值：85°C
- CPU 临界阈值：95°C
- 检查间隔：30 秒

**选择操作**:
1. 重新检查温度
2. 查看历史记录
3. 设置阈值
4. 退出

---

### **5. 温度保护系统**

#### **📄 核心文件**
- **位置**: `scripts/temp-protection.js`
- **功能**: 温度过高时自动保护

#### **📋 功能清单**
- ✅ 自动温度保护
- ✅ 紧急保护模式（临界温度）
- ✅ 保护模式（高温警告）
- ✅ 自动停止高 GPU 使用进程
- ✅ 自动降低 GPU 频率
- ✅ 自动优化风扇控制
- ✅ 状态记录与恢复
- ✅ 保护级别设置

#### **🔧 使用方式**
```bash
node scripts/temp-protection.js
```

**保护级别**:
- `light`: 轻度保护
- `moderate`: 中度保护
- `aggressive`: 激进保护（默认）

**选择操作**:
1. 立即检查温度并保护
2. 查看当前状态
3. 设置保护级别
4. 清理临时文件
5. 退出

---

## 📊 系统架构

### **🏗️ 整体架构**

```
┌─────────────────────────────────────────┐
│          OpenClaw Auto-Healing          │
│              System                     │
├─────────────────────────────────────────┤
│  1. Emergency Stop (紧急停止)           │
│     - 诊断 → 停止 → 恢复 → 验证          │
├─────────────────────────────────────────┤
│  2. Process Monitor (进程监控)          │
│     - 监控 → 告警 → 自动恢复              │
├─────────────────────────────────────────┤
│  3. GPU/CPU Fix (调度修复)               │
│     - 诊断 → 修复 → 验证                 │
├─────────────────────────────────────────┤
│  4. Temp Monitor (温度监控)              │
│     - 监控 → 告警 → 记录                 │
├─────────────────────────────────────────┤
│  5. Temp Protection (温度保护)           │
│     - 监控 → 保护 → 恢复                 │
└─────────────────────────────────────────┘
```

### **🔄 工作流程**

```
1. 程序卡住/死循环
   ↓
2. 进程监控检测到异常
   ↓
3. 自动触发紧急停止
   ↓
4. 诊断系统状态
   ↓
5. 停止卡住进程
   ↓
6. 清理临时文件
   ↓
7. 重启服务
   ↓
8. 验证系统状态
   ↓
9. 恢复正常运行
```

---

## 📁 文件列表

### **📂 脚本文件**
| 文件名 | 大小 | 功能 |
|-------|----|----|
| `emergency-stop.js` | 8.4 KB | 紧急停止与恢复 |
| `process-monitor.js` | 8.6 KB | 进程监控守护进程 |
| `fix-gpu-cpu-switch.js` | 8.9 KB | GPU/CPU 调度修复 |
| `temp-monitor.js` | 11.9 KB | 温度监控 |
| `temp-protection.js` | 11.4 KB | 温度保护 |

### **📂 日志文件**
| 文件名 | 内容 |
|-------|----|
| `logs/emergency-log.txt` | 紧急停止日志 |
| `logs/process-monitor.log` | 进程监控日志 |
| `logs/gpu-fix.log` | GPU 修复日志 |
| `logs/temp-monitor.log` | 温度监控日志 |
| `logs/temp-protection.log` | 温度保护日志 |
| `logs/temp-events.json` | 温度事件记录 |
| `logs/protection-state.json` | 保护状态记录 |

### **📂 配置文件**
| 文件名 | 内容 |
|-------|----|
| `.env` | GPU/CPU 环境变量配置 |
| `config/modes-backup.json` | 模式配置备份 |

---

## 🎯 使用场景

### **场景 1: 程序卡住**

**症状**:
- 程序无响应
- CPU 使用率 100%
- 内存泄漏
- 无法退出

**解决步骤**:
```bash
# 1. 运行紧急停止工具
node scripts/emergency-stop.js

# 2. 选择 1: 自动恢复
# 3. 等待系统恢复

# 4. 验证系统状态
node scripts/check-status.js
```

---

### **场景 2: GPU/CPU 错误调度**

**症状**:
- GPU 利用率 < 5%
- 显存占用高 (>20GB)
- CPU 使用率 > 80%
- 程序运行缓慢

**解决步骤**:
```bash
# 1. 运行 GPU/CPU 修复工具
node scripts/fix-gpu-cpu-switch.js

# 2. 选择 1: 修复 GPU/CPU 调度错误
# 3. 等待自动修复完成

# 4. 验证修复结果
选择 3: 验证修复结果
```

---

### **场景 3: 温度过高**

**症状**:
- GPU 温度 > 80°C
- CPU 温度 > 85°C
- 系统不稳定
- 性能下降

**解决步骤**:
```bash
# 1. 运行温度监控
node scripts/temp-monitor.js

# 2. 查看实时温度

# 3. 启动温度保护
node scripts/temp-protection.js

# 4. 选择 1: 立即检查温度并保护
# 5. 等待温度下降
```

---

## 💾 安装与部署

### **📦 自动安装脚本**

创建 `install-auto-healing.sh`:
```bash
#!/bin/bash

echo "🔧 安装 OpenClaw 自愈系统..."

# 复制脚本到 scripts 目录
cp scripts/emergency-stop.js scripts/
cp scripts/process-monitor.js scripts/
cp scripts/fix-gpu-cpu-switch.js scripts/
cp scripts/temp-monitor.js scripts/
cp scripts/temp-protection.js scripts/

# 创建日志目录
mkdir -p logs

# 创建配置文件
cp .env.example .env

echo "✅ 自愈系统安装完成!"
echo ""
echo "🚀 开始使用:"
echo "   node scripts/emergency-stop.js    # 紧急停止"
echo "   node scripts/process-monitor.js   # 进程监控"
echo "   node scripts/fix-gpu-cpu-switch.js # GPU/CPU 修复"
echo "   node scripts/temp-monitor.js      # 温度监控"
echo "   node scripts/temp-protection.js   # 温度保护"
```

---

## 🔍 故障诊断

### **📋 诊断清单**

1. **检查进程状态**
   ```bash
   node scripts/emergency-stop.js
   选择 3: 查看详细信息
   ```

2. **检查 GPU 状态**
   ```bash
   nvidia-smi
   ```

3. **检查温度**
   ```bash
   node scripts/temp-monitor.js
   ```

4. **检查保护状态**
   ```bash
   node scripts/temp-protection.js
   选择 2: 查看当前状态
   ```

5. **查看日志**
   ```bash
   cat logs/emergency-log.txt
   cat logs/temp-monitor.log
   cat logs/temp-protection.log
   ```

---

## 📝 维护建议

### **每日检查**
- ✅ 查看温度监控日志
- ✅ 检查 GPU 使用情况
- ✅ 确认服务正常运行

### **每周检查**
- ✅ 清理临时文件
- ✅ 查看历史记录
- ✅ 调整阈值设置

### **每月检查**
- ✅ 更新系统
- ✅ 备份配置文件
- ✅ 检查硬件状态

---

## 🚨 紧急情况处理

### **🔥 GPU 温度临界 (≥90°C)**
1. 立即停止高 GPU 使用进程
2. 降低 GPU 频率
3. 增加风扇转速
4. 等待温度下降
5. 查看日志报告

### **⚠️ CPU 温度临界 (≥95°C)**
1. 停止不必要的进程
2. 降低 CPU 负载
3. 检查散热系统
4. 等待温度下降
5. 查看日志报告

### **🛑 程序死循环**
1. 运行紧急停止工具
2. 选择自动恢复
3. 等待系统恢复
4. 查看诊断报告
5. 分析原因

---

## 📚 相关资源

- [Whisper GitHub](https://github.com/openai/whisper)
- [Microsoft Edge TTS](https://github.com/rany2/edge-tts)
- [NVIDIA Control Panel](https://www.nvidia.com/download/index.aspx)
- [OpenClaw Documentation](https://docs.openclaw.ai)

---

**记录完成时间**: 2026-04-10 01:22  
**状态**: ✅ 完整记录  
**可用性**: ✅ 所有工具已就绪，可直接使用

---

## 🔧 物理协助支持

### **需要硬件协助的情况**
1. GPU 风扇不转或转速异常
2. GPU 温度持续过高（即使降低负载）
3. CPU 温度持续过高
4. 系统频繁死机
5. 显卡驱动问题

### **协助检查清单**
- [ ] 检查 GPU 风扇是否正常运转
- [ ] 检查散热器是否积灰
- [ ] 检查 GPU 温度传感器是否正常工作
- [ ] 检查 CPU 散热系统
- [ ] 检查 BIOS 设置中的温度阈值
- [ ] 检查电源供应是否稳定

### **物理操作步骤**
1. **断电后**清理灰尘
2. **重新安装**散热器
3. **更换**硅脂
4. **检查**电源连接
5. **更新**BIOS 和固件

---

**记录人**: OpenClaw  
**最后更新**: 2026-04-10 01:22
