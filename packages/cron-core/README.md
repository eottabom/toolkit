# @eottabom/cron-core

cron 표현식을 만들고 다루는 유틸리티입니다.

## 설치

```bash
npm install @eottabom/cron-core
```

## 사용 예시

```ts
import { buildExpression, makeFields } from '@eottabom/cron-core';

const fields = makeFields('linux', {});
const expression = buildExpression(fields, 'linux');
```
