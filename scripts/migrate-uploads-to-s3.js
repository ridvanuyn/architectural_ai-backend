require('dotenv').config();
const mongoose = require('mongoose');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const Design = require('../src/models/Design');

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION;
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'));

  console.log(`Found ${files.length} local files to migrate\n`);

  // Upload each file to S3
  const urlMap = {};
  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    const buffer = fs.readFileSync(filePath);
    const key = `uploads/${file}`;

    const ext = path.extname(file).toLowerCase();
    const contentTypeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
    const contentType = contentTypeMap[ext] || 'image/jpeg';

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType,
    }));

    const s3Url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    urlMap[file] = s3Url;
    console.log(`  Uploaded: ${file} -> ${s3Url}`);
  }

  // Update Design documents
  const designs = await Design.find({
    $or: [
      { 'originalImage.url': { $regex: /localhost/ } },
      { 'generatedImage.url': { $regex: /localhost/ } },
    ]
  });

  console.log(`\nFound ${designs.length} designs with localhost URLs`);

  let updated = 0;
  for (const design of designs) {
    let changed = false;

    if (design.originalImage?.url?.includes('localhost')) {
      const filename = design.originalImage.url.split('/').pop();
      if (urlMap[filename]) {
        design.originalImage.url = urlMap[filename];
        design.originalImage.key = `uploads/${filename}`;
        changed = true;
      }
    }

    // generatedImage URLs from fal.ai are already remote - leave them
    // Only fix if they point to localhost
    if (design.generatedImage?.url?.includes('localhost')) {
      const filename = design.generatedImage.url.split('/').pop();
      if (urlMap[filename]) {
        design.generatedImage.url = urlMap[filename];
        design.generatedImage.key = `uploads/${filename}`;
        changed = true;
      }
    }

    if (changed) {
      await design.save();
      updated++;
    }
  }

  console.log(`Updated ${updated} design records`);
  console.log('\nMigration complete! You can now delete the uploads/ directory if desired.');

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
