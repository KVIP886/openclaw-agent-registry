#!/usr/bin/env python3
"""
OpenClaw Dream Distillation (梦境提炼) - 自动记忆总结与存储
功能：从反思中提取关键洞察，自动生成摘要，存储到 LanceDB 长期记忆

✅ 状态：Phase 5 实施中
✅ 依赖：Tier 3 (LanceDB 向量库), Reflection (Loop Breaker)
✅ 优势：自动记忆提炼，语义压缩，长期存储
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime
import json

@dataclass
class DreamExtract:
    """梦境提炼结果"""
    extract_id: str
    key_insights: List[str]
    summary: str
    relevance_score: float
    source_reflections: List[Dict[str, Any]]
    timestamp: str

class DreamDistiller:
    """梦境提炼器 - 从反思中提取关键洞察"""
    
    def __init__(self):
        """初始化梦境提炼器"""
        self.extract_counter = 0
        self.insight_patterns = [
            "系统稳定性",
            "性能提升",
            "错误修复",
            "架构优化",
            "资源优化",
            "安全加固",
            "自动化增强",
            "记忆压缩"
        ]
    
    def distill_dreams(self, reflection_outputs: List[Dict[str, Any]],
                      tier3_memory=None) -> DreamExtract:
        """
        梦境提炼 - 从反思中提取关键洞察
        
        Args:
            reflection_outputs: 反思输出列表
            tier3_memory: Tier 3 记忆对象 (可选)
            
        Returns:
            DreamExtract: 提炼结果
        """
        self.extract_counter += 1
        extract_id = f"dream_{self.extract_counter:04d}"
        
        # 1. 提取关键洞察
        key_insights = []
        for idx, output in enumerate(reflection_outputs):
            # 模拟关键洞察提取 (实际实现：调用 Qwen3.5 生成摘要)
            insight = self._extract_insight(output)
            if insight:
                key_insights.append(insight)
        
        # 2. 生成综合摘要
        summary = self._generate_summary(key_insights)
        
        # 3. 计算相关性得分
        relevance_score = self._calculate_relevance(key_insights)
        
        # 4. 构建提炼结果
        extract = DreamExtract(
            extract_id=extract_id,
            key_insights=key_insights,
            summary=summary,
            relevance_score=relevance_score,
            source_reflections=reflection_outputs,
            timestamp=datetime.now().isoformat()
        )
        
        # 5. 存储到 Tier 3 长期记忆
        if tier3_memory:
            self._store_to_tier3(extract, tier3_memory)
        
        return extract
    
    def _extract_insight(self, output: Dict[str, Any]) -> Optional[str]:
        """从单条反思中提取关键洞察"""
        # 模拟洞察提取逻辑
        # 实际实现：使用 Qwen3.5 生成摘要
        
        key_points = output.get("key_points", "")
        if not key_points:
            return None
        
        # 识别关键主题
        for pattern in self.insight_patterns:
            if pattern in key_points.lower():
                return f"主题：{pattern} - {key_points}"
        
        # 默认提取
        return f"洞察 #{output.get('step', 1)}: {key_points}"
    
    def _generate_summary(self, key_insights: List[str]) -> str:
        """生成综合摘要"""
        if not key_insights:
            return "无关键洞察"
        
        # 模拟摘要生成 (实际实现：使用 Qwen3.5 生成)
        summary_parts = []
        for idx, insight in enumerate(key_insights[:5]):  # 取前 5 条
            summary_parts.append(f"{idx+1}. {insight}")
        
        summary = "\n".join(summary_parts)
        summary += f"\n\n共提取 {len(key_insights)} 条关键洞察"
        
        return summary
    
    def _calculate_relevance(self, key_insights: List[str]) -> float:
        """计算提炼结果的相关性得分"""
        if not key_insights:
            return 0.0
        
        # 模拟相关性计算
        # 实际实现：使用向量相似度计算
        score = min(len(key_insights) * 0.2, 1.0)  # 每条 0.2 分，最高 1.0
        return round(score, 2)
    
    def _store_to_tier3(self, extract: DreamExtract, tier3_memory):
        """存储到 Tier 3 长期记忆"""
        try:
            # 生成向量 (模拟)
            vector = self._generate_vector_from_text(extract.summary)
            
            # 存储到 LanceDB
            memory_id = tier3_memory.store_memory(
                vector=vector,
                text=f"梦境提炼：{extract.summary}",
                source="dream_extraction",
                relevance=extract.relevance_score
            )
            
            extract.extract_id = memory_id
            
        except Exception as e:
            print(f"⚠️ 存储到 Tier 3 失败：{e}")
    
    def _generate_vector_from_text(self, text: str) -> List[float]:
        """生成文本向量 (模拟)"""
        # 实际实现：使用 Qwen3.5 生成 768 维向量
        import hashlib
        hash_val = hashlib.md5(text.encode()).hexdigest()
        vector = [float(hash_val[i:i+2], 16) / 255.0 for i in range(0, 768, 2)]
        return vector
    
    def get_dream_stats(self) -> Dict[str, Any]:
        """获取梦境提炼统计"""
        return {
            "total_dreams": self.extract_counter,
            "last_extract_id": f"dream_{self.extract_counter:04d}",
            "insight_patterns": self.insight_patterns
        }

def test_dream_distillation():
    """测试梦境提炼"""
    import sys
    
    print("=" * 60)
    print("🧪 开始 Dream Distillation 测试...")
    print("=" * 60)
    
    # 创建测试实例
    distiller = DreamDistiller()
    
    # 模拟反思输出
    reflection_outputs = [
        {
            "step": 1,
            "key_points": "系统稳定性 100% 恢复，性能提升 2000 倍",
            "status": "completed",
            "quality": 0.95
        },
        {
            "step": 2,
            "key_points": "架构优化：三层记忆矩阵完成，IVF-PQ 索引就绪",
            "status": "completed",
            "quality": 0.90
        },
        {
            "step": 3,
            "key_points": "资源优化：RTX 5090 VRAM 使用 85%，峰值 28GB",
            "status": "completed",
            "quality": 0.88
        },
        {
            "step": 4,
            "key_points": "自动化增强：工具总线 5 工具全部就绪",
            "status": "completed",
            "quality": 0.92
        },
        {
            "step": 5,
            "key_points": "错误修复：LangChain 导入问题已解决",
            "status": "completed",
            "quality": 0.85
        }
    ]
    
    # 测试 1: 梦境提炼
    print("\n测试 1: 梦境提炼")
    extract1 = distiller.distill_dreams(reflection_outputs, tier3_memory=None)
    print(f"  提取 ID: {extract1.extract_id}")
    print(f"  关键洞察数：{len(extract1.key_insights)}")
    print(f"  相关性得分：{extract1.relevance_score:.2f}")
    print(f"  摘要:")
    print(extract1.summary)
    assert len(extract1.key_insights) == 5
    print(f"  ✅ 梦境提炼成功")
    
    # 测试 2: 多条反思
    print("\n测试 2: 多条梦境提炼")
    extract2 = distiller.distill_dreams(reflection_outputs, tier3_memory=None)
    extract3 = distiller.distill_dreams(reflection_outputs, tier3_memory=None)
    print(f"  总提炼次数：{distiller.extract_counter}")
    print(f"  ✅ 多条提炼成功")
    
    # 测试 3: 统计信息
    print("\n测试 3: 统计信息")
    stats = distiller.get_dream_stats()
    print(f"  总提炼次数：{stats['total_dreams']}")
    print(f"  最后 ID: {stats['last_extract_id']}")
    print(f"  洞察模式数：{len(stats['insight_patterns'])}")
    print(f"  ✅ 统计信息获取成功")
    
    # 测试 4: 空输入
    print("\n测试 4: 空输入")
    extract_empty = distiller.distill_dreams([], tier3_memory=None)
    print(f"  摘要：{extract_empty.summary}")
    assert extract_empty.summary == "无关键洞察"
    print(f"  ✅ 空输入处理成功")
    
    print("\n" + "=" * 60)
    print("✅ 所有 Dream Distillation 测试通过！")
    print("=" * 60)

if __name__ == "__main__":
    test_dream_distillation()
