# OpenClaw API Documentation - CI/CD Configuration

## 📋 Overview

This configuration enables automated API documentation building, validation, and deployment through GitHub Actions.

## 🚀 Quick Start

### **1. Enable GitHub Actions**
Go to your repository: **Settings** → **Actions** → **General** → Enable workflows

### **2. Configure Secrets**
Add the following repository secrets:

```bash
# Slack Webhook (for notifications)
SLACK_WEBHOOK_URL = https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Production Server SSH (optional)
DEPLOY_SSH_KEY = -----BEGIN OPENSSH PRIVATE KEY-----\nYOUR_KEY\n-----END OPENSSH PRIVATE KEY-----
DEPLOY_SSH_HOST = your-production-server.com
DEPLOY_SSH_USER = deploy
```

### **3. Test Locally**
```bash
# Install Redoc CLI
npm install -g redoc-cli

# Validate OpenAPI spec
redoc-cli validate docs/openapi.yaml

# Build documentation
redoc-cli build docs/openapi.yaml -o docs/redoc.html
```

## 🔄 Workflow Triggers

### **Automatic Triggers**

1. **Push to Develop Branch**
   - Branch: `develop`
   - Paths: `docs/**`, `src/**/*.js`
   - Deploy to: Development environment

2. **Push to Main Branch**
   - Branch: `main`
   - Paths: `docs/**`, `src/**/*.js`
   - Deploy to: Production environment
   - Generate TypeScript SDK

3. **Scheduled Build (Daily)**
   - Time: UTC 00:00 (Beijing 08:00)
   - Deploy to: Development environment
   - Purpose: Ensure docs are always up-to-date

4. **Manual Trigger**
   - Available in Actions tab
   - Select environment: dev, staging, production
   - Purpose: On-demand deployments

## 📊 Build Pipeline

### **Stage 1: Validate OpenAPI**
- **Action**: Validate OpenAPI 3.0 specification
- **Tool**: Redoc CLI
- **Output**: ✅ Pass / ❌ Fail
- **Status**: Required for all PRs

### **Stage 2: Lint Documentation**
- **Action**: Check Markdown formatting
- **Tool**: markdownlint-cli
- **Output**: ✅ Pass / ❌ Fail
- **Status**: Required for all PRs

### **Stage 3: Build Documentation**
- **Actions**:
  - Build Redoc HTML
  - Bundle Swagger YAML
  - Generate TypeScript SDK
  - Upload build artifacts
- **Output**: `docs/` directory
- **Retention**: 30 days

### **Stage 4: Deploy**
- **Dev Environment**:
  - Branch: `develop`
  - Target: Dev server
  - CD: Automatic deployment

- **Production Environment**:
  - Branch: `main`
  - Target: Production server
  - CD: Requires approval
  - CD: CDN cache invalidation

### **Stage 5: Notify**
- **Platform**: Slack
- **Events**: Build success/failure
- **Channel**: #api-docs-notifications
- **Content**: Build status, duration, links

## 🔧 Configuration Files

### **`.github/workflows/api-docs-ci.yml`**
Main CI/CD workflow file

### **`.github/workflows/api-docs-docker-ci.yml`**
Docker containerization workflow (optional)

### **`scripts/deploy-docs.sh`**
Deployment script for manual use

## 📦 Build Outputs

### **Generated Files**

1. **Redoc HTML** (`docs/redoc.html`)
   - Standalone HTML file
   - Responsive design
   - Built-in search
   - Dark mode support

2. **Swagger Bundled** (`docs/swagger-bundled.yaml`)
   - Consolidated OpenAPI spec
   - No external references
   - Ready for deployment

3. **TypeScript SDK** (`docs/typescript-client.d.ts`)
   - Auto-generated types
   - 100% type-safe
   - Ready for import

4. **Build Artifacts** (uploaded to GitHub)
   - All generated files
   - Source maps
   - Build logs

## 🌐 Deployment Targets

### **Development Environment**
- **URL**: `https://dev-api-docs.openclaw.ai`
- **Branch**: `develop`
- **Auto-Deploy**: Yes
- **Cache**: 1 hour
- **SSL**: Let's Encrypt

### **Production Environment**
- **URL**: `https://api.openclaw.ai/docs`
- **Branch**: `main`
- **Auto-Deploy**: Yes
- **Cache**: 24 hours
- **SSL**: Custom certificate
- **CDN**: CloudFront/AWS

## 🔐 Security Features

- ✅ **No Secrets in Code**: All credentials use GitHub Secrets
- ✅ **SSH Key Encryption**: Deploy keys encrypted
- ✅ **CDN Cache Protection**: Cache invalidation on deploy
- ✅ **Access Control**: Role-based deployment permissions
- ✅ **Audit Logging**: All deployments logged

## 📈 Monitoring

### **Build Metrics**
- Build duration
- Success/failure rate
- Deployment frequency
- CDN cache hit ratio

### **Alerts**
- Build failures
- Deployment failures
- Security vulnerabilities
- Performance degradation

## 🛠️ Customization

### **Change Build Time**
Edit `workflow_dispatch` schedule in `.github/workflows/api-docs-ci.yml`

```yaml
schedule:
  - cron: '*/30 * * * *'  # Every 30 minutes
```

### **Add Deployment Target**
Add new job to workflow:

```yaml
deploy-staging:
  name: Deploy to Staging
  # ... configuration
```

### **Change Notification Channel**
Update Slack webhook URL in repository secrets

### **Custom Build Scripts**
Add custom steps to workflow:

```yaml
- name: Custom Build Step
  run: |
    # Your custom commands
    echo "Building custom content..."
```

## 📝 Version Control

### **Tag-based Releases**
```bash
git tag v1.0.0
git push origin v1.0.0
```

Triggers:
- Full documentation rebuild
- SDK generation
- Production deployment

## 🚦 CI/CD Best Practices

1. **Always validate OpenAPI spec** before any changes
2. **Test locally** before pushing
3. **Review build logs** for any warnings
4. **Monitor deployment metrics** regularly
5. **Keep secrets rotated** and secure

## 🔧 Troubleshooting

### **Build Fails Validation**
```bash
# Check OpenAPI spec syntax
redoc-cli validate docs/openapi.yaml

# Fix any reported errors
# Re-run validation
```

### **Deployment Fails**
```bash
# Check SSH connection
ssh -T user@your-server

# Verify file permissions
ls -la /var/www/openclaw-api-docs/

# Check disk space
df -h /var/www/
```

### **CDN Not Updating**
```bash
# Manually invalidate CDN cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## 📞 Support

- **Documentation**: [View API Docs](./docs/index.html)
- **Issues**: [Submit Issue](https://github.com/KVIP886/openclaw-agent-registry/issues)
- **Slack**: #api-docs-notifications

---

**Last Updated**: 2026-04-09 16:18 (Asia/Shanghai)  
**Version**: 1.0.0
