# Architectural AI - API Documentation

Bu döküman, Architectural AI Backend API'sinin tüm endpoint'lerini ve kullanım detaylarını içerir.

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.your-domain.com/api
```

## Authentication

Tüm korumalı endpoint'ler JWT Bearer token gerektirir:

```
Authorization: Bearer <access_token>
```

---

## 🔐 Authentication Endpoints

### Register

Yeni kullanıcı kaydı oluşturur.

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "email": "user@example.com",
      "name": "John Doe",
      "tokens": {
        "balance": 3,
        "totalPurchased": 0,
        "totalUsed": 0
      },
      "subscription": {
        "plan": "free",
        "isActive": false
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Login

Email ve şifre ile giriş yapar.

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "...",
    "refreshToken": "..."
  }
}
```

---

### OAuth Login (Google/Apple)

OAuth provider ile giriş yapar.

```http
POST /api/auth/oauth
```

**Request Body:**
```json
{
  "provider": "google",
  "providerId": "google-user-id-123",
  "email": "user@gmail.com",
  "name": "John Doe",
  "avatar": "https://..."
}
```

---

### Get Current User

Mevcut kullanıcı bilgilerini getirir.

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "email": "user@example.com",
    "name": "John Doe",
    "tokens": {
      "balance": 10,
      "totalPurchased": 15,
      "totalUsed": 5
    },
    "subscription": {
      "plan": "free",
      "isActive": false
    },
    "stats": {
      "totalDesigns": 5,
      "favoriteStyle": "scandinavian"
    },
    "settings": {
      "notificationsEnabled": true,
      "saveOriginalImages": true,
      "preferredQuality": "high"
    }
  }
}
```

---

### Update Profile

Kullanıcı profilini günceller.

```http
PUT /api/auth/me
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Updated",
  "settings": {
    "notificationsEnabled": false,
    "preferredQuality": "medium"
  }
}
```

---

### Refresh Token

Access token'ı yeniler.

```http
POST /api/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Logout

Çıkış yapar ve refresh token'ı geçersiz kılar.

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

---

### Complete Onboarding

Onboarding sürecini tamamlar.

```http
POST /api/auth/onboarding
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "preferredStyles": ["scandinavian", "modern", "minimalist"],
  "usageIntent": "personal"
}
```

---

### Delete Account

Hesabı siler (soft delete).

```http
DELETE /api/auth/me
Authorization: Bearer <token>
```

---

## 🎨 Design Endpoints

### Upload Image

Görsel yükler ve S3 URL'i döner.

```http
POST /api/designs/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `image`: File (JPEG, PNG, WebP - max 10MB)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.s3.region.amazonaws.com/originals/userId/uuid.jpg",
    "key": "originals/userId/uuid.jpg",
    "width": 1920,
    "height": 1080,
    "size": 245000
  }
}
```

---

### Get Presigned Upload URL

Client-side upload için presigned URL alır.

```http
GET /api/designs/upload-url?contentType=image/jpeg
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://bucket.s3.region.amazonaws.com/...",
    "key": "originals/userId/uuid.jpg",
    "publicUrl": "https://bucket.s3.region.amazonaws.com/originals/userId/uuid.jpg",
    "expiresIn": 300
  }
}
```

---

### Create Design

Yeni tasarım dönüşümü başlatır.

```http
POST /api/designs
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "originalImageUrl": "https://bucket.s3.region.amazonaws.com/originals/userId/uuid.jpg",
  "originalImageKey": "originals/userId/uuid.jpg",
  "style": "scandinavian",
  "roomType": "living_room",
  "title": "My Living Room Transformation",
  "customPrompt": "extra wooden elements"
}
```

**Available Styles:**
- `scandinavian`
- `modern`
- `industrial`
- `minimalist`
- `luxury`
- `bohemian`
- `japanese`
- `mediterranean`

**Available Room Types:**
- `living_room`
- `bedroom`
- `kitchen`
- `bathroom`
- `dining_room`
- `home_office`
- `outdoor`
- `other`

**Response (201):**
```json
{
  "success": true,
  "message": "Design is being processed. Check status for updates.",
  "data": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "user": "65f1a2b3c4d5e6f7g8h9i0j2",
    "originalImage": {
      "url": "https://...",
      "key": "originals/..."
    },
    "style": "scandinavian",
    "roomType": "living_room",
    "title": "My Living Room Transformation",
    "status": "processing",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Get All Designs

Kullanıcının tasarımlarını listeler.

```http
GET /api/designs?page=1&limit=20&status=completed&style=scandinavian&favorite=true
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Sayfa numarası (default: 1) |
| limit | number | Sayfa başına öğe (default: 20) |
| status | string | pending, processing, completed, failed |
| style | string | Stil filtresi |
| favorite | boolean | Sadece favoriler |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "originalImage": { "url": "..." },
      "generatedImage": { "url": "..." },
      "style": "scandinavian",
      "status": "completed",
      "isFavorite": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### Get Design by ID

Tek bir tasarımın detaylarını getirir.

```http
GET /api/designs/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "user": "65f1a2b3c4d5e6f7g8h9i0j2",
    "originalImage": {
      "url": "https://...",
      "key": "originals/...",
      "width": 1920,
      "height": 1080
    },
    "generatedImage": {
      "url": "https://...",
      "key": "generated/...",
      "width": 1920,
      "height": 1080
    },
    "style": "scandinavian",
    "roomType": "living_room",
    "title": "My Living Room Transformation",
    "status": "completed",
    "isFavorite": false,
    "tokensUsed": 1,
    "processing": {
      "startedAt": "2024-01-15T10:30:00.000Z",
      "completedAt": "2024-01-15T10:31:30.000Z",
      "duration": 90000
    },
    "aiParams": {
      "model": "adirik/interior-design:...",
      "prompt": "scandinavian interior design..."
    },
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Get Design Status

Tasarım işleme durumunu kontrol eder (polling için).

```http
GET /api/designs/:id/status
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "generatedImage": {
      "url": "https://..."
    },
    "originalImage": {
      "url": "https://..."
    },
    "style": "scandinavian",
    "processing": {
      "startedAt": "2024-01-15T10:30:00.000Z",
      "completedAt": "2024-01-15T10:31:30.000Z"
    }
  }
}
```

**Status Values:**
- `pending` - Kuyrukta bekliyor
- `processing` - AI işleniyor
- `completed` - Tamamlandı
- `failed` - Başarısız

---

### Toggle Favorite

Tasarımı favorilere ekler/çıkarır.

```http
PUT /api/designs/:id/favorite
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "isFavorite": true
  }
}
```

---

### Retry Failed Design

Başarısız tasarımı tekrar dener (max 3 deneme).

```http
POST /api/designs/:id/retry
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Design queued for retry",
  "data": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "status": "processing"
  }
}
```

---

### Download Design

Tasarım görselini indirir.

```http
GET /api/designs/:id/download/:type
Authorization: Bearer <token>
```

**Path Parameters:**
- `type`: `original` veya `generated`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://...",
    "expiresIn": 300
  }
}
```

---

### Delete Design

Tasarımı siler.

```http
DELETE /api/designs/:id
Authorization: Bearer <token>
```

---

### Get Design Stats

Kullanıcının tasarım istatistiklerini getirir.

```http
GET /api/designs/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalDesigns": 25,
    "completedDesigns": 22,
    "favoriteDesigns": 8,
    "styleStats": [
      { "_id": "scandinavian", "count": 10 },
      { "_id": "modern", "count": 8 },
      { "_id": "minimalist", "count": 4 }
    ],
    "favoriteStyle": "scandinavian"
  }
}
```

---

## 🎭 Style Endpoints

### Get All Styles

Mevcut tüm stilleri listeler.

```http
GET /api/styles
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "scandinavian",
      "name": "Scandinavian",
      "description": "Clean lines, natural materials, and minimalist aesthetic",
      "icon": "nordic"
    },
    {
      "id": "modern",
      "name": "Modern",
      "description": "Contemporary design with sleek furniture and clean forms",
      "icon": "modern"
    }
  ],
  "count": 8
}
```

---

### Get Style by ID

Tek bir stilin detaylarını getirir.

```http
GET /api/styles/:id
```

---

### Get Room Types

Mevcut oda tiplerini listeler.

```http
GET /api/styles/room-types
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": "living_room", "name": "Living Room" },
    { "id": "bedroom", "name": "Bedroom" },
    { "id": "kitchen", "name": "Kitchen" }
  ],
  "count": 8
}
```

---

### Get Style Recommendations

Oda tipine göre stil önerileri getirir.

```http
GET /api/styles/recommendations/:roomType
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "scandinavian",
      "name": "Scandinavian",
      "description": "..."
    }
  ],
  "roomType": "living_room"
}
```

---

## 💰 Token Endpoints

### Get Token Balance

Kullanıcının token bakiyesini getirir.

```http
GET /api/tokens/balance
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "balance": 15,
    "totalPurchased": 20,
    "totalUsed": 5,
    "subscription": {
      "isActive": false,
      "plan": "free",
      "endDate": null
    }
  }
}
```

---

### Get Token Packages

Satın alınabilir token paketlerini listeler.

```http
GET /api/tokens/packages
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "starter",
      "name": "Starter Pack",
      "tokens": 5,
      "price": 4.99,
      "currency": "USD",
      "savings": null
    },
    {
      "id": "popular",
      "name": "Popular Pack",
      "tokens": 15,
      "price": 9.99,
      "currency": "USD",
      "savings": "33%",
      "isFeatured": true
    },
    {
      "id": "pro",
      "name": "Pro Pack",
      "tokens": 50,
      "price": 24.99,
      "currency": "USD",
      "savings": "50%"
    },
    {
      "id": "unlimited",
      "name": "Unlimited Monthly",
      "tokens": -1,
      "price": 19.99,
      "currency": "USD",
      "isSubscription": true,
      "period": "monthly"
    }
  ]
}
```

---

### Purchase Tokens

Token satın alır.

```http
POST /api/tokens/purchase
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "packageId": "popular",
  "paymentMethod": "apple_pay",
  "transactionId": "apple-transaction-id-123",
  "receiptData": "base64-encoded-receipt"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "15 tokens added successfully",
  "data": {
    "tokens": {
      "balance": 25,
      "totalPurchased": 35,
      "totalUsed": 10
    },
    "subscription": {
      "isActive": false,
      "plan": "free"
    }
  }
}
```

---

### Get Transactions

Token işlem geçmişini getirir.

```http
GET /api/tokens/transactions?page=1&limit=20&type=purchase
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Sayfa numarası |
| limit | number | Sayfa başına öğe |
| type | string | purchase, usage, bonus, refund, subscription |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "type": "purchase",
      "tokens": {
        "amount": 15,
        "balanceBefore": 10,
        "balanceAfter": 25
      },
      "payment": {
        "amount": 9.99,
        "currency": "USD",
        "method": "apple_pay"
      },
      "package": {
        "id": "popular",
        "name": "Popular Pack"
      },
      "description": "Purchased Popular Pack",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

---

### Apply Promo Code

Promosyon kodu uygular.

```http
POST /api/tokens/promo
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "code": "WELCOME2024"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "3 bonus tokens added!",
  "data": {
    "tokens": {
      "balance": 18,
      "totalPurchased": 20,
      "totalUsed": 5
    }
  }
}
```

**Available Promo Codes:**
| Code | Tokens | Description |
|------|--------|-------------|
| WELCOME2024 | 3 | Welcome bonus |
| ARCHITECT50 | 5 | 50% extra tokens |
| LAUNCH2024 | 10 | Launch celebration |

---

### Cancel Subscription

Aboneliği iptal eder.

```http
POST /api/tokens/subscription/cancel
Authorization: Bearer <token>
```

---

### Restore Purchases

Satın alımları geri yükler (app reinstall için).

```http
POST /api/tokens/restore
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "receipts": ["receipt1", "receipt2"]
}
```

---

## 🔔 Webhook Endpoints

### Replicate AI Webhook

Replicate AI'dan async sonuç alır.

```http
POST /api/webhooks/replicate
```

**Request Body (from Replicate):**
```json
{
  "id": "prediction-id",
  "status": "succeeded",
  "output": "https://replicate.delivery/...",
  "metrics": {
    "predict_time": 45.2
  }
}
```

---

## ❌ Error Responses

Tüm hatalar aşağıdaki formatta döner:

```json
{
  "success": false,
  "message": "Error description",
  "stack": "..." // Only in development
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 402 | Payment Required (insufficient tokens) |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Common Errors

**Insufficient Tokens (402):**
```json
{
  "success": false,
  "message": "Insufficient tokens. Please purchase more tokens.",
  "data": {
    "required": 1,
    "available": 0
  }
}
```

**Invalid Token (401):**
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

**Rate Limited (429):**
```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```

