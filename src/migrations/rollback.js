/**
 * Migration Rollback
 * 
 * Bu script son çalıştırılan migration'ı geri alır.
 * 
 * Kullanım:
 *   npm run migrate:rollback
 * 
 * Veya:
 *   node src/migrations/rollback.js
 * 
 * Birden fazla migration geri almak için:
 *   node src/migrations/rollback.js --steps=3
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Migration model
const migrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  executedAt: { type: Date, default: Date.now },
});

const Migration = mongoose.model('Migration', migrationSchema);

const rollbackMigrations = async () => {
  try {
    // Parse arguments
    const args = process.argv.slice(2);
    let steps = 1;
    
    for (const arg of args) {
      if (arg.startsWith('--steps=')) {
        steps = parseInt(arg.split('=')[1], 10);
      }
    }

    // Connect to database
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get last executed migrations
    const executedMigrations = await Migration.find({})
      .sort({ executedAt: -1 })
      .limit(steps)
      .lean();

    if (executedMigrations.length === 0) {
      console.log('ℹ️  No migrations to rollback');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Rolling back ${executedMigrations.length} migration(s)`);

    const migrationsDir = path.join(__dirname, 'scripts');
    let migrationsRolledBack = 0;

    for (const migration of executedMigrations) {
      const filePath = path.join(migrationsDir, migration.name);
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Migration file not found: ${migration.name}`);
        continue;
      }

      console.log(`🔄 Rolling back: ${migration.name}`);

      try {
        const migrationModule = require(filePath);
        
        if (typeof migrationModule.down !== 'function') {
          console.warn(`⚠️  Migration ${migration.name} does not have a 'down' function, skipping...`);
          continue;
        }

        await migrationModule.down(mongoose);
        
        // Remove migration record
        await Migration.deleteOne({ name: migration.name });
        
        console.log(`✅ Rolled back: ${migration.name}`);
        migrationsRolledBack++;
      } catch (error) {
        console.error(`❌ Rollback failed for ${migration.name}:`, error.message);
        throw error;
      }
    }

    console.log(`\n✨ Rollback complete. ${migrationsRolledBack} migration(s) rolled back.`);
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Rollback error:', error);
    process.exit(1);
  }
};

rollbackMigrations();

