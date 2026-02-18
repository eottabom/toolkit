import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    default: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const payload = '{"key":"value"}';

  const res = http.post('https://test.k6.io', payload, params);

  check(res, {
    'status is 200': (res) => res.status === 200,
  });
}
