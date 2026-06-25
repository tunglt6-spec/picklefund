/**
 * PickleFund v2.0 — k6 Load Test
 *
 * Usage:
 *   k6 run load-test/k6-script.js
 *   k6 run --env BASE_URL=https://api.yourdomain.com load-test/k6-script.js
 *
 * Acceptance criteria:
 *   - p95 response time < 2000ms
 *   - Error rate < 5%
 *   - Throughput: sustain 50 VU for 1 minute
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
const USERNAME  = __ENV.TEST_USERNAME  || 'admin';
const PASSWORD  = __ENV.TEST_PASSWORD  || 'changeme123';

// ─── Custom metrics ───────────────────────────────────────────────────────────

const errorRate    = new Rate('errors');
const authDuration = new Trend('auth_duration_ms', true);
const apiDuration  = new Trend('api_duration_ms', true);

// ─── Scenarios ───────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    // Ramp up to 50 VU, sustain 1 min, ramp down
    load_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 20 },   // warm up
        { duration: '1m',  target: 50 },   // sustain peak
        { duration: '20s', target: 0 },    // ramp down
      ],
    },
  },
  thresholds: {
    // Acceptance criteria from SDD Chapter 8
    http_req_duration: ['p(95)<2000'],     // p95 < 2s
    errors:            ['rate<0.05'],      // error rate < 5%
    auth_duration_ms:  ['p(95)<1000'],     // login p95 < 1s
    api_duration_ms:   ['p(95)<500'],      // data endpoints p95 < 500ms
  },
};

// ─── Setup: get access token ──────────────────────────────────────────────────

export function setup() {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'login 200': (r) => r.status === 200 });

  const body = JSON.parse(res.body);
  const token = body?.data?.accessToken;
  if (!token) {
    console.error(`Login failed: ${res.body}`);
    return { token: null };
  }
  return { token };
}

// ─── Main scenario ────────────────────────────────────────────────────────────

export default function (data) {
  const { token } = data;
  if (!token) return;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 1. Login (simulates concurrent auth load)
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  authDuration.add(Date.now() - loginStart);
  const loginOk = check(loginRes, { 'login ok': (r) => r.status === 200 });
  errorRate.add(!loginOk);

  sleep(0.5);

  // 2. GET /members — list members (most frequent read)
  const t1 = Date.now();
  const membersRes = http.get(`${BASE_URL}/members`, { headers });
  apiDuration.add(Date.now() - t1);
  const membersOk = check(membersRes, {
    'members 200': (r) => r.status === 200,
    'members has data': (r) => {
      try { return Array.isArray(JSON.parse(r.body)?.data); } catch { return false; }
    },
  });
  errorRate.add(!membersOk);

  sleep(0.3);

  // 3. GET /fund-periods — list periods
  const t2 = Date.now();
  const periodsRes = http.get(`${BASE_URL}/fund-periods`, { headers });
  apiDuration.add(Date.now() - t2);
  const periodsOk = check(periodsRes, { 'periods 200': (r) => r.status === 200 });
  errorRate.add(!periodsOk);

  sleep(0.3);

  // 4. GET /attendance — attendance sessions
  const t3 = Date.now();
  const attRes = http.get(`${BASE_URL}/attendance`, { headers });
  apiDuration.add(Date.now() - t3);
  const attOk = check(attRes, { 'attendance 200': (r) => r.status === 200 });
  errorRate.add(!attOk);

  sleep(0.3);

  // 5. GET /billing/subscription — billing info
  const t4 = Date.now();
  const billingRes = http.get(`${BASE_URL}/billing/subscription`, { headers });
  apiDuration.add(Date.now() - t4);
  const billingOk = check(billingRes, { 'billing 200': (r) => r.status === 200 });
  errorRate.add(!billingOk);

  sleep(1);
}

// ─── Teardown: summary ────────────────────────────────────────────────────────

export function teardown(data) {
  if (data?.token) {
    http.post(
      `${BASE_URL}/auth/logout`,
      JSON.stringify({ refreshToken: 'n/a' }),
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` } },
    );
  }
}
