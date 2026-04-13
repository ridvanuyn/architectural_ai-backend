/**
 * Database Seeder
 * 
 * Bu script veritabanına başlangıç verilerini ekler.
 * 
 * Kullanım:
 *   npm run migrate:seed
 * 
 * Veya:
 *   node src/migrations/seed.js
 * 
 * Mevcut verileri silip yeniden seed etmek için:
 *   node src/migrations/seed.js --fresh
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    // Parse arguments
    const args = process.argv.slice(2);
    const fresh = args.includes('--fresh');

    // Connect to database
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import models
    const User = require('../models/User');
    const Design = require('../models/Design');
    const Transaction = require('../models/Transaction');

    if (fresh) {
      console.log('🗑️  Clearing existing data...');
      await User.deleteMany({});
      await Design.deleteMany({});
      await Transaction.deleteMany({});
      console.log('✅ Existing data cleared');
    }

    // Create test users
    console.log('👤 Creating test users...');
    
    const testUsers = [
      {
        email: 'test@example.com',
        password: 'Test123!',
        name: 'Test User',
        authProvider: 'email',
        tokens: {
          balance: 10,
          totalPurchased: 10,
          totalUsed: 0,
        },
        onboarding: {
          completed: true,
          preferredStyles: ['scandinavian', 'modern'],
          usageIntent: 'personal',
        },
      },
      {
        email: 'premium@example.com',
        password: 'Premium123!',
        name: 'Premium User',
        authProvider: 'email',
        tokens: {
          balance: 100,
          totalPurchased: 100,
          totalUsed: 0,
        },
        subscription: {
          plan: 'premium_monthly',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          isActive: true,
        },
        onboarding: {
          completed: true,
          preferredStyles: ['luxury', 'modern', 'minimalist'],
          usageIntent: 'professional',
        },
      },
    ];

    for (const userData of testUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser && !fresh) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      const user = new User(userData);
      await user.save();
      console.log(`✅ Created user: ${userData.email}`);
    }

    console.log('\n✨ Seeding complete!');
    console.log('\n📋 Test Accounts:');
    console.log('   Email: test@example.com | Password: Test123!');
    console.log('   Email: premium@example.com | Password: Premium123!');
    
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();

