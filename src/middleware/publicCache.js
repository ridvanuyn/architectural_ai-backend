/**
 * Response'a public Cache-Control header'ı ekler. Client (mobile app,
 * browser) ve ileride CDN edge bu süre boyunca tekrar backend'e gelmez.
 * Yalnızca auth gerektirmeyen, kullanıcıdan bağımsız GET endpoint'lerde kullan.
 */
module.exports = function publicCache(maxAgeSec = 300) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();
    res.set(
      'Cache-Control',
      `public, max-age=${maxAgeSec}, s-maxage=${maxAgeSec * 2}, stale-while-revalidate=60`,
    );
    next();
  };
};
