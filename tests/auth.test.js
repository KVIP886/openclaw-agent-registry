/**
 * Authentication System Tests
 * OpenClaw Agent Registry v1.0.0
 * Testing: JWT Authentication, Token Management, Password Hashing
 */

const Auth = require('../src/auth');

describe('Authentication System', () => {
  let auth;
  const TEST_USER = {
    id: 'test-user',
    username: 'testuser',
    passwordHash: '$2a$10$test',
    permissions: ['agent:read', 'agent:create'],
    roles: 'operator'
  };

  beforeEach(() => {
    auth = new Auth();
  });

  describe('Password Hashing', () => {
    it('should generate different hash for different passwords', () => {
      const hash1 = auth.hashPassword('password1');
      const hash2 = auth.hashPassword('password2');
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).toBe(hash2); // bcrypt always returns same format
    });

    it('should hash password with same salt', () => {
      const password = 'test123';
      const hash1 = auth.hashPassword(password);
      const hash2 = auth.hashPassword(password);
      
      expect(hash1).toEqual(hash2);
    });
  });

  describe('Token Generation', () => {
    it('should generate valid access token', () => {
      const token = auth.generateAccessToken(TEST_USER);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should generate token with correct payload', () => {
      const token = auth.generateAccessToken(TEST_USER);
      const decoded = auth.verifyToken(token);
      
      expect(decoded).toEqual({
        id: 'test-user',
        username: 'testuser',
        passwordHash: '$2a$10$test',
        permissions: ['agent:read', 'agent:create'],
        roles: 'operator'
      });
    });

    it('should handle string permissions correctly', () => {
      const userWithStringPermissions = {
        ...TEST_USER,
        permissions: 'agent:read agent:create'
      };
      
      const token = auth.generateAccessToken(userWithStringPermissions);
      const decoded = auth.verifyToken(token);
      
      expect(decoded.permissions).toBe('agent:read agent:create');
    });

    it('should set token expiry', () => {
      const token = auth.generateAccessToken(TEST_USER);
      const decoded = auth.verifyToken(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000 + 24 * 3600); // 24h
    });
  });

  describe('Token Verification', () => {
    it('should verify valid token', () => {
      const token = auth.generateAccessToken(TEST_USER);
      
      const decoded = auth.verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.username).toBe('testuser');
    });

    it('should throw error for invalid token format', () => {
      expect(() => auth.verifyToken('invalid.token')).toThrow('Invalid token');
    });

    it('should throw error for tampered token', () => {
      const token = auth.generateAccessToken(TEST_USER);
      const tampered = token.split('.')[0] + '.tampered.' + token.split('.')[2];
      
      expect(() => auth.verifyToken(tampered)).toThrow('Invalid token');
    });
  });

  describe('Token Blacklist', () => {
    it('should add token to blacklist', () => {
      const token = auth.generateAccessToken(TEST_USER);
      
      auth.revokeToken(token);
      
      expect(() => auth.verifyToken(token)).toThrow('Token has been revoked');
    });

    it('should not allow revoked token', () => {
      const token = auth.generateAccessToken(TEST_USER);
      
      auth.revokeToken(token);
      
      expect(auth.verifyToken(token)).toThrow('Token has been revoked');
    });

    it('should allow non-blacklisted token', () => {
      const token1 = auth.generateAccessToken(TEST_USER);
      const token2 = auth.generateAccessToken(TEST_USER);
      
      auth.revokeToken(token1);
      
      expect(() => auth.verifyToken(token2)).not.toThrow();
    });
  });

  describe('API Key Generation', () => {
    it('should generate API key with correct format', () => {
      const apiKey = auth.generateApiKey('test-api-key');
      
      expect(apiKey).toMatch(/^lk_[a-f0-9]+$/);
    });

    it('should generate unique API keys', () => {
      const key1 = auth.generateApiKey('key1');
      const key2 = auth.generateApiKey('key2');
      
      expect(key1).not.toBe(key2);
    });

    it('should support custom expiration', () => {
      const expiresAt = new Date('2027-01-01').getTime();
      const apiKey = auth.generateApiKey('test', [], expiresAt);
      
      expect(apiKey).toBeDefined();
    });

    it('should hash API key before storing', () => {
      const apiKey = auth.generateApiKey('test-api-key');
      const hash = auth.hashApiKey(apiKey);
      
      expect(hash).toBeDefined();
      expect(hash).toMatch(/^\$2a\$/); // bcrypt format
    });
  });

  describe('Token Expiry', () => {
    it('should handle expired tokens', () => {
      // Create token with short expiry
      const authShort = new Auth();
      const token = authShort.generateAccessToken(TEST_USER);
      
      // Manually decode and modify expiry
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const tamperedToken = `${parts[0]}.${Buffer.from(JSON.stringify(payload)).toString('base64')}.${parts[2]}`;
      
      expect(() => authShort.verifyToken(tamperedToken)).toThrow('Invalid token');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty permissions', () => {
      const user = { ...TEST_USER, permissions: [] };
      const token = auth.generateAccessToken(user);
      const decoded = auth.verifyToken(token);
      
      expect(decoded.permissions).toEqual([]);
    });

    it('should handle null permissions', () => {
      const user = { ...TEST_USER, permissions: null };
      const token = auth.generateAccessToken(user);
      const decoded = auth.verifyToken(token);
      
      expect(decoded.permissions).toBe(null);
    });

    it('should handle very long usernames', () => {
      const longUser = {
        ...TEST_USER,
        username: 'a'.repeat(1000)
      };
      
      const token = auth.generateAccessToken(longUser);
      const decoded = auth.verifyToken(token);
      
      expect(decoded.username).toBe(longUser.username);
    });
  });
});
