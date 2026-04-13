/**
 * Migration: Initial Indexes
 * 
 * Bu migration veritabanı index'lerini oluşturur.
 * 
 * Tarih: 2024-01-01
 */

module.exports = {
  /**
   * Migration'ı uygula
   */
  async up(mongoose) {
    const db = mongoose.connection.db;

    console.log('  📇 Creating indexes for users collection...');
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { 'subscription.endDate': 1 } },
      { key: { createdAt: -1 } },
    ]);

    console.log('  📇 Creating indexes for designs collection...');
    await db.collection('designs').createIndexes([
      { key: { user: 1, createdAt: -1 } },
      { key: { user: 1, status: 1 } },
      { key: { user: 1, isFavorite: 1 } },
      { key: { status: 1, createdAt: 1 } },
    ]);

    console.log('  📇 Creating indexes for transactions collection...');
    await db.collection('transactions').createIndexes([
      { key: { user: 1, createdAt: -1 } },
      { key: { user: 1, type: 1 } },
      { key: { 'payment.transactionId': 1 }, sparse: true },
      { key: { status: 1 } },
    ]);

    console.log('  ✅ All indexes created successfully');
  },

  /**
   * Migration'ı geri al
   */
  async down(mongoose) {
    const db = mongoose.connection.db;

    console.log('  🗑️  Dropping indexes...');
    
    // Not: Unique email index'i düşürmek tehlikeli olabilir
    // Bu örnekte sadece ek index'leri düşürüyoruz
    
    await db.collection('designs').dropIndexes();
    await db.collection('transactions').dropIndexes();
    
    console.log('  ✅ Indexes dropped');
  },
};

