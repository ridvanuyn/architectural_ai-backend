module.exports = {
  // Design styles available in the app
  DESIGN_STYLES: [
    { id: 'modern', name: 'Modern', description: 'Clean lines, open light', icon: 'modern', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400' },
    { id: 'scandinavian', name: 'Scandinavian', description: 'Warm minimal, soft woods', icon: 'nordic', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400' },
    { id: 'japandi', name: 'Japandi', description: 'Calm, natural balance', icon: 'zen', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400' },
    { id: 'industrial', name: 'Industrial', description: 'Raw textures, bold edges', icon: 'industrial', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400' },
    { id: 'classic', name: 'Classic', description: 'Elegant details, timeless', icon: 'classic', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=400' },
    { id: 'bohemian', name: 'Bohemian', description: 'Layered, artistic comfort', icon: 'boho', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400' },
    { id: 'minimalist', name: 'Minimalist', description: 'Less is more', icon: 'minimal', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400' },
    { id: 'japanese', name: 'Japanese', description: 'Zen minimalism, natural wood', icon: 'japanese', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1545083036-b175dd155a1d?w=400' },
    { id: 'mediterranean', name: 'Mediterranean', description: 'Warm coastal vibes', icon: 'mediterranean', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=400' },
    { id: 'art-deco', name: 'Art Deco', description: 'Bold geometry, glamour', icon: 'deco', category: 'trending', imageUrl: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=400' },
    { id: 'rustic', name: 'Rustic', description: 'Warm wood, country feel', icon: 'rustic', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=400' },
    { id: 'mid-century', name: 'Mid-Century', description: 'Retro modern, organic forms', icon: 'retro', category: 'trending', imageUrl: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400' },
    { id: 'coastal', name: 'Coastal', description: 'Beach house serenity', icon: 'coastal', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=400' },
    { id: 'tropical', name: 'Tropical', description: 'Lush greens, paradise vibes', icon: 'tropical', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=400' },
    { id: 'cyberpunk', name: 'Cyberpunk', description: 'Neon lights, futuristic', icon: 'cyber', category: 'creative', imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400' },
    { id: 'luxury', name: 'Luxury', description: 'Premium materials, glow', icon: 'luxury', category: 'base', imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400' },
  ],

  // Room types
  ROOM_TYPES: [
    'living_room',
    'bedroom',
    'kitchen',
    'bathroom',
    'dining_room',
    'home_office',
    'outdoor',
    'other',
  ],

  // Design processing statuses
  DESIGN_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  },

  // Token packages for purchase
  TOKEN_PACKAGES: [
    {
      id: 'starter',
      name: 'Starter Pack',
      tokens: 5,
      price: 4.99,
      currency: 'USD',
      savings: null,
    },
    {
      id: 'popular',
      name: 'Popular Pack',
      tokens: 15,
      price: 9.99,
      currency: 'USD',
      savings: '33%',
      isFeatured: true,
    },
    {
      id: 'pro',
      name: 'Pro Pack',
      tokens: 50,
      price: 24.99,
      currency: 'USD',
      savings: '50%',
    },
    {
      id: 'unlimited',
      name: 'Unlimited Monthly',
      tokens: -1, // -1 means unlimited
      price: 19.99,
      currency: 'USD',
      isSubscription: true,
      period: 'monthly',
    },
  ],

  // Free tokens for new users
  INITIAL_FREE_TOKENS: 5,

  // Token cost per design generation
  TOKENS_PER_DESIGN: 1,

  // Subscription plans
  SUBSCRIPTION_PLANS: {
    FREE: 'free',
    PREMIUM_MONTHLY: 'premium_monthly',
    PREMIUM_YEARLY: 'premium_yearly',
  },

  // Transaction types
  TRANSACTION_TYPES: {
    PURCHASE: 'purchase',
    USAGE: 'usage',
    BONUS: 'bonus',
    REFUND: 'refund',
    SUBSCRIPTION: 'subscription',
  },

  // Image processing settings
  IMAGE_SETTINGS: {
    MAX_SIZE_MB: 10,
    ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],
    OUTPUT_FORMAT: 'jpeg',
    OUTPUT_QUALITY: 90,
    MAX_DIMENSION: 2048,
  },

  // AI processing settings (Replicate)
  AI_SETTINGS: {
    DEFAULT_MODEL: 'INTERIOR_DESIGN',
    INFERENCE_STEPS: parseInt(process.env.AI_INFERENCE_STEPS) || 30,
    GUIDANCE_SCALE: parseFloat(process.env.AI_GUIDANCE_SCALE) || 7.5,
  },

  // S3 folder structure
  S3_FOLDERS: {
    ORIGINALS: 'originals',
    GENERATED: 'generated',
    THUMBNAILS: 'thumbnails',
  },

  // JWT expiration
  JWT_EXPIRE: '30d',
  JWT_REFRESH_EXPIRE: '90d',
};
