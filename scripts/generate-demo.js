/**
 * Generate demo before/after images for onboarding "Try It Yourself"
 * Uses fal.ai nano-banana/edit to transform an original room photo
 * into 5 different styles, uploads to S3.
 */
require('dotenv').config();
const { fal } = require('@fal-ai/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const http = require('http');

const BUCKET = 'architectural-ai-demo';
const REGION = process.env.AWS_REGION || 'eu-central-1';
const ORIGINAL_URL = `https://${BUCKET}.s3.${REGION}.amazonaws.com/demo/original.jpg`;

// fal.ai setup
const falKey = (process.env.FAL_API_KEYS || '').split(',')[0].trim();
fal.config({ credentials: falKey });

// S3 setup
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 5 demo styles
const styles = [
  {
    id: 'japandi',
    name: 'Japandi',
    prompt: 'Redesign this room in Japandi style — a harmonious blend of Japanese minimalism and Scandinavian warmth. Light oak wood floors, low-profile furniture with clean lines, neutral color palette of cream and soft grey, shoji-inspired screens, indoor plants, natural linen textiles, and warm ambient lighting. Photorealistic interior photograph.',
  },
  {
    id: 'gryffindor',
    name: 'Harry Potter Gryffindor',
    prompt: 'Transform this room into the Gryffindor common room from Hogwarts. Rich scarlet and gold tapestries, plush velvet armchairs by a roaring stone fireplace, magical portraits on walls, warm Persian rugs on stone floors, leaded glass windows, floating candles, and cozy reading nooks with ancient books. Photorealistic interior.',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    prompt: 'Transform this room into a Cyberpunk Night City apartment. Neon LED strips in cyan and magenta, holographic window displays showing a rainy neon skyline, dark surfaces with chrome accents, modular smart furniture, exposed tech panels, floating screens, and atmospheric fog. Photorealistic cyberpunk interior.',
  },
  {
    id: 'minecraft',
    name: 'Minecraft',
    prompt: 'Transform this room into a Minecraft-style interior with blocky pixelated textures on all surfaces. Stone brick walls, oak wood plank floors, torches mounted on walls for lighting, a crafting table in the corner, bookshelves, chest storage blocks, and a window showing a pixelated landscape. Photorealistic Minecraft aesthetic.',
  },
  {
    id: 'anime',
    name: 'Anime Style',
    prompt: 'Transform this room into a Studio Ghibli anime-inspired living space. Warm sunset light streaming through large windows, hand-painted texture on walls, cozy cluttered detail with books and plants, soft watercolor color palette, vintage furniture with character, cat sleeping on a cushion, and a magical whimsical atmosphere. Photorealistic anime aesthetic.',
  },
];

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function generateStyle(style) {
  console.log(`🎨 [${style.name}] Generating...`);

  // Upload original to fal storage first
  const origBuffer = await downloadImage(ORIGINAL_URL);
  const falUrl = await fal.storage.upload(new Blob([origBuffer], { type: 'image/jpeg' }));

  // Generate with nano-banana/edit
  const result = await fal.subscribe('fal-ai/nano-banana/edit', {
    input: {
      prompt: style.prompt,
      image_urls: [falUrl],
      num_images: 1,
      output_format: 'jpeg',
    },
    logs: false,
  });

  const data = result?.data || result;
  const imageUrl = data?.images?.[0]?.url;
  if (!imageUrl) throw new Error('No image returned');

  console.log(`📥 [${style.name}] Downloading result...`);
  const buffer = await downloadImage(imageUrl);

  // Upload to S3
  const key = `demo/${style.id}.jpg`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: buffer, ContentType: 'image/jpeg',
  }));

  const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  console.log(`✅ [${style.name}] → ${s3Url}`);
  return { id: style.id, name: style.name, url: s3Url };
}

async function main() {
  console.log(`🖼️  Original: ${ORIGINAL_URL}\n`);

  // Generate all 5 in parallel (2 at a time to avoid rate limits)
  const results = [];
  for (let i = 0; i < styles.length; i += 2) {
    const batch = styles.slice(i, i + 2);
    const batchResults = await Promise.all(batch.map(s => generateStyle(s).catch(e => {
      console.error(`❌ [${s.name}] Failed: ${e.message}`);
      return null;
    })));
    results.push(...batchResults.filter(Boolean));
  }

  console.log(`\n📊 Generated ${results.length}/${styles.length} demo images`);
  console.log('\nURLs for Flutter:');
  console.log(`  original: '${ORIGINAL_URL}',`);
  results.forEach(r => console.log(`  ${r.id}: '${r.url}',`));
}

main().catch(e => { console.error(e); process.exit(1); });
