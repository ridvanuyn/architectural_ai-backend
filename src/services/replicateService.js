/**
 * Replicate AI Service
 * 
 * Interior design image generation using Replicate API.
 * Model: adirik/interior-design (or configurable)
 */

const Replicate = require('replicate');
const { DESIGN_STYLES, AI_SETTINGS } = require('../config/constants');

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Model configurations
const MODELS = {
  // Interior design specific model
  INTERIOR_DESIGN: 'adirik/interior-design:76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38',
  
  // Alternative: Stable Diffusion for more control
  STABLE_DIFFUSION: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
  
  // ControlNet for better structure preservation
  CONTROLNET: 'jagilley/controlnet-hough:854e8727697a057c525cdb45ab037f64ecca770a1769cc52287c2e56f33ac8b8',
};

// Style-specific prompts for better results
const STYLE_PROMPTS = {
  scandinavian: {
    positive: 'scandinavian interior design, nordic style, clean lines, natural wood, white walls, minimalist furniture, hygge atmosphere, soft natural lighting, cozy textiles, plants, light oak floors, neutral color palette, functional design',
    negative: 'cluttered, dark, ornate, baroque, victorian, heavy curtains, dark wood, busy patterns',
  },
  modern: {
    positive: 'modern contemporary interior design, sleek furniture, clean geometric lines, neutral colors with bold accents, open space, large windows, polished surfaces, minimal decoration, sophisticated lighting, glass and metal elements',
    negative: 'vintage, rustic, traditional, ornate, cluttered, heavy fabrics, antique furniture',
  },
  industrial: {
    positive: 'industrial interior design, exposed brick walls, metal pipes, concrete floors, raw materials, factory-style lighting, open ductwork, leather furniture, iron accents, urban loft style, vintage industrial elements',
    negative: 'soft, feminine, floral, delicate, pastel colors, ornate details, traditional',
  },
  minimalist: {
    positive: 'minimalist interior design, ultra clean lines, monochromatic palette, essential furniture only, lots of white space, hidden storage, simple geometric shapes, zen atmosphere, natural light, uncluttered surfaces',
    negative: 'cluttered, decorative, ornate, colorful, busy, patterned, traditional, rustic',
  },
  luxury: {
    positive: 'luxury high-end interior design, premium materials, marble surfaces, gold accents, crystal chandeliers, velvet upholstery, rich textures, sophisticated color palette, designer furniture, art pieces, elegant lighting',
    negative: 'cheap, basic, industrial, rustic, minimalist, simple, plain',
  },
  bohemian: {
    positive: 'bohemian interior design, eclectic mix, colorful textiles, global patterns, layered rugs, plants everywhere, macrame, rattan furniture, vintage pieces, artistic displays, warm earthy tones, cozy atmosphere',
    negative: 'minimal, monochrome, sterile, corporate, modern, sleek, cold',
  },
  japanese: {
    positive: 'japanese interior design, zen minimalism, shoji screens, tatami elements, natural wood, bamboo accents, neutral earth tones, low furniture, indoor garden, clean lines, peaceful atmosphere, wabi-sabi aesthetic',
    negative: 'cluttered, colorful, western, heavy furniture, ornate, busy patterns',
  },
  mediterranean: {
    positive: 'mediterranean interior design, terracotta tiles, whitewashed walls, arched doorways, wrought iron details, blue accents, natural textures, rustic wood beams, coastal vibes, warm sunlight, olive and citrus tones',
    negative: 'cold, industrial, modern, minimalist, dark colors, sleek surfaces',
  },
};

/**
 * Generate style prompt based on style and room type
 */
const generatePrompt = (style, roomType, customPrompt = '') => {
  const stylePrompts = STYLE_PROMPTS[style] || STYLE_PROMPTS.modern;
  
  const roomPrompts = {
    living_room: 'spacious living room, comfortable seating area, coffee table, entertainment area',
    bedroom: 'cozy bedroom, comfortable bed, nightstands, wardrobe, relaxing atmosphere',
    kitchen: 'modern kitchen, countertops, cabinets, appliances, cooking area, dining space',
    bathroom: 'elegant bathroom, vanity, mirror, shower or bathtub, tiles, fixtures',
    dining_room: 'dining room, dining table, chairs, lighting fixture, sideboard',
    home_office: 'home office, desk, office chair, shelving, organized workspace, good lighting',
    outdoor: 'outdoor living space, patio furniture, garden elements, natural surroundings',
    other: 'interior space, well-designed room',
  };

  const roomContext = roomPrompts[roomType] || roomPrompts.other;

  const positivePrompt = `${stylePrompts.positive}, ${roomContext}, professional interior photography, high resolution, 8k, detailed, realistic lighting${customPrompt ? `, ${customPrompt}` : ''}`;
  
  const negativePrompt = `${stylePrompts.negative}, blurry, low quality, distorted, unrealistic, cartoon, anime, sketch, painting, watermark, text, logo, ugly, deformed`;

  return {
    positive: positivePrompt,
    negative: negativePrompt,
  };
};

/**
 * Transform image using interior design model
 */
const transformImage = async (imageUrl, options = {}) => {
  const {
    style = 'modern',
    roomType = 'living_room',
    customPrompt = '',
    model = 'INTERIOR_DESIGN',
  } = options;

  const prompts = generatePrompt(style, roomType, customPrompt);
  
  console.log(`🎨 Starting image transformation with style: ${style}`);
  console.log(`📝 Prompt: ${prompts.positive.substring(0, 100)}...`);

  try {
    let output;

    if (model === 'INTERIOR_DESIGN') {
      // Use interior design specific model
      output = await replicate.run(MODELS.INTERIOR_DESIGN, {
        input: {
          image: imageUrl,
          prompt: prompts.positive,
          negative_prompt: prompts.negative,
          num_inference_steps: AI_SETTINGS.INFERENCE_STEPS || 30,
          guidance_scale: AI_SETTINGS.GUIDANCE_SCALE || 7.5,
        },
      });
    } else if (model === 'STABLE_DIFFUSION') {
      // Use SDXL with img2img
      output = await replicate.run(MODELS.STABLE_DIFFUSION, {
        input: {
          image: imageUrl,
          prompt: prompts.positive,
          negative_prompt: prompts.negative,
          num_inference_steps: AI_SETTINGS.INFERENCE_STEPS || 30,
          guidance_scale: AI_SETTINGS.GUIDANCE_SCALE || 7.5,
          prompt_strength: 0.8,
          scheduler: 'K_EULER',
        },
      });
    }

    // Output could be a URL string or array of URLs
    const resultUrl = Array.isArray(output) ? output[0] : output;

    console.log(`✅ Image transformation completed`);

    return {
      success: true,
      url: resultUrl,
      prompts,
      model: MODELS[model],
    };
  } catch (error) {
    console.error('❌ Replicate API error:', error.message);
    throw new Error(`Image transformation failed: ${error.message}`);
  }
};

/**
 * Create prediction (async - returns prediction ID for polling)
 */
const createPrediction = async (imageUrl, options = {}) => {
  const {
    style = 'modern',
    roomType = 'living_room',
    customPrompt = '',
    webhookUrl = null,
  } = options;

  const prompts = generatePrompt(style, roomType, customPrompt);

  const prediction = await replicate.predictions.create({
    version: MODELS.INTERIOR_DESIGN.split(':')[1],
    input: {
      image: imageUrl,
      prompt: prompts.positive,
      negative_prompt: prompts.negative,
      num_inference_steps: AI_SETTINGS.INFERENCE_STEPS || 30,
      guidance_scale: AI_SETTINGS.GUIDANCE_SCALE || 7.5,
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  });

  return {
    id: prediction.id,
    status: prediction.status,
    prompts,
  };
};

/**
 * Get prediction status
 */
const getPrediction = async (predictionId) => {
  const prediction = await replicate.predictions.get(predictionId);
  
  return {
    id: prediction.id,
    status: prediction.status,
    output: prediction.output,
    error: prediction.error,
    metrics: prediction.metrics,
  };
};

/**
 * Cancel prediction
 */
const cancelPrediction = async (predictionId) => {
  await replicate.predictions.cancel(predictionId);
  return true;
};

/**
 * List available styles with their prompts
 */
const getAvailableStyles = () => {
  return DESIGN_STYLES.map(style => ({
    ...style,
    prompts: STYLE_PROMPTS[style.id] || STYLE_PROMPTS.modern,
  }));
};

module.exports = {
  replicate,
  MODELS,
  STYLE_PROMPTS,
  generatePrompt,
  transformImage,
  createPrediction,
  getPrediction,
  cancelPrediction,
  getAvailableStyles,
};

