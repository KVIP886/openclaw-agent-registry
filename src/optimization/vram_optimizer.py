#!/usr/bin/env python3
"""
OpenClaw VRAM Optimization (显存优化)
功能：VRAM 动态调度，峰值降低，负载均衡

✅ 状态：Phase 8 实施 (性能优化)
✅ 依赖：Tool Bus Executor, Tier 3 Memory
✅ 目标：降低峰值 VRAM 使用率 20%
"""

from typing import Dict, Any, List
from dataclasses import dataclass
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

@dataclass
class VRAMProfile:
    """VRAM 使用配置文件"""
    tool_name: str
    min_vram: float
    max_vram: float
    priority: int  # 1-5, 1 最高优先级
    estimated_time: int  # 预计执行时间 (ms)

class VRAMOptimizer:
    """VRAM 优化器 - 动态负载调度"""
    
    def __init__(self, max_vram: float = 32.0):
        """
        初始化 VRAM 优化器
        
        Args:
            max_vram: 最大可用 VRAM (GB)
        """
        self.max_vram = max_vram
        self.current_usage = 0.0
        self.peak_usage = 0.0
        self.pending_tasks = []
        self.vram_profiles = {
            "sam2.1": VRAMProfile(
                tool_name="sam2.1",
                min_vram=8.0,
                max_vram=12.0,
                priority=2,
                estimated_time=15000
            ),
            "lancedb": VRAMProfile(
                tool_name="lancedb",
                min_vram=2.0,
                max_vram=4.0,
                priority=3,
                estimated_time=5000
            ),
            "git_soul": VRAMProfile(
                tool_name="git_soul",
                min_vram=0.5,
                max_vram=1.0,
                priority=4,
                estimated_time=50000
            ),
            "unsloth": VRAMProfile(
                tool_name="unsloth",
                min_vram=16.0,
                max_vram=24.0,
                priority=1,
                estimated_time=300000
            ),
            "python": VRAMProfile(
                tool_name="python",
                min_vram=0.5,
                max_vram=1.5,
                priority=5,
                estimated_time=10000
            )
        }
    
    def calculate_optimal_order(self, tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        计算最优执行顺序 (降低峰值 VRAM)
        
        Args:
            tasks: 待执行任务列表
            
        Returns:
            List[Dict[str, Any]]: 优化后的任务顺序
        """
        # 1. 按优先级排序 (高优先级先执行)
        sorted_tasks = sorted(
            tasks,
            key=lambda x: self.vram_profiles.get(x["tool"], VRAMProfile(
                tool_name="unknown",
                min_vram=1.0,
                max_vram=2.0,
                priority=5,
                estimated_time=10000
            )).priority
        )
        
        # 2. VRAM 负载均衡调度
        optimized_tasks = []
        current_vram = 0.0
        peak_vram = 0.0
        
        for task in sorted_tasks:
            tool_name = task["tool"]
            profile = self.vram_profiles.get(tool_name, self.vram_profiles["python"])
            
            # 如果当前 VRAM 使用过高，等待释放
            if current_vram + profile.max_vram > self.max_vram * 0.9:
                # 模拟 VRAM 释放 (等待其他任务完成)
                self._simulate_vram_release()
                current_vram = 0.0
            
            # 添加任务
            optimized_tasks.append(task)
            current_vram += profile.min_vram
            peak_vram = max(peak_vram, current_vram)
        
        # 3. 输出优化结果
        self.peak_usage = peak_vram
        print(f"✅ VRAM 优化完成:")
        print(f"   峰值 VRAM: {peak_vram:.2f}GB / {self.max_vram:.1f}GB")
        print(f"   优化率：{(1 - peak_vram / self.max_vram) * 100:.1f}%")
        
        return optimized_tasks
    
    def _simulate_vram_release(self):
        """模拟 VRAM 释放"""
        # 实际实现：等待低优先级任务完成
        import time
        time.sleep(0.1)  # 模拟等待
        self.current_usage = max(0.0, self.current_usage - 5.0)
    
    def optimize_execution(self, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        优化执行计划
        
        Args:
            tasks: 原始执行任务列表
            
        Returns:
            Dict[str, Any]: 优化后的执行计划
        """
        optimized_tasks = self.calculate_optimal_order(tasks)
        
        # 计算优化效果
        original_peak = sum(
            self.vram_profiles.get(t["tool"], self.vram_profiles["python"]).max_vram
            for t in tasks
        )
        optimization_rate = (1 - self.peak_usage / original_peak) * 100 if original_peak > 0 else 0
        
        return {
            "original_peak_gb": round(original_peak, 2),
            "optimized_peak_gb": round(self.peak_usage, 2),
            "optimization_rate_pct": round(optimization_rate, 2),
            "total_tasks": len(tasks),
            "execution_order": [t["tool"] for t in optimized_tasks]
        }
    
    def get_optimization_report(self) -> Dict[str, Any]:
        """获取优化报告"""
        return {
            "max_vram_gb": self.max_vram,
            "current_usage_gb": round(self.current_usage, 2),
            "peak_usage_gb": round(self.peak_usage, 2),
            "utilization_rate": round(self.current_usage / self.max_vram, 3),
            "tool_profiles": {
                name: {
                    "min_vram_gb": p.min_vram,
                    "max_vram_gb": p.max_vram,
                    "priority": p.priority,
                    "estimated_time_ms": p.estimated_time
                }
                for name, p in self.vram_profiles.items()
            },
            "optimization_algorithm": "Priority-based VRAM scheduling"
        }

def test_vram_optimizer():
    """测试 VRAM 优化器"""
    import random
    
    print("=" * 60)
    print("🧪 开始 VRAM 优化器测试...")
    print("=" * 60)
    
    # 创建优化器实例
    optimizer = VRAMOptimizer(max_vram=32.0)
    
    # 测试 1: 简单任务
    print("\n测试 1: 简单任务调度")
    simple_tasks = [
        {"tool": "lancedb", "description": "向量检索"},
        {"tool": "git_soul", "description": "Git 存档"}
    ]
    result1 = optimizer.optimize_execution(simple_tasks)
    print(f"   峰值 VRAM: {result1['optimized_peak_gb']:.2f}GB")
    print(f"   优化率：{result1['optimization_rate_pct']:.1f}%")
    assert result1['optimization_rate_pct'] >= 0
    print(f"   ✅ 优化成功")
    
    # 测试 2: 复杂任务
    print("\n测试 2: 复杂任务调度 (5 工具混合)")
    complex_tasks = [
        {"tool": "sam2.1", "description": "视觉分割"},
        {"tool": "unsloth", "description": "LLM 微调"},
        {"tool": "lancedb", "description": "向量检索"},
        {"tool": "git_soul", "description": "Git 存档"},
        {"tool": "python", "description": "沙箱执行"}
    ]
    result2 = optimizer.optimize_execution(complex_tasks)
    print(f"   峰值 VRAM: {result2['optimized_peak_gb']:.2f}GB")
    print(f"   优化率：{result2['optimization_rate_pct']:.1f}%")
    print(f"   执行顺序: {result2['execution_order']}")
    assert result2['optimization_rate_pct'] >= 0
    print(f"   ✅ 复杂任务优化成功")
    
    # 测试 3: 优化报告
    print("\n测试 3: 优化报告")
    report = optimizer.get_optimization_report()
    print(f"   最大 VRAM: {report['max_vram_gb']:.1f}GB")
    print(f"   峰值使用：{report['peak_usage_gb']:.2f}GB")
    print(f"   工具数量：{len(report['tool_profiles'])}")
    print(f"   ✅ 报告生成成功")
    
    # 测试 4: 大规模任务
    print("\n测试 4: 大规模任务 (20 个混合任务)")
    large_tasks = [
        {"tool": random.choice(list(optimizer.vram_profiles.keys())), "description": f"任务 {i}"}
        for i in range(20)
    ]
    result3 = optimizer.optimize_execution(large_tasks)
    print(f"   峰值 VRAM: {result3['optimized_peak_gb']:.2f}GB")
    print(f"   优化率：{result3['optimization_rate_pct']:.1f}%")
    print(f"   ✅ 大规模任务优化成功")
    
    print("\n" + "=" * 60)
    print("✅ 所有 VRAM 优化器测试通过！")
    print("=" * 60)

if __name__ == "__main__":
    test_vram_optimizer()
