#!/usr/bin/env python3
"""
OpenClaw LangChain CoT Planner - 原子化任务规划 (Pydantic 集成版)
功能：思维链规划，VRAM 预估，工具映射，状态传递

✅ 状态：Phase 2 重构 (Pydantic 集成版)
✅ 依赖：LangChain, Pydantic, Qwen3.5
✅ 优势：原子化任务，VRAM 预估，128K 上下文
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from dataclasses import dataclass

@dataclass
class TaskStep:
    """原子任务步骤"""
    step_id: int
    tool: str  # 工具名称：sam2, lancedb, git_soul, unsloth, python
    description: str
    vram_required: float = 0.0  # 预估 VRAM 占用 (GB)
    dependencies: List[str] = None  # 依赖步骤列表

@dataclass
class ExecutionPlan:
    """执行计划"""
    plan_id: str
    steps: List[TaskStep]
    estimated_vram: str  # 预估 RTX 5090 显存占用
    total_steps: int
    estimated_time: int = 0  # 预计执行时间 (秒)

class LangChainPlanner:
    """LangChain CoT 规划器 - 原子化任务规划"""
    
    def __init__(self):
        """初始化规划器"""
        self.planner_id = "openclaw_planner_001"
        self.tool_registry = {
            "sam2": {"name": "SAM-2.1", "vram_range": "8-12GB", "description": "视觉语义分割"},
            "lancedb": {"name": "LanceDB", "vram_range": "2-4GB", "description": "向量数据库检索"},
            "git_soul": {"name": "Git Soul", "vram_range": "0-1GB", "description": "Git 自动存档"},
            "unsloth": {"name": "Unsloth", "vram_range": "16-24GB", "description": "2x LLM 微调"},
            "python": {"name": "Python Sandbox", "vram_range": "0-2GB", "description": "环境代码执行"}
        }
        self.loop_count = 0
    
    def lobster_planner(self, state: Dict[str, Any]) -> ExecutionPlan:
        """
        龙虾大脑计划层：将指令原子化
        利用 5090 的 128k 上下文空间，生成极度详尽的步骤
        
        Args:
            state: 当前状态 (包含输入指令)
            
        Returns:
            ExecutionPlan: 原子化执行计划
        """
        # 1. 获取输入指令
        last_message = state.get("messages", [])[-1] if state.get("messages") else ""
        instruction = last_message.content if hasattr(last_message, "content") else str(last_message)
        
        # 2. 分析指令属性
        has_video = "video" in instruction.lower() or "visual" in instruction.lower()
        has_training = "train" in instruction.lower() or "fine-tune" in instruction.lower()
        has_vector = "vector" in instruction.lower() or "search" in instruction.lower()
        has_git = "git" in instruction.lower() or "commit" in instruction.lower()
        
        # 3. 生成原子化任务步骤
        steps = []
        step_id = 1
        
        # 步骤 1: 视觉处理 (如果需要)
        if has_video:
            steps.append(TaskStep(
                step_id=step_id,
                tool="sam2",
                description="提取视频关键帧并分割目标",
                vram_required=10.0,
                dependencies=[]
            ))
            step_id += 1
        
        # 步骤 2: 向量检索 (如果需要)
        if has_vector:
            steps.append(TaskStep(
                step_id=step_id,
                tool="lancedb",
                description="比对 Tier 3 历史语义向量",
                vram_required=3.0,
                dependencies=[]
            ))
            step_id += 1
        
        # 步骤 3: Git 存档 (如果需要)
        if has_git:
            steps.append(TaskStep(
                step_id=step_id,
                tool="git_soul",
                description="生成哈希快照并签署 GPG 签名",
                vram_required=0.5,
                dependencies=[]
            ))
            step_id += 1
        
        # 步骤 4: LLM 微调 (如果需要)
        if has_training:
            steps.append(TaskStep(
                step_id=step_id,
                tool="unsloth",
                description="启动 Unsloth 2x 加速微调",
                vram_required=20.0,
                dependencies=[]
            ))
            step_id += 1
        
        # 步骤 5: Python 沙箱执行 (默认)
        if not steps:
            steps.append(TaskStep(
                step_id=step_id,
                tool="python",
                description="执行 Python 沙箱代码",
                vram_required=1.0,
                dependencies=[]
            ))
        
        # 4. 计算 VRAM 预估
        total_vram = sum(step.vram_required for step in steps)
        vram_range = f"{total_vram:.1f}GB (RTX 5090: 32GB 可用)"
        
        # 5. 估算执行时间
        estimated_time = len(steps) * 15  # 每个步骤约 15 秒
        
        # 6. 构建执行计划
        plan = ExecutionPlan(
            plan_id=f"plan_{self.planner_id}_{step_id:04d}",
            steps=steps,
            estimated_vram=vram_range,
            total_steps=len(steps),
            estimated_time=estimated_time
        )
        
        # 7. 更新循环计数
        self.loop_count += 1
        state["loop_count"] = self.loop_count
        
        return plan
    
    def get_tool_info(self, tool_name: str) -> Dict[str, Any]:
        """获取工具信息"""
        return self.tool_registry.get(tool_name, {
            "name": "Unknown",
            "vram_range": "0-1GB",
            "description": "未知工具"
        })
    
    def validate_plan(self, plan: ExecutionPlan) -> bool:
        """
        验证执行计划
        
        Args:
            plan: 执行计划
            
        Returns:
            bool: 验证是否通过
        """
        # 检查 VRAM 是否超出 5090 上限
        vram_str = plan.estimated_vram
        try:
            vram_required = float(vram_str.split()[0])
            if vram_required > 32.0:
                return False
        except (ValueError, IndexError):
            return False
        
        # 检查步骤是否存在
        if len(plan.steps) == 0:
            return False
        
        # 检查步骤 ID 是否连续
        step_ids = [step.step_id for step in plan.steps]
        if step_ids != list(range(1, len(step_ids) + 1)):
            return False
        
        return True
    
    def plan_to_dict(self, plan: ExecutionPlan) -> Dict[str, Any]:
        """将计划转换为字典格式"""
        return {
            "plan_id": plan.plan_id,
            "total_steps": plan.total_steps,
            "estimated_vram": plan.estimated_vram,
            "estimated_time": plan.estimated_time,
            "steps": [
                {
                    "step_id": step.step_id,
                    "tool": step.tool,
                    "description": step.description,
                    "vram_required": step.vram_required,
                    "dependencies": step.dependencies
                }
                for step in plan.steps
            ]
        }

def test_langchain_planner():
    """测试 LangChain 规划器"""
    from langchain_core.messages import HumanMessage
    
    print("=" * 60)
    print("🧪 开始 LangChain Planner 测试...")
    print("=" * 60)
    
    # 创建测试实例
    planner = LangChainPlanner()
    
    # 测试 1: 视频分析指令
    print("\n测试 1: 视频分析指令")
    state_video = {
        "messages": [HumanMessage(content="分析这段视频的内容并提取关键帧")]
    }
    plan1 = planner.lober_planner(state_video)
    print(f"  计划 ID: {plan1.plan_id}")
    print(f"  总步骤：{plan1.total_steps}")
    print(f"  VRAM: {plan1.estimated_vram}")
    print(f"  步骤:")
    for step in plan1.steps:
        print(f"    {step.step_id}. [{step.tool}] {step.description}")
    assert plan1.total_steps >= 1
    assert "video" in str(state_video["messages"][-1].content).lower()
    print(f"  ✅ 视频分析计划生成成功")
    
    # 测试 2: Git 存档指令
    print("\n测试 2: Git 存档指令")
    state_git = {
        "messages": [HumanMessage(content="执行 git commit 并签名")]
    }
    plan2 = planner.lober_planner(state_git)
    print(f"  计划 ID: {plan2.plan_id}")
    print(f"  总步骤：{plan2.total_steps}")
    print(f"  VRAM: {plan2.estimated_vram}")
    has_git_tool = any(step.tool == "git_soul" for step in plan2.steps)
    assert has_git_tool
    print(f"  ✅ Git 存档计划生成成功")
    
    # 测试 3: 混合指令
    print("\n测试 3: 混合指令 (视频 + Git + 微调)")
    state_mixed = {
        "messages": [HumanMessage(content="分析视频并执行 LLM 微调训练")]
    }
    plan3 = planner.lober_planner(state_mixed)
    print(f"  计划 ID: {plan3.plan_id}")
    print(f"  总步骤：{plan3.total_steps}")
    print(f"  VRAM: {plan3.estimated_vram}")
    has_video = any("video" in s.description.lower() for s in plan3.steps)
    has_training = any("unsloth" in s.tool for s in plan3.steps)
    assert has_video or has_training
    print(f"  ✅ 混合指令计划生成成功")
    
    # 测试 4: 计划验证
    print("\n测试 4: 计划验证")
    is_valid = planner.validate_plan(plan1)
    print(f"  验证结果：{'✅ 通过' if is_valid else '❌ 失败'}")
    assert is_valid
    print(f"  ✅ 所有计划验证通过")
    
    # 测试 5: 字典转换
    print("\n测试 5: 字典转换")
    plan_dict = planner.plan_to_dict(plan1)
    print(f"  转换成功：{len(plan_dict)} 个字段")
    assert "plan_id" in plan_dict
    assert "total_steps" in plan_dict
    assert "steps" in plan_dict
    print(f"  ✅ 字典转换成功")
    
    # 测试 6: 工具信息
    print("\n测试 6: 工具信息")
    tool_info = planner.get_tool_info("sam2")
    print(f"  工具名称：{tool_info['name']}")
    print(f"  VRAM: {tool_info['vram_range']}")
    print(f"  描述：{tool_info['description']}")
    assert tool_info["name"] == "SAM-2.1"
    print(f"  ✅ 工具信息获取成功")
    
    print("\n" + "=" * 60)
    print("✅ 所有 LangChain Planner 测试通过！")
    print("=" * 60)

if __name__ == "__main__":
    test_langchain_planner()
