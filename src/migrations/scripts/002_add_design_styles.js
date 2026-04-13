/**
 * Migration: Add Design Styles Collection
 * 
 * Bu migration tasarım stillerini veritabanına ekler.
 * (Opsiyonel - stiller constants.js'den de okunabilir)
 * 
 * Tarih: 2024-01-02
 */

const { DESIGN_STYLES } = require('../../config/constants');

module.exports = {
  /**
   * Migration'ı uygula
   */
  async up(mongoose) {
    const db = mongoose.connection.db;

    console.log('  🎨 Creating styles collection...');
    
    // Check if collection exists
    const collections = await db.listCollections({ name: 'styles' }).toArray();
    
    if (collections.length === 0) {
      await db.createCollection('styles');
    }

    // Insert styles with additional metadata
    const stylesWithMeta = DESIGN_STYLES.map((style, index) => ({
      ...style,
      order: index,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add sample images for each style
      sampleImages: [
        `https://example.com/styles/${style.id}/sample1.jpg`,
        `https://example.com/styles/${style.id}/sample2.jpg`,
        `https://example.com/styles/${style.id}/sample3.jpg`,
      ],
      // AI prompts for each style
      aiPrompts: {
        positive: `${style.name} interior design, ${style.description}, high quality, professional photography`,
        negative: 'blurry, low quality, distorted, ugly',
      },
    }));

    // Upsert each style
    for (const style of stylesWithMeta) {
      await db.collection('styles').updateOne(
        { id: style.id },
        { $set: style },
        { upsert: true }
      );
    }

    console.log(`  ✅ ${stylesWithMeta.length} styles added/updated`);
  },

  /**
   * Migration'ı geri al
   */
  async down(mongoose) {
    const db = mongoose.connection.db;

    console.log('  🗑️  Dropping styles collection...');
    
    try {
      await db.collection('styles').drop();
      console.log('  ✅ Styles collection dropped');
    } catch (error) {
      if (error.code === 26) {
        console.log('  ℹ️  Styles collection does not exist');
      } else {
        throw error;
      }
    }
  },
};

