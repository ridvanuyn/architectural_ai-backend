# Architectural AI Backend - Deployment Guide

Bu döküman, Architectural AI Backend'in production ortamına deploy edilmesi için gerekli adımları içerir.

## 📋 İçindekiler

- [Gereksinimler](#gereksinimler)
- [Environment Yapılandırması](#environment-yapılandırması)
- [MongoDB Atlas Kurulumu](#mongodb-atlas-kurulumu)
- [AWS S3 Kurulumu](#aws-s3-kurulumu)
- [Replicate AI Kurulumu](#replicate-ai-kurulumu)
- [Deployment Seçenekleri](#deployment-seçenekleri)
- [Docker ile Deployment](#docker-ile-deployment)
- [Railway Deployment](#railway-deployment)
- [AWS EC2 Deployment](#aws-ec2-deployment)
- [Monitoring ve Logging](#monitoring-ve-logging)

---

## Gereksinimler

- Node.js 18.0.0 veya üzeri
- MongoDB 6.0 veya üzeri
- AWS Hesabı (S3 için)
- Replicate Hesabı (AI için)
- Domain ve SSL sertifikası

---

## Environment Yapılandırması

### Production Environment Variables

```env
# Server
NODE_ENV=production
PORT=3001

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/architectural_ai_prod?retryWrites=true&w=majority

# JWT (Güçlü random string kullanın!)
JWT_SECRET=<64+ karakter random string>
JWT_REFRESH_SECRET=<64+ karakter random string>

# CORS (Sadece izin verilen domain'ler)
CORS_ORIGIN=https://your-app.com,https://admin.your-app.com

# AWS S3
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=eu-central-1
AWS_S3_BUCKET=architectural-ai-prod

# Replicate AI
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
REPLICATE_WEBHOOK_URL=https://api.your-app.com/api/webhooks/replicate

# Logging
LOG_LEVEL=info
```

### Secret Oluşturma

```bash
# JWT Secret oluştur
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## MongoDB Atlas Kurulumu

### 1. Cluster Oluşturma

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) hesabı oluşturun
2. "Create Cluster" butonuna tıklayın
3. Free tier (M0) veya Production tier seçin
4. Region olarak kullanıcılarınıza yakın bir bölge seçin (örn: Frankfurt)

### 2. Database User Oluşturma

1. Security > Database Access
2. "Add New Database User"
3. Authentication Method: Password
4. Username ve güçlü bir password oluşturun
5. Built-in Role: "Read and write to any database"

### 3. Network Access

1. Security > Network Access
2. "Add IP Address"
3. Production için: Sunucunuzun IP adresini ekleyin
4. Veya "Allow Access from Anywhere" (0.0.0.0/0) - daha az güvenli

### 4. Connection String

1. Clusters > Connect > Connect your application
2. Driver: Node.js, Version: 5.5 or later
3. Connection string'i kopyalayın:
   ```
   mongodb+srv://user:<password>@cluster.mongodb.net/architectural_ai_prod?retryWrites=true&w=majority
   ```

---

## AWS S3 Kurulumu

### 1. S3 Bucket Oluşturma

```bash
# AWS CLI ile
aws s3 mb s3://architectural-ai-prod --region eu-central-1
```

Veya Console'dan:
1. S3 > Create bucket
2. Bucket name: `architectural-ai-prod`
3. Region: `eu-central-1`
4. Block all public access: **Enabled**
5. Bucket Versioning: Enabled (opsiyonel)

### 2. CORS Configuration

Bucket > Permissions > CORS:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["https://your-app.com"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

### 3. IAM User ve Policy

1. IAM > Users > Create user
2. User name: `architectural-ai-s3`
3. Attach policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::architectural-ai-prod",
                "arn:aws:s3:::architectural-ai-prod/*"
            ]
        }
    ]
}
```

4. Create Access Key > Application running outside AWS
5. Access Key ve Secret Key'i kaydedin

---

## Replicate AI Kurulumu

### 1. API Token

1. [replicate.com](https://replicate.com) hesabı oluşturun
2. [API Tokens](https://replicate.com/account/api-tokens) sayfasına gidin
3. "Create Token" ile yeni token oluşturun
4. Token'ı `.env` dosyasına ekleyin

### 2. Webhook URL

Production sunucunuz deploy edildikten sonra:

```env
REPLICATE_WEBHOOK_URL=https://api.your-app.com/api/webhooks/replicate
```

### 3. Billing

- Replicate kullandıkça öde modeliyle çalışır
- [Pricing](https://replicate.com/pricing) sayfasından maliyetleri kontrol edin
- Billing alerts ayarlayın

---

## Deployment Seçenekleri

| Platform | Maliyet | Zorluk | Önerilen |
|----------|---------|--------|----------|
| Railway | $5-20/ay | Kolay | ✓ Başlangıç |
| Render | $7-25/ay | Kolay | ✓ Başlangıç |
| DigitalOcean App | $5-25/ay | Orta | ✓ Orta |
| AWS EC2 | $10-50/ay | Zor | Production |
| AWS ECS | $20-100/ay | Çok Zor | Enterprise |

---

## Docker ile Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start
CMD ["node", "src/server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
      - REPLICATE_API_TOKEN=${REPLICATE_API_TOKEN}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Build ve Run

```bash
# Build
docker build -t architectural-ai-backend .

# Run
docker run -d \
  --name architectural-ai \
  -p 3001:3001 \
  --env-file .env.production \
  architectural-ai-backend

# Logs
docker logs -f architectural-ai
```

---

## Railway Deployment

### 1. Railway CLI

```bash
# Install
npm install -g @railway/cli

# Login
railway login

# Init
railway init

# Deploy
railway up
```

### 2. Environment Variables

Railway Dashboard > Variables:
- Tüm production environment variables'ları ekleyin

### 3. Domain

Railway Dashboard > Settings > Domains:
- Custom domain ekleyin
- SSL otomatik olarak sağlanır

---

## AWS EC2 Deployment

### 1. EC2 Instance

```bash
# t3.small veya t3.medium önerilir
# Ubuntu 22.04 LTS
# Security Group: 22 (SSH), 80 (HTTP), 443 (HTTPS)
```

### 2. Setup Script

```bash
#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repo
git clone https://github.com/your-repo/architectural_ai-backend.git
cd architectural_ai-backend

# Install dependencies
npm ci --only=production

# Create .env
nano .env
# (environment variables'ları yapıştırın)

# Start with PM2
pm2 start src/server.js --name architectural-ai
pm2 save
pm2 startup
```

### 3. Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/architectural-ai
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com
```

---

## Monitoring ve Logging

### PM2 Monitoring

```bash
# Status
pm2 status

# Logs
pm2 logs architectural-ai

# Monitoring
pm2 monit
```

### Sentry Integration (Opsiyonel)

```bash
npm install @sentry/node
```

```javascript
// src/app.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Health Check Endpoint

```bash
# Test
curl https://api.your-domain.com/health

# Response
{
  "success": true,
  "message": "Architectural AI API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

## Security Checklist

- [ ] JWT secrets güçlü ve unique
- [ ] CORS sadece izin verilen domain'ler
- [ ] MongoDB IP whitelist
- [ ] S3 bucket public access kapalı
- [ ] HTTPS zorunlu
- [ ] Rate limiting aktif
- [ ] Helmet.js aktif
- [ ] Environment variables güvenli şekilde saklanıyor
- [ ] Logging aktif (hassas veri loglanmıyor)
- [ ] Regular backups (MongoDB)

---

## Troubleshooting

### MongoDB Connection Error

```bash
# IP whitelist kontrol
# Connection string format kontrol
# Network erişim kontrol
```

### S3 Upload Error

```bash
# IAM permissions kontrol
# Bucket region kontrol
# CORS configuration kontrol
```

### Replicate API Error

```bash
# API token geçerlilik kontrol
# Billing/credit kontrol
# Rate limit kontrol
```

