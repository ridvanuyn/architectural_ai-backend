/**
 * Migration: Add Theme Requests Collection
 *
 * Bu migration kullanıcı tema isteklerini saklayan requests koleksiyonunu ve
 * index'lerini oluşturur.
 *
 * Tarih: 2024-01-04
 */

module.exports = {
  /**
   * Migration'ı uygula
   */
  async up(mongoose) {
    const db = mongoose.connection.db;

    console.log('  💡 Creating requests collection...');

    // Check if collection exists
    const collections = await db.listCollections({ name: 'requests' }).toArray();

    if (collections.length === 0) {
      await db.createCollection('requests');
    }

    console.log('  📇 Creating indexes for requests collection...');
    await db.collection('requests').createIndexes([
      { key: { createdAt: -1 } },
      { key: { status: 1, createdAt: -1 } },
      { key: { user: 1, createdAt: -1 }, sparse: true },
    ]);

    console.log('  ✅ Theme requests collection ready');
  },

  /**
   * Migration'ı geri al
   */
  async down(mongoose) {
    const db = mongoose.connection.db;

    console.log('  🗑️  Dropping requests collection...');

    try {
      await db.collection('requests').drop();
      console.log('  ✅ Requests collection dropped');
    } catch (error) {
      if (error.code === 26) {
        console.log('  ℹ️  Requests collection does not exist');
      } else {
        throw error;
      }
    }
  },
};
