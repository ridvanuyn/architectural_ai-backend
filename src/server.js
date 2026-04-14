require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const es = require('./services/elasticsearchService');

const PORT = process.env.PORT || 3000;

// Connect to database
connectDB();

// Initialize Elasticsearch (non-blocking)
(async () => {
  try {
    const alive = await es.ping();
    if (!alive) {
      console.log('⚠️  Elasticsearch not available, using MongoDB fallback for search');
      return;
    }
    await es.ensureIndex();
    console.log('🔍 Elasticsearch connected and index ready');

    // Auto-sync on first boot if index is empty (wait for MongoDB)
    setTimeout(async () => {
      try {
        const docCount = await es.count();
        if (docCount === 0) {
          console.log('📥 Elasticsearch index is empty, auto-syncing from MongoDB...');
          const SpecialtyWorld = require('./models/SpecialtyWorld');
          const worlds = await SpecialtyWorld.find({ isActive: true }).lean();
          if (worlds.length > 0) {
            await es.syncAll(worlds);
            console.log(`✅ Auto-synced ${worlds.length} worlds to Elasticsearch`);
          }
        } else {
          console.log(`📊 Elasticsearch has ${docCount} docs indexed`);
        }
      } catch (syncErr) {
        console.warn('⚠️  Auto-sync failed:', syncErr.message);
      }
    }, 3000);
  } catch (e) {
    console.log('⚠️  Elasticsearch init failed:', e.message, '- using MongoDB fallback');
  }
})();

const server = app.listen(PORT, () => {
  console.log(`🏛️  Architectural AI API running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

