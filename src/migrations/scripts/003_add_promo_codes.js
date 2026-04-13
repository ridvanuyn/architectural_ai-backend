/**
 * Migration: Add Promo Codes Collection
 * 
 * Bu migration promosyon kodları tablosunu oluşturur.
 * 
 * Tarih: 2024-01-03
 */

module.exports = {
  /**
   * Migration'ı uygula
   */
  async up(mongoose) {
    const db = mongoose.connection.db;

    console.log('  🎫 Creating promo codes collection...');
    
    // Check if collection exists
    const collections = await db.listCollections({ name: 'promocodes' }).toArray();
    
    if (collections.length === 0) {
      await db.createCollection('promocodes');
    }

    // Create indexes
    await db.collection('promocodes').createIndexes([
      { key: { code: 1 }, unique: true },
      { key: { expiresAt: 1 } },
      { key: { isActive: 1 } },
    ]);

    // Insert initial promo codes
    const promoCodes = [
      {
        code: 'WELCOME2024',
        description: 'Welcome bonus for new users',
        type: 'tokens',
        value: 3,
        maxUses: 10000,
        usedCount: 0,
        isActive: true,
        expiresAt: new Date('2025-12-31'),
        createdAt: new Date(),
      },
      {
        code: 'ARCHITECT50',
        description: '50% extra tokens promotion',
        type: 'tokens',
        value: 5,
        maxUses: 5000,
        usedCount: 0,
        isActive: true,
        expiresAt: new Date('2025-06-30'),
        createdAt: new Date(),
      },
      {
        code: 'LAUNCH2024',
        description: 'Launch celebration bonus',
        type: 'tokens',
        value: 10,
        maxUses: 1000,
        usedCount: 0,
        isActive: true,
        expiresAt: new Date('2024-12-31'),
        createdAt: new Date(),
      },
    ];

    for (const promo of promoCodes) {
      await db.collection('promocodes').updateOne(
        { code: promo.code },
        { $set: promo },
        { upsert: true }
      );
    }

    console.log(`  ✅ ${promoCodes.length} promo codes added`);
  },

  /**
   * Migration'ı geri al
   */
  async down(mongoose) {
    const db = mongoose.connection.db;

    console.log('  🗑️  Dropping promo codes collection...');
    
    try {
      await db.collection('promocodes').drop();
      console.log('  ✅ Promo codes collection dropped');
    } catch (error) {
      if (error.code === 26) {
        console.log('  ℹ️  Promo codes collection does not exist');
      } else {
        throw error;
      }
    }
  },
};

