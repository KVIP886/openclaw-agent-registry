# API Keys Setup Guide

## ⚠️ **Security Best Practices**

### **NEVER Commit API Keys to Git!**
- ✅ All API keys should be stored in **environment variables**
- ✅ Use `.env` file locally (NOT committed to Git)
- ✅ Use secure secret management for production (AWS Secrets Manager, HashiCorp Vault)

---

## 🔧 **Setup Instructions**

### **Step 1: Create `.env` file**

Create a `.env` file in the project root:

```bash
# Video Generation API Keys (Environment Variables)
GOOGLE_VEO_API_KEY=your_google_veo_api_key_here
SEEDANCE_API_KEY=your_seedance_api_key_here
WAN_API_KEY=your_alibaba_wan_api_key_here
RUNWAY_API_KEY=your_runway_api_key_here
SORA_API_KEY=your_openai_sora_api_key_here
KLING_API_KEY=your_kling_api_key_here
MINIMAX_API_KEY=your_minimax_api_key_here

# Ollama Configuration
OLLAMA_GPU_LAYERS=33
OLLAMA_NUM_PARALLEL=2
OLLAMA_NUM_THREADS=8

# Additional Settings
VIDEO_GENERATION_MAX_DURATION=15
VIDEO_GENERATION_DEFAULT_RESOLUTION=1080p
```

### **Step 2: Load Environment Variables**

The application will automatically load `.env` using `dotenv` package:

```javascript
require('dotenv').config();

// Access API keys
const veo3ApiKey = process.env.GOOGLE_VEO_API_KEY;
const seedanceApiKey = process.env.SEEDANCE_API_KEY;
// ... etc
```

### **Step 3: Configure Providers**

Edit `config/api-keys.json` to enable/disable providers:

```json
{
  "providers": {
    "veo3": {
      "apiKey": "${GOOGLE_VEO_API_KEY}",
      "enabled": true
    },
    "seedance": {
      "apiKey": "${SEEDANCE_API_KEY}",
      "enabled": false
    }
  }
}
```

---

## 🔐 **Security Checklist**

- ✅ **NEVER** commit API keys to Git
- ✅ **ALWAYS** use environment variables
- ✅ **USE** `.gitignore` to protect sensitive files
- ✅ **ROTATE** API keys regularly (every 90 days)
- ✅ **LIMIT** API key permissions (least privilege)
- ✅ **MONITOR** API usage for anomalies
- ✅ **USE** secret management for production

---

## 🚨 **What to do if API Keys are Committed**

1. **Immediate Action**:
   - Revoke the exposed API keys immediately
   - Generate new API keys
   - Update `.env` file with new keys

2. **Prevent Future Incidents**:
   - Add `.env` and `config/api-keys.json` to `.gitignore`
   - Use git history tools to remove sensitive data from history
   - Set up pre-commit hooks to check for API keys

---

## 📋 **Required API Keys**

| Provider | Cost | Best For | Setup Link |
|----------|------|----------|------------|
| **Google Veo 3.1** | Highest | Cinema quality, native audio | [Google Cloud Console](https://console.cloud.google.com/) |
| **BytePlus Seedance** | Low | Value, Chinese optimized | [BytePlus Console](https://console.volcengine.com/) |
| **Alibaba Wan 2.6** | Free | Testing, Chinese optimized | [Alibaba Cloud Console](https://aliyun.com/) |
| **Runway Gen4.5** | Medium | Professional quality | [RunwayML Dashboard](https://runwayml.com/) |
| **OpenAI Sora 2** | Highest | Physics simulation | [OpenAI Dashboard](https://openai.com/) |
| **Kling v3 Pro** | High | Motion control, 3min | [Kling Console](https://kling.com/) |
| **MiniMax Hailuo** | Low | Mobile, Chinese | [MiniMax Console](https://minimaxi.com/) |

---

## 🧪 **Testing Your Setup**

After configuring API keys, test the setup:

```bash
# Test all providers
npm run video:test

# Test a specific provider
node scripts/create-lobster-video.js --provider veo3
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

**Issue**: "API key not found"
- **Solution**: Check that `.env` file exists and all required variables are set

**Issue**: "Invalid API key"
- **Solution**: Verify API key is correct and has proper permissions

**Issue**: "404 Not Found"
- **Solution**: Check API endpoint URL and version compatibility

---

## 📚 **Related Documentation**

- [Video Generation API Docs](./VIDEO_GENERATION_API.md)
- [Security Best Practices](./SECURITY.md)
- [Environment Configuration](./ENV_CONFIG.md)

---

**Last Updated**: 2026-04-10  
**Version**: 2.0.0  
**Status**: ✅ Secure Configuration Guide
