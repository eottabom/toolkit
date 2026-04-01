# @eottabom/url

URL query/path 값을 인코드하고 디코드하는 유틸리티입니다.

## 설치

```bash
npm install @eottabom/url
```

## 사용 예시

```ts
import {
    decodeUrlComponent,
    encodeUrlComponent,
    tryDecodeUrlComponent,
} from '@eottabom/url';

const encoded = encodeUrlComponent('hello world');
const decoded = decodeUrlComponent(encoded);
const result = tryDecodeUrlComponent('%E3%81');
```
