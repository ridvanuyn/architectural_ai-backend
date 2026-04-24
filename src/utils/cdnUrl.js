/**
 * CDN / S3 URL helper
 *
 * Listelerde CloudFront üzerinden thumbnail, detay/download'da orijinal S3
 * objesine erişim için URL üretir. CDN_ENABLED=false iken saf S3 URL'leri
 * döner → feature flag ile sıfır-risk rollback.
 */

const useCdn = () =>
  process.env.CDN_ENABLED === 'true' && !!process.env.CDN_BASE_URL;

const cdnBase = () => process.env.CDN_BASE_URL.replace(/\/+$/, '');

const s3Base = (bucketName) =>
  `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`;

const bucketFor = (bucket) =>
  bucket === 'thumbnails'
    ? process.env.AWS_S3_BUCKET_THUMBNAILS || 'architectural-ai-thumbnails'
    : process.env.AWS_S3_BUCKET;

/**
 * Bir S3 objesinin halka açık URL'ini döner (CDN varsa CDN, yoksa S3).
 * @param {string} key  S3 objesinin key'i (örn. "generated/<userId>/<uuid>.jpg")
 * @param {{bucket?: 'images'|'thumbnails', version?: number|string}} opts
 */
function cdnUrl(key, opts = {}) {
  const { bucket = 'images', version } = opts;
  const bucketName = bucketFor(bucket);
  const base = useCdn() ? cdnBase() : s3Base(bucketName);
  const v = version != null ? `?v=${version}` : '';
  return `${base}/${key}${v}`;
}

/**
 * SpecialtyWorld thumbnail URL'i — 3 pre-generated boyuttan birini seçer.
 * @param {string} id  world id
 * @param {number} size  256 | 512 | 1024
 * @param {number|string} version  cache-busting için imageVersion
 */
function thumbnailUrl(id, size = 512, version) {
  return cdnUrl(`thumbnails/${id}/${size}.jpg`, {
    bucket: 'thumbnails',
    version,
  });
}

/**
 * Legacy tek-boyut thumbnail URL'i (eski script'in ürettiği <id>.jpg).
 * Migration öncesi kayıtlar için fallback.
 */
function legacyThumbnailUrl(id) {
  return cdnUrl(`thumbnails/${id}.jpg`, { bucket: 'thumbnails' });
}

/**
 * Bir S3 objesinin doğrudan S3 URL'i — signed URL üretirken origin olarak
 * kullanılır. CDN flag'ini umursamaz.
 */
function rawS3Url(key, bucket = 'images') {
  return `${s3Base(bucketFor(bucket))}/${key}`;
}

module.exports = {
  useCdn,
  cdnUrl,
  thumbnailUrl,
  legacyThumbnailUrl,
  rawS3Url,
};
