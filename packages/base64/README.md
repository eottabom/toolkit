# @eottabom/base64

UTF-8 문자열을 안전하게 Base64로 인코드하고 디코드하는 유틸리티입니다.

## 설치

```bash
npm install @eottabom/base64
```

## 사용법

```ts
import { decodeBase64, encodeBase64 } from '@eottabom/base64';

const encoded = encodeBase64('안녕하세요');
const decoded = decodeBase64(encoded);
```
