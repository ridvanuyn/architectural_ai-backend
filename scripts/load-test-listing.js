// Listing endpoint yük testi — prod backend'e hafif yük.
//
// Senaryo:
//   1. smoke   (30 sn, 1 VU)              — endpoint ayakta mı
//   2. baseline (60 sn, 10 VU constant)   — normal trafik
//   3. ramp     (90 sn, 0→20→0 VU)        — burst toleransı
//
// Her endpoint ayrı trend + p95 eşiği ile izlenir.
//
// Kullanım:
//   BASE_URL=https://architectural.puffcounterapp.com k6 run scripts/load-test-listing.js
//   BASE_URL=http://localhost:3001 k6 run scripts/load-test-listing.js
//
// Not: Prod'da agresif VU kullanma — $5 droplet.

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'https://architectural.puffcounterapp.com';

// Endpoint başına trend — response time dağılımı ayrı ayrı görünür.
const trendHealth   = new Trend('t_health',   true);
const trendStyles   = new Trend('t_styles',   true);
const trendWorlds   = new Trend('t_worlds',   true);
const trendWorldsFt = new Trend('t_worlds_featured', true);
const trendPackages = new Trend('t_token_packages', true);

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      startTime: '0s',
      tags: { scenario: 'smoke' },
    },
    baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '60s',
      startTime: '35s',
      tags: { scenario: 'baseline' },
    },
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '30s', target: 20 },
        { duration: '30s', target: 0 },
      ],
      startTime: '100s',
      tags: { scenario: 'ramp' },
    },
  },
  thresholds: {
    'errors':                ['rate<0.02'],        // <%2 hata
    't_health{scenario:baseline}':   ['p(95)<500'],
    't_styles{scenario:baseline}':   ['p(95)<800'],
    't_worlds{scenario:baseline}':   ['p(95)<1500'],
    't_worlds_featured{scenario:baseline}': ['p(95)<1200'],
    't_token_packages{scenario:baseline}':  ['p(95)<800'],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

function measure(name, res, trend) {
  trend.add(res.timings.duration);
  const ok = check(res, {
    [`${name} status 200`]: (r) => r.status === 200,
    [`${name} has body`]: (r) => r.body && r.body.length > 0,
  });
  if (!ok) errorRate.add(1);
  else errorRate.add(0);
}

export default function () {
  group('health', () => {
    const r = http.get(`${BASE}/health`, { tags: { ep: 'health' } });
    measure('health', r, trendHealth);
  });

  group('styles', () => {
    const r = http.get(`${BASE}/api/styles`, { tags: { ep: 'styles' } });
    measure('styles', r, trendStyles);
  });

  group('worlds', () => {
    const r = http.get(`${BASE}/api/worlds`, { tags: { ep: 'worlds' } });
    measure('worlds', r, trendWorlds);
  });

  group('worlds_featured', () => {
    const r = http.get(`${BASE}/api/worlds/featured`, { tags: { ep: 'worlds_featured' } });
    measure('worlds_featured', r, trendWorldsFt);
  });

  group('token_packages', () => {
    const r = http.get(`${BASE}/api/tokens/packages`, { tags: { ep: 'token_packages' } });
    measure('token_packages', r, trendPackages);
  });

  sleep(1); // iteration arası 1 sn → gerçekçi user davranışı
}
