# @eottabom/datetime-utils

타임존 변환, UTC 입력 처리, Unix timestamp 계산을 위한 유틸리티입니다.

## 설치

```bash
npm install @eottabom/datetime-utils
```

## 사용 예시

```ts
import {
    formatDateTime,
    getDatePartsInZone,
    toUtcDateFromZonedInput,
} from '@eottabom/datetime-utils';

const utcDate = toUtcDateFromZonedInput('2026-04-01T09:00:00', 'Asia/Seoul');
const parts = getDatePartsInZone(utcDate ?? new Date(), 'UTC');
const formatted = formatDateTime(parts);
```
