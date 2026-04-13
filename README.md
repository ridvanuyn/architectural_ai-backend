# Architectural AI Backend

🏛️ AI-powered interior design transformation uygulaması için Node.js + MongoDB backend API.

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Teknolojiler](#-teknolojiler)
- [Mimari](#-mimari)
- [Kurulum](#-kurulum)
- [Environment Yapılandırması](#-environment-yapılandırması)
- [S3 Yapılandırması](#-s3-yapılandırması)
- [Replicate AI Yapılandırması](#-replicate-ai-yapılandırması)
- [Migration'lar](#-migrationlar)
- [API Endpoints](#-api-endpoints)
- [Proje Yapısı](#-proje-yapısı)
- [Geliştirme](#-geliştirme)
- [Dokümantasyon](#-dokümantasyon)

## 📚 Dokümantasyon

Detaylı dökümanlar `docs/` klasöründe bulunmaktadır:

| Döküman | Açıklama |
|---------|----------|
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Tüm API endpoint'leri ve kullanım örnekleri |
| [SETUP.md](docs/SETUP.md) | Local development kurulum rehberi |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment rehberi |
| [FRONTEND_INTEGRATION.md](docs/FRONTEND_INTEGRATION.md) | Flutter entegrasyon rehberi |

## ✨ Özellikler

- **Kullanıcı Yönetimi**: Email, Google ve Apple ile kimlik doğrulama
- **Token Sistemi**: Uygulama içi satın alma ve token yönetimi
- **AI Görsel Dönüşümü**: Replicate AI ile 8 farklı iç mekan stili
- **S3 Görsel Depolama**: AWS S3 ile ölçeklenebilir görsel depolama
- **Abonelik Sistemi**: Aylık/yıllık premium abonelikler
- **Geçmiş Yönetimi**: Tasarım geçmişi ve favoriler

## 🛠 Teknolojiler

| Teknoloji | Kullanım |
|-----------|----------|
| Node.js 18+ | Runtime |
| Express.js | Web framework |
| MongoDB | Database |
| AWS S3 | Görsel depolama |
| Replicate AI | AI görsel dönüşümü |
| JWT | Authentication |
| Sharp | Görsel optimizasyonu |

## 🏗 Mimari

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Flutter App   │────▶│  Backend API    │────▶│    MongoDB      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
           ┌─────────────────┐   ┌─────────────────┐
           │     AWS S3      │   │   Replicate AI  │
           │ (Image Storage) │   │ (Image Generation)│
           └─────────────────┘   └─────────────────┘
```

### Görsel İşleme Akışı

1. **Upload**: Kullanıcı görseli → S3 (`originals/` klasörü)
2. **Process**: Replicate AI ile stil dönüşümü
3. **Save**: Oluşturulan görsel → S3 (`generated/` klasörü)
4. **Serve**: Presigned URL ile güvenli erişim

## 🚀 Kurulum

### Gereksinimler

- Node.js 18.0.0 veya üzeri
- MongoDB (local veya Atlas)
- AWS Hesabı (S3 bucket)
- Replicate Hesabı (API token)
- npm veya yarn

### Adımlar

```bash
# 1. Bağımlılıkları yükle
cd architectural_ai-backend
npm install

# 2. Environment dosyasını oluştur
cp env.sample .env

# 3. .env dosyasını düzenle (aşağıdaki bölümlere bakın)

# 4. MongoDB'yi başlat (local kullanıyorsanız)
mongod

# 5. Migration'ları çalıştır
npm run migrate

# 6. Seed verilerini ekle (opsiyonel)
npm run migrate:seed

# 7. Sunucuyu başlat
npm run dev
```

## ⚙️ Environment Yapılandırması

### Temel Yapılandırma

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/architectural_ai_dev
JWT_SECRET=your-jwt-secret-key
JWT_REFRESH_SECRET=your-jwt-refresh-secret-key
```

### Güçlü Secret Oluşturma

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📦 S3 Yapılandırması

### 1. AWS S3 Bucket Oluşturma

1. AWS Console'a gidin
2. S3 > Create Bucket
3. Bucket adı: `architectural-ai-images` (veya istediğiniz bir isim)
4. Region: `us-east-1` (veya size yakın bir region)
5. Block Public Access: **Enabled** (güvenlik için)
6. Create Bucket

### 2. IAM Kullanıcı Oluşturma

1. IAM > Users > Create User
2. User name: `architectural-ai-s3`
3. Attach policies directly:

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
        "arn:aws:s3:::architectural-ai-images",
        "arn:aws:s3:::architectural-ai-images/*"
      ]
    }
  ]
}
```

4. Create User > Create Access Key
5. Access Key ve Secret Key'i `.env` dosyasına ekleyin

### 3. Environment Variables

```env
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=architectural-ai-images
```

### S3 Klasör Yapısı

```
architectural-ai-images/
├── originals/
│   └── {userId}/
│       └── {uuid}.jpg
├── generated/
│   └── {userId}/
│       └── {uuid}.jpg
└── thumbnails/
    └── {userId}/
        └── {uuid}.jpg
```

## 🤖 Replicate AI Yapılandırması

### 1. Replicate Hesabı Oluşturma

1. [replicate.com](https://replicate.com) adresine gidin
2. GitHub ile hesap oluşturun
3. [API Tokens](https://replicate.com/account/api-tokens) sayfasına gidin
4. "Create Token" ile yeni token oluşturun

### 2. Environment Variable

```env
REPLICATE_API_TOKEN=r8_your_replicate_api_token_here
```

### 3. Kullanılan Model

Backend, [adirik/interior-design](https://replicate.com/adirik/interior-design) modelini kullanır:

- **Input**: Oda fotoğrafı + Stil seçimi
- **Output**: Dönüştürülmüş oda görseli
- **Maliyet**: ~$0.02-0.05 per görsel

### 4. Stil Prompt'ları

Her stil için optimize edilmiş prompt'lar mevcuttur:

| Stil | Özellikler |
|------|------------|
| Scandinavian | Clean lines, natural wood, white walls, minimalist |
| Modern | Sleek furniture, geometric lines, neutral colors |
| Industrial | Exposed brick, metal pipes, raw materials |
| Minimalist | Ultra clean, monochromatic, essential only |
| Luxury | Premium materials, marble, gold accents |
| Bohemian | Eclectic, colorful textiles, global patterns |
| Japanese | Zen, natural elements, spatial harmony |
| Mediterranean | Terracotta, whitewashed walls, coastal vibes |

## 🔄 Migration'lar

### Komutlar

```bash
# Tüm bekleyen migration'ları çalıştır
npm run migrate

# Son migration'ı geri al
npm run migrate:rollback

# Birden fazla migration'ı geri al
node src/migrations/rollback.js --steps=3

# Seed verilerini ekle
npm run migrate:seed

# Veritabanını temizle ve yeniden seed et
node src/migrations/seed.js --fresh
```

## 📡 API Endpoints

### Health Check

```
GET /health
```

### Authentication

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/register` | Yeni kullanıcı kaydı |
| POST | `/api/auth/login` | Email/şifre ile giriş |
| POST | `/api/auth/oauth` | Google/Apple ile giriş |
| POST | `/api/auth/refresh` | Token yenileme |
| GET | `/api/auth/me` | Kullanıcı bilgileri |
| PUT | `/api/auth/me` | Profil güncelleme |
| DELETE | `/api/auth/me` | Hesap silme |

### Designs

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/designs/upload` | Görsel yükle (multipart) |
| GET | `/api/designs/upload-url` | Presigned upload URL al |
| POST | `/api/designs` | Yeni tasarım oluştur |
| GET | `/api/designs` | Tasarımları listele |
| GET | `/api/designs/stats` | Tasarım istatistikleri |
| GET | `/api/designs/:id` | Tasarım detayı |
| DELETE | `/api/designs/:id` | Tasarım sil |
| GET | `/api/designs/:id/status` | İşlem durumu |
| PUT | `/api/designs/:id/favorite` | Favori toggle |
| POST | `/api/designs/:id/retry` | Başarısız tasarımı tekrar dene |
| GET | `/api/designs/:id/download/:type` | Görsel indir |

### Styles

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/styles` | Tüm stilleri listele |
| GET | `/api/styles/room-types` | Oda tiplerini listele |
| GET | `/api/styles/recommendations/:roomType` | Stil önerileri |
| GET | `/api/styles/:id` | Stil detayı |

### Tokens

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/tokens/packages` | Token paketleri (Public) |
| GET | `/api/tokens/balance` | Token bakiyesi |
| GET | `/api/tokens/transactions` | İşlem geçmişi |
| POST | `/api/tokens/purchase` | Token satın al |
| POST | `/api/tokens/subscription/cancel` | Abonelik iptal |
| POST | `/api/tokens/restore` | Satın alımları geri yükle |
| POST | `/api/tokens/promo` | Promosyon kodu uygula |

## 📁 Proje Yapısı

```
architectural_ai-backend/
├── src/
│   ├── config/
│   │   ├── constants.js      # Uygulama sabitleri
│   │   └── database.js       # MongoDB bağlantısı
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── designController.js
│   │   ├── styleController.js
│   │   └── tokenController.js
│   ├── middleware/
│   │   ├── auth.js           # JWT doğrulama
│   │   ├── errorHandler.js   # Hata yönetimi
│   │   └── upload.js         # Multer (dosya yükleme)
│   ├── migrations/
│   │   ├── scripts/          # Migration dosyaları
│   │   ├── run.js
│   │   ├── rollback.js
│   │   └── seed.js
│   ├── models/
│   │   ├── Design.js
│   │   ├── Transaction.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── designs.js
│   │   ├── styles.js
│   │   ├── tokens.js
│   │   └── index.js
│   ├── services/
│   │   ├── s3Service.js      # AWS S3 işlemleri
│   │   ├── replicateService.js # Replicate AI
│   │   └── index.js
│   ├── utils/
│   ├── app.js
│   └── server.js
├── env.sample
├── package.json
└── README.md
```

## 💻 Geliştirme

### Test Hesapları (Seed sonrası)

| Email | Şifre | Tip |
|-------|-------|-----|
| test@example.com | Test123! | Normal (10 token) |
| premium@example.com | Premium123! | Premium (unlimited) |

### Promosyon Kodları

| Kod | Token | Açıklama |
|-----|-------|----------|
| WELCOME2024 | 3 | Hoş geldin bonusu |
| ARCHITECT50 | 5 | %50 ekstra token |
| LAUNCH2024 | 10 | Lansman kutlaması |

### Örnek API Kullanımı

#### 1. Görsel Yükleme

```bash
curl -X POST http://localhost:3001/api/designs/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/room.jpg"
```

Response:
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.s3.region.amazonaws.com/originals/userId/uuid.jpg",
    "key": "originals/userId/uuid.jpg",
    "width": 1920,
    "height": 1080
  }
}
```

#### 2. Tasarım Oluşturma

```bash
curl -X POST http://localhost:3001/api/designs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "originalImageUrl": "https://bucket.s3.region.amazonaws.com/originals/userId/uuid.jpg",
    "originalImageKey": "originals/userId/uuid.jpg",
    "style": "scandinavian",
    "roomType": "living_room"
  }'
```

#### 3. Durum Kontrolü (Polling)

```bash
curl http://localhost:3001/api/designs/DESIGN_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "generatedImage": {
      "url": "https://bucket.s3.region.amazonaws.com/generated/userId/uuid.jpg"
    }
  }
}
```

### Maliyet Tahmini

| Bileşen | Maliyet |
|---------|---------|
| Replicate AI (per görsel) | ~$0.02-0.05 |
| S3 Storage (GB/ay) | ~$0.023 |
| S3 Transfer (GB) | ~$0.09 |
| MongoDB Atlas (M0 Free) | $0 |

**Örnek**: 1000 görsel dönüşümü/ay ≈ $20-50

## 🔒 Güvenlik

- Tüm görseller S3'te private olarak saklanır
- Erişim için presigned URL'ler kullanılır
- JWT ile authentication
- Rate limiting aktif
- Helmet.js güvenlik header'ları

## 📄 Lisans

ISC

---

**Architectural AI Backend** - Ridvan Uyan tarafından geliştirilmiştir.
