/**
 * Authentication Module
 * Created: 2026-04-09
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const TOKEN_EXPIRY = '30d';
const REFRESH_EXPIRY = '90d';

class AuthManager {
  constructor() {
    this.tokenBlacklist = new Set();
  }

  /**
   * 生成访问令牌
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
      algorithm: 'HS256'
    });
  }

  /**
   * 生成刷新令牌
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_EXPIRY,
      algorithm: 'HS256'
    });
  }

  /**
   * 验证令牌
   */
  verifyToken(token) {
    try {
      // 检查是否在黑名单中
      if (this.tokenBlacklist.has(token)) {
        throw new Error('Token has been revoked');
      }
      
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * 生成 API Key
   */
  generateApiKey(name, permissions = [], expiresAt = null) {
    const apiKey = `lk_${Buffer.from(Math.random().toString(36).substring(2)).toString('hex')}`;
    const keyHash = bcrypt.hashSync(apiKey, 10);
    
    const keyData = {
      name,
      keyHash,
      permissions,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      lastUsedAt: null,
      isActive: true
    };

    // 实际应该存储到数据库
    console.log('API Key generated:', name);
    
    return {
      ...keyData,
      apiKey // 只返回一次
    };
  }

  /**
   * 验证 API Key
   */
  validateApiKey(apiKey, requiredPermissions = []) {
    try {
      const isValid = bcrypt.compareSync(apiKey, 'your-stored-hash');
      return {
        isValid: isValid,
        permissions: requiredPermissions,
        expiresAt: null
      };
    } catch (error) {
      return {
        isValid: false,
        permissions: [],
        error: 'Invalid API key'
      };
    }
  }

  /**
   * 撤销令牌
   */
  revokeToken(token) {
    this.tokenBlacklist.add(token);
    return true;
  }

  /**
   * 刷新令牌
   */
  refreshToken(refreshToken) {
    const decoded = this.verifyToken(refreshToken);
    
    // 生成新的 access token
    const newAccessToken = this.generateAccessToken({
      userId: decoded.userId,
      type: 'access'
    });

    return {
      accessToken: newAccessToken,
      expiresIn: TOKEN_EXPIRY
    };
  }

  /**
   * 生成临时令牌
   */
  generateTempToken(user, duration = '1h') {
    return jwt.sign(
      {
        userId: user.id,
        type: 'temp',
        ...user
      },
      JWT_SECRET,
      { expiresIn: duration }
    );
  }
}

module.exports = new AuthManager();
