/**
 * Migration Runner
 * 
 * Bu script tüm migration'ları sırasıyla çalıştırır.
 * 
 * Kullanım:
 *   npm run migrate
 * 
 * Veya:
 *   node src/migrations/run.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Migration model to track executed migrations
const migrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  executedAt: { type: Date, default: Date.now },
});

const Migration = mongoose.model('Migration', migrationSchema);

const runMigrations = async () => {
  try {
    // Connect to database
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'scripts');
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log('📁 Created migrations/scripts directory');
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('ℹ️  No migration files found');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Found ${migrationFiles.length} migration file(s)`);

    // Get already executed migrations
    const executedMigrations = await Migration.find({}).lean();
    const executedNames = new Set(executedMigrations.map(m => m.name));

    let migrationsRun = 0;

    for (const file of migrationFiles) {
      if (executedNames.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🚀 Running migration: ${file}`);
      
      try {
        const migration = require(path.join(migrationsDir, file));
        
        if (typeof migration.up !== 'function') {
          console.error(`❌ Migration ${file} does not export an 'up' function`);
          continue;
        }

        await migration.up(mongoose);
        
        // Record migration as executed
        await Migration.create({ name: file });
        
        console.log(`✅ Migration ${file} completed`);
        migrationsRun++;
      } catch (error) {
        console.error(`❌ Migration ${file} failed:`, error.message);
        throw error;
      }
    }

    console.log(`\n✨ Migrations complete. ${migrationsRun} migration(s) executed.`);
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

runMigrations();

