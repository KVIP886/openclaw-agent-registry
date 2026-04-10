#!/bin/bash
"""
OpenClaw Git 灵魂解构工具
目标：从哈希树层面掌控版本安全
"""

set -e  # 遇到错误立即退出

echo "🦞 OpenClaw Git 灵魂解构工具"
echo "========================================"

# 1. 创建测试对象
echo "🔍 步骤 1: 创建哈希对象"
echo "lobster content" | git hash-object -w --stdin > /tmp/lobster_hash.txt
LOBSTER_HASH=$(cat /tmp/lobster_hash.txt)
echo "✅ 创建哈希对象：$LOBSTER_HASH"

# 2. 探察内容
echo ""
echo "📦 步骤 2: 内容探察"
echo "🔍 查看哈希对象详情:"
git cat-file -p "$LOBSTER_HASH"
echo "✅ 内容探察完成"

# 3. 验证完整性
echo ""
echo "🛡️ 步骤 3: 完整性验证"
echo "🔍 运行 fsck 检查..."
git fsck --lost-found
echo "✅ 完整性验证完成"

# 4. 查看日志
echo ""
echo "📜 步骤 4: 参考日志"
echo "🔍 查看最近提交:"
git reflog --oneline -5
echo "✅ 日志查看完成"

# 5. 创建 GPG 签名示例
echo ""
echo "🔐 步骤 5: GPG 签名示例"
if command -v gpg &> /dev/null; then
    echo "lobster signature" | gpg --clearsign --armor --output /tmp/lobster.sig.txt
    echo "✅ GPG 签名完成"
    cat /tmp/lobster.sig.txt
else
    echo "⚠️  GPG 未安装，跳过签名步骤"
fi

# 6. 清理临时文件
rm -f /tmp/lobster_hash.txt /tmp/lobster.sig.txt

echo ""
echo "========================================"
echo "🎉 Git 灵魂解构完成！"
echo "✅ 哈希树掌控完成"
echo "✅ 版本安全验证完成"
echo "========================================"
