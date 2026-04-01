# @eottabom/jwt

JWT 디코드, 인코드, HMAC 서명 검증을 위한 유틸리티입니다.

## 설치

```bash
npm install @eottabom/jwt
```

## 사용 예시

```ts
import { decodeJwt, encodeJwt, verifyJwt } from '@eottabom/jwt';

const token = await encodeJwt('{"alg":"HS256","typ":"JWT"}', '{"sub":"123"}', 'secret', 'HS256');
const decoded = decodeJwt(token);
const isValid = await verifyJwt(token, 'secret', 'HS256');
```
