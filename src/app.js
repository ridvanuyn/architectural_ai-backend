const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const designController = require('./controllers/designController');

const app = express();

// Cloudflare tek proxy hop → sadece onu güven. Bu sayede req.ip ve
// `CF-Connecting-IP` header'ı gerçek kullanıcı IP'sini verir; trust proxy
// olmadan rate limiter tüm trafiği tek Cloudflare edge IP'sinden geliyor
// zanneder ve global bir limit haline gelir.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting — iki katmanlı:
//   publicLimiter: listing/feed gibi kullanıcıdan bağımsız GET'ler (bol).
//   authLimiter  : auth akışı ve design/token write'ları (sıkı).
// Her ikisi de Cloudflare'in CF-Connecting-IP header'ını tercih eder;
// yoksa req.ip (X-Forwarded-For ilk kayıt) kullanılır.
const realIp = (req) => req.headers['cf-connecting-ip'] || req.ip;

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // /15dk/user — home/feed açılışı rahatça yetsin
  keyGenerator: realIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // /15dk/user — brute-force ve abuse koruması
  keyGenerator: realIp,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

// Design create + retry için dar pencere — fal.ai çağrısı pahalı, token
// yakar. Sadece POST / (create) ve POST /:id/retry sayılır; list/get/status
// polling limit dışında (publicLimiter'a düşer) çünkü Flutter ProcessingScreen
// saniyede bir status çağırıyor.
const designWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // dk/user — create/retry abuse koruması
  keyGenerator: realIp,
  standardHeaders: true,
  legacyHeaders: false,
  // app.use('/api/designs', ...) mount altındayız → req.path relatif.
  skip: (req) => {
    if (req.method !== 'POST') return true;
    return req.path !== '/' && !/^\/[^/]+\/retry$/.test(req.path);
  },
  message: {
    success: false,
    message: 'Too many design creations. Slow down and try again in a minute.',
  },
});

// Sıkı limiter'lar önce (route-bazlı); genel publicLimiter en sonda fallback.
app.use('/api/auth', authLimiter);
app.use('/api/designs', designWriteLimiter);
app.use('/api/tokens/purchase', authLimiter);
app.use('/api/tokens/grant', authLimiter);
app.use('/api/tokens/refund', authLimiter);
app.use('/api', publicLimiter);

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve uploaded files locally (dev fallback when S3 not configured)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check — uptime, memory ve AI semafor durumu (droplet izleme için).
app.get('/health', (req, res) => {
  const aiLimit = designController._aiLimit;
  res.status(200).json({
    success: true,
    message: 'Architectural AI API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    ai: aiLimit
      ? { active: aiLimit.activeCount, pending: aiLimit.pendingCount }
      : null,
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;

