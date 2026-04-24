/**
 * AWS S3 Service
 * 
 * Görsel yükleme, indirme ve silme işlemleri için S3 servisi.
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { IMAGE_SETTINGS } = require('../config/constants');
const { cdnUrl, rawS3Url } = require('../utils/cdnUrl');

// S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const THUMBNAIL_BUCKET = process.env.AWS_S3_BUCKET_THUMBNAILS || 'architectural-ai-thumbnails';
const DEFAULT_SIGNED_URL_TTL = parseInt(process.env.SIGNED_URL_TTL_SECONDS, 10) || 120;

/**
 * Görsel yüklemeden önce optimize et
 */
const optimizeImage = async (buffer, options = {}) => {
  const {
    maxWidth = IMAGE_SETTINGS.MAX_DIMENSION,
    maxHeight = IMAGE_SETTINGS.MAX_DIMENSION,
    quality = IMAGE_SETTINGS.OUTPUT_QUALITY,
    format = IMAGE_SETTINGS.OUTPUT_FORMAT,
  } = options;

  let sharpInstance = sharp(buffer).rotate(); // Auto-rotate based on EXIF orientation

  // Get metadata
  const metadata = await sharpInstance.metadata();
  
  // Resize if needed
  if (metadata.width > maxWidth || metadata.height > maxHeight) {
    sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Convert to specified format
  if (format === 'jpeg' || format === 'jpg') {
    sharpInstance = sharpInstance.jpeg({ quality });
  } else if (format === 'png') {
    sharpInstance = sharpInstance.png({ quality });
  } else if (format === 'webp') {
    sharpInstance = sharpInstance.webp({ quality });
  }

  const optimizedBuffer = await sharpInstance.toBuffer();
  const newMetadata = await sharp(optimizedBuffer).metadata();

  return {
    buffer: optimizedBuffer,
    width: newMetadata.width,
    height: newMetadata.height,
    size: optimizedBuffer.length,
    format: newMetadata.format,
  };
};

/**
 * Görsel yükle
 */
const uploadImage = async (buffer, options = {}) => {
  const {
    folder = 'uploads',
    userId,
    filename,
    contentType = 'image/jpeg',
    optimize = true,
    thumbnailId, // set → generateThumbnailVariants aynı buffer üzerinden tetiklenir
  } = options;

  let imageData = { buffer, size: buffer.length };

  // Optimize image if requested
  if (optimize) {
    imageData = await optimizeImage(buffer);
  }

  // Generate unique key
  const ext = contentType.split('/')[1] || 'jpg';
  const key = `${folder}/${userId}/${uuidv4()}.${ext}`;

  // Upload to S3
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: imageData.buffer,
    ContentType: contentType,
    CacheControl: 'max-age=31536000', // 1 year cache
    Metadata: {
      userId: userId || 'anonymous',
      originalFilename: filename || 'unknown',
      uploadedAt: new Date().toISOString(),
    },
  });

  await s3Client.send(command);

  // url: CDN veya S3 (feature flag). rawS3Url: her zaman direkt S3 — signed
  // URL üretimi, silme, migration script'leri gibi işlemler bunu kullanmalı.
  const url = cdnUrl(key, { bucket: 'images' });
  const raw = rawS3Url(key, 'images');

  // Thumbnail varyantları — main upload başarılıysa fail-safe olarak üretilir.
  // Hata olursa upload iptal edilmez, sadece thumbnail alanı boş kalır.
  let thumbnails = null;
  if (thumbnailId) {
    try {
      thumbnails = await generateThumbnailVariants(imageData.buffer, thumbnailId);
    } catch (err) {
      console.warn(`⚠️ [s3Service] thumbnail variants failed for ${thumbnailId}: ${err.message}`);
    }
  }

  return {
    url,
    rawS3Url: raw,
    key,
    bucket: BUCKET_NAME,
    size: imageData.size,
    width: imageData.width,
    height: imageData.height,
    contentType,
    thumbnails,
    thumbnailUrl: thumbnails ? thumbnails.find((t) => t.size === 512)?.url : null,
  };
};

/**
 * Tek buffer'dan birden fazla boyutta thumbnail üretip S3 thumbnail bucket'ına
 * yükler. Pre-generated thumbnail stratejisi — Lambda@Edge veya on-the-fly
 * resize yok. Anahtar şablonu: thumbnails/<id>/<size>.jpg
 *
 * @param {Buffer} buffer  orijinal görsel
 * @param {string} id  hedef id (örn. design uuid veya world id)
 * @param {{sizes?: number[], quality?: number}} opts
 * @returns {Promise<{size:number, key:string, url:string, bytes:number}[]>}
 */
const generateThumbnailVariants = async (buffer, id, opts = {}) => {
  const { sizes = [256, 512, 1024], quality = 82 } = opts;

  const uploads = sizes.map(async (size) => {
    const resized = await sharp(buffer)
      .rotate()
      .resize(size, size, { fit: 'cover', withoutEnlargement: false })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    const key = `thumbnails/${id}/${size}.jpg`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: THUMBNAIL_BUCKET,
        Key: key,
        Body: resized,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      size,
      key,
      url: cdnUrl(key, { bucket: 'thumbnails' }),
      bytes: resized.length,
    };
  });

  return Promise.all(uploads);
};

/**
 * URL'den görsel indir ve S3'e yükle
 */
const uploadFromUrl = async (imageUrl, options = {}) => {
  const { folder = 'generated', userId, thumbnailId } = options;

  // Fetch image from URL
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  return uploadImage(buffer, {
    folder,
    userId,
    contentType,
    optimize: true,
    thumbnailId,
  });
};

/**
 * Signed URL oluştur (download için — detay/high-res akışı).
 * TTL env'den okunur (SIGNED_URL_TTL_SECONDS, default 120s).
 */
const getSignedDownloadUrl = async (key, expiresIn) => {
  const ttl = expiresIn || DEFAULT_SIGNED_URL_TTL;
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: ttl });
};

/**
 * Signed upload URL oluştur (client-side upload için)
 */
const getSignedUploadUrl = async (options = {}) => {
  const {
    folder = 'uploads',
    userId,
    contentType = 'image/jpeg',
    expiresIn = 300, // 5 minutes
  } = options;

  const ext = contentType.split('/')[1] || 'jpg';
  const key = `${folder}/${userId}/${uuidv4()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return {
    uploadUrl: signedUrl,
    key,
    publicUrl: cdnUrl(key, { bucket: 'images' }),
    rawS3Url: rawS3Url(key, 'images'),
    expiresIn,
  };
};

/**
 * Görsel sil
 */
const deleteImage = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
  return true;
};

/**
 * Birden fazla görsel sil
 */
const deleteImages = async (keys) => {
  const results = await Promise.allSettled(
    keys.map(key => deleteImage(key))
  );
  
  return results.map((result, index) => ({
    key: keys[index],
    success: result.status === 'fulfilled',
    error: result.status === 'rejected' ? result.reason.message : null,
  }));
};

module.exports = {
  s3Client,
  optimizeImage,
  uploadImage,
  uploadFromUrl,
  generateThumbnailVariants,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  deleteImage,
  deleteImages,
};

