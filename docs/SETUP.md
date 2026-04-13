# Architectural AI Backend - Local Setup Guide

Bu döküman, projeyi local ortamda çalıştırmak için gerekli adımları içerir.

## 🚀 Hızlı Başlangıç

```bash
# 1. Bağımlılıkları yükle
cd architectural_ai-backend
npm install

# 2. Environment dosyasını oluştur
cp env.sample .env

# 3. .env dosyasını düzenle
# (MongoDB, JWT secrets, Replicate API token ekle)

# 4. MongoDB'yi başlat
mongod

# 5. Migration'ları çalıştır
npm run migrate

# 6. Seed verilerini ekle (opsiyonel)
npm run migrate:seed

# 7. Sunucuyu başlat
npm run dev
```

---

## 📋 Detaylı Kurulum

### 1. Node.js Kurulumu

Node.js 18+ gereklidir.

```bash
# NVM ile (önerilen)
nvm install 18
nvm use 18

# Versiyonu kontrol et
node --version
# v18.x.x
```

### 2. MongoDB Kurulumu

#### macOS (Homebrew)

```bash
# Install
brew tap mongodb/brew
brew install mongodb-community

# Start
brew services start mongodb-community

# Verify
mongosh
```

#### Ubuntu/Debian

```bash
# Import key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Docker

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:6
```

### 3. Environment Yapılandırması

`.env` dosyasını oluşturun:

```bash
cp env.sample .env
```

Minimum gerekli değişkenler:

```env
# Server
NODE_ENV=development
PORT=3001

# MongoDB (local)
MONGODB_URI=mongodb://localhost:27017/architectural_ai_dev

# JWT Secrets (development için basit değerler kullanabilirsiniz)
JWT_SECRET=dev-jwt-secret-key-for-testing
JWT_REFRESH_SECRET=dev-refresh-secret-key-for-testing

# CORS
CORS_ORIGIN=*

# Replicate AI (gerçek token gerekli!)
REPLICATE_API_TOKEN=r8_your_replicate_token_here
```

### 4. Replicate API Token

1. [replicate.com](https://replicate.com) adresine gidin
2. GitHub ile giriş yapın
3. [API Tokens](https://replicate.com/account/api-tokens) sayfasına gidin
4. "Create Token" butonuna tıklayın
5. Token'ı `.env` dosyasına ekleyin

### 5. Migration ve Seed

```bash
# Migration'ları çalıştır
npm run migrate

# Test verilerini ekle
npm run migrate:seed
```

Seed sonrası test hesapları:

| Email | Şifre | Açıklama |
|-------|-------|----------|
| test@example.com | Test123! | Normal kullanıcı (10 token) |
| premium@example.com | Premium123! | Premium kullanıcı |

### 6. Sunucuyu Başlat

```bash
# Development (hot reload)
npm run dev

# Production
npm start
```

Sunucu `http://localhost:3001` adresinde çalışacaktır.

---

## ✅ Kurulum Kontrolü

### Health Check

```bash
curl http://localhost:3001/health
```

Beklenen yanıt:
```json
{
  "success": true,
  "message": "Architectural AI API is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

### Login Test

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test123!"}'
```

### Styles Test

```bash
curl http://localhost:3001/api/styles
```

---

## 🛠 Development Tools

### Nodemon

Kod değişikliklerinde otomatik restart:

```bash
npm run dev
```

### MongoDB Compass

GUI ile veritabanını görüntüleme:

1. [MongoDB Compass](https://www.mongodb.com/try/download/compass) indir
2. Connection string: `mongodb://localhost:27017`
3. Database: `architectural_ai_dev`

### Postman/Insomnia

API test için:

1. [Postman](https://www.postman.com/downloads/) veya [Insomnia](https://insomnia.rest/download) indir
2. Base URL: `http://localhost:3001/api`
3. Auth header: `Bearer <token>`

---

## 🔧 Troubleshooting

### MongoDB Connection Error

```bash
# MongoDB servisini kontrol et
brew services list | grep mongodb
# veya
sudo systemctl status mongod

# Yeniden başlat
brew services restart mongodb-community
# veya
sudo systemctl restart mongod
```

### Port Already in Use

```bash
# 3001 portunu kullanan process'i bul
lsof -i :3001

# Process'i sonlandır
kill -9 <PID>

# Veya farklı port kullan
PORT=3002 npm run dev
```

### Module Not Found

```bash
# node_modules'ü sil ve yeniden yükle
rm -rf node_modules
npm install
```

### Replicate API Error

```bash
# Token'ı kontrol et
echo $REPLICATE_API_TOKEN

# Token geçerliliğini test et
curl -H "Authorization: Token $REPLICATE_API_TOKEN" \
  https://api.replicate.com/v1/models
```

---

## 📁 Proje Yapısı

```
architectural_ai-backend/
├── docs/                    # Dökümanlar
│   ├── API_DOCUMENTATION.md
│   ├── DEPLOYMENT.md
│   ├── FRONTEND_INTEGRATION.md
│   └── SETUP.md
├── src/
│   ├── config/              # Yapılandırma
│   ├── controllers/         # Route handler'lar
│   ├── middleware/          # Express middleware
│   ├── migrations/          # Database migration'lar
│   ├── models/              # Mongoose modelleri
│   ├── routes/              # API route'ları
│   ├── services/            # Business logic
│   ├── utils/               # Yardımcı fonksiyonlar
│   ├── app.js               # Express app
│   └── server.js            # Entry point
├── .env                     # Environment variables (gitignore)
├── .gitignore
├── env.sample               # Environment template
├── package.json
└── README.md
```

---

## 🧪 API Test Örnekleri

### 1. Register

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Password123!",
    "name": "New User"
  }'
```

### 2. Login & Get Token

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test123!"}' \
  | jq -r '.data.token')

echo $TOKEN
```

### 3. Get User Profile

```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Get Styles

```bash
curl http://localhost:3001/api/styles
```

### 5. Get Token Balance

```bash
curl http://localhost:3001/api/tokens/balance \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Apply Promo Code

```bash
curl -X POST http://localhost:3001/api/tokens/promo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code": "WELCOME2024"}'
```

---

## 🔒 S3 Olmadan Test (Opsiyonel)

S3 kurulumu olmadan test etmek için, mock S3 service kullanabilirsiniz:

```javascript
// src/services/s3Service.js - Mock version

module.exports = {
  uploadImage: async (buffer, options) => ({
    url: `http://localhost:3001/mock-images/${Date.now()}.jpg`,
    key: `mock/${Date.now()}.jpg`,
    width: 1920,
    height: 1080,
    size: buffer.length,
  }),
  
  uploadFromUrl: async (imageUrl, options) => ({
    url: imageUrl,
    key: `mock/${Date.now()}.jpg`,
  }),
  
  // ... diğer metodlar
};
```

---

## 📝 Notlar

- Development modunda rate limiting daha gevşektir
- JWT token'lar 30 gün geçerlidir
- Yeni kullanıcılar 3 ücretsiz token alır
- Replicate API kullanımı ücretlidir (~$0.02-0.05/görsel)

