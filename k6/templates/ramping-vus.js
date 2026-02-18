import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    default: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 10 },
        { duration: '20s', target: 20 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://test.k6.io');

  check(res, {
    'status is 200': (res) => res.status === 200,
  });
}
