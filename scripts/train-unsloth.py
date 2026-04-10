#!/usr/bin/env python3
"""
OpenClaw 专属 LLM 微调脚本 - Unsloth + RTX 5090 优化版
目标：基于 Qwen3.5:35b 微调专属模型，2x 加速 + bf16 全开
"""

import os
import torch
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments
from unsloth import FastLanguageModel

def create_training_pipeline():
    """创建训练流水线"""
    
    # 1. 加载 Qwen3.5:35b 模型
    print("🚀 步骤 1: 加载 Qwen3.5:35b 模型 (RTX 5090 优化版)")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name="Qwen/Qwen3.5-35B-Instruct",
        max_seq_length=8192,
        dtype=torch.bfloat16,
        load_in_4bit=True,
        device_map="auto",
    )
    
    # 2. 配置 LoRA (r=64, alpha=16)
    print("🔧 步骤 2: 配置 LoRA 微调参数 (r=64, alpha=16)")
    model = FastLanguageModel.get_peft_model(
        model,
        r=64,
        lora_alpha=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.1,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )
    
    return model, tokenizer

def load_training_data():
    """加载 OpenClaw 日志数据集"""
    print("📊 步骤 3: 加载训练数据 (openclaw_logs)")
    
    # 模拟数据加载（实际执行时需要真实数据集）
    dataset = load_dataset(
        "json",
        data_files="data/openclaw_logs.json",
        split="train"
    )
    
    print(f"✅ 数据集加载完成：{len(dataset)} 条记录")
    return dataset

def train_model(model, tokenizer, dataset):
    """执行模型训练"""
    print("🔥 步骤 4: 开始训练...")
    
    # 配置训练参数 (RTX 5090 优化)
    training_args = TrainingArguments(
        output_dir="./qwen35_openclaw_finetuned",
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        max_steps=1000,
        learning_rate=2e-4,
        fp16=False,
        bf16=True,  # bf16 启用，RTX 5090 专属
        logging_steps=10,
        save_steps=100,
        warmup_steps=50,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="linear",
        seed=42,
    )
    
    # 创建训练器
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=8192,
        args=training_args,
    )
    
    # 开始训练
    trainer.train()
    
    print("✅ 训练完成！模型已保存至 ./qwen35_openclaw_finetuned")
    return trainer

def main():
    """主执行函数"""
    print("🦞 OpenClaw 专属 LLM 微调启动")
    print("=" * 60)
    
    try:
        # 执行训练流水线
        model, tokenizer = create_training_pipeline()
        dataset = load_training_data()
        train_model(model, tokenizer, dataset)
        
        print("=" * 60)
        print("🎉 OpenClaw 专属模型微调完成！")
        print("📍 模型位置: ./qwen35_openclaw_finetuned")
        print("🚀 性能提升：2x 加速 + bf16 全开")
        
    except Exception as e:
        print(f"❌ 训练失败：{e}")
        raise

if __name__ == "__main__":
    main()
