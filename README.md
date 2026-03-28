# Toolkit

Next.js 기반으로 만드는 유용한 도구 모음

## 실행

```bash
npm install
npm run dev
```

> http://localhost:3000 열기

## 패키지

개별 툴 로직은 앱 UI와 분리하여 `packages/` 아래 워크스페이스 패키지로 관리한다.

- `@eottabom/base64`
- `@eottabom/url`
- `@eottabom/jwt`
- `@eottabom/diff-engine`
- `@eottabom/datetime-utils`
- `@eottabom/cron-core`

앱 화면 컴포넌트는 `src/tools/*.tsx`를 유지하고, 내부 계산 로직만 위 패키지를 import 한다.

```bash
npm run build:packages
```

### npm 사용 방법

외부 사용자는 필요한 패키지만 설치해서 사용할 수 있다.

```bash
npm install @eottabom/base64
npm install @eottabom/url
npm install @eottabom/jwt
npm install @eottabom/diff-engine
npm install @eottabom/datetime-utils
npm install @eottabom/cron-core
```

예시

```ts
import { encodeBase64, decodeBase64 } from "@eottabom/base64";
import { encodeUrlComponent } from "@eottabom/url";
import { decodeJwt, verifyJwt } from "@eottabom/jwt";

const encoded = encodeBase64("hello");
const decoded = decodeBase64(encoded);
const query = encodeUrlComponent("hello world");

const jwt = decodeJwt("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature");
const isValid = await verifyJwt("token", "secret", "HS256");
```

패키지 용도

- `@eottabom/base64` Base64 인코드/디코드
- `@eottabom/url` URL 인코드/디코드
- `@eottabom/jwt` JWT 디코드, HMAC 서명/검증
- `@eottabom/diff-engine` 라인/단어 diff 계산
- `@eottabom/datetime-utils` 타임존, UTC, Unix timestamp 변환
- `@eottabom/cron-core` cron 표현식 생성, 검증, 다음 실행 시간 계산

패키지 버전 갱신

```bash
npm run bump:package -- base64 patch
npm run bump:package -- jwt 1.0.0
```

## 페이지 추가 (간단)

1. `src/tools/<slug>.tsx`에 컴포넌트 추가

- `src/tools/hello.tsx`

```tsx
export default function HelloTool() {
  return <div className="rounded-3xl border border-black/10 bg-[var(--surface)] p-6">Hello Tool</div>;
}
```

2. `src/tools/index.ts`에서 `<slug>`를 매핑에 연결

- `src/tools/hello.tsx`

```tsx
export default function HelloTool() {
  return <div className="rounded-3xl border border-black/10 bg-[var(--surface)] p-6">Hello Tool</div>;
}
```

3. `src/lib/tools.ts`에 카드용 메타데이터(슬러그/타이틀/설명 등) 추가

- `src/lib/tools.ts`

```ts
export const tools = [
  {
    title: "Hello Tool",
    desc: "간단한 예시 툴.",
    tag: "Utility",
    slug: "hello",
    createdAt: "2026-02-11",
  },
];
```

## 배포 워크플로우

### 자동 배포 (main)

1. `main`에 push
2. `build`/`deploy` 성공 후 `version` job이 실행됨
3. 버전 처리 규칙:
   - `version.properties`가 변경되었으면 그 버전을 사용
   - 변경이 없으면 `patch +1` 자동 증가
   - 변경 시 `# updated=...` 헤더를 갱신하고 커밋
4. 이전 버전 태그 1개만 삭제하고 `v<version>` 태그 생성(최대 5개 유지)

### 패키지 배포

1. `packages/<name>` 내부 코드 변경 후 `main`에 push
2. 메인 배포 워크플로우 안에서 `git diff`로 변경된 패키지를 감지
3. npm에 아직 없는 패키지는 변경 여부와 관계없이 함께 publish
4. 변경된 패키지에서 `package.json` 버전이 그대로면 patch 자동 증가 후 커밋
5. 사용자가 직접 major/minor/version을 올렸다면 그 버전을 그대로 사용
6. publish 대상 패키지를 build 후 `npm publish`
7. 패키지 태그는 `<package>-v<version>` 형식 사용

### 수동 배포 (tag)

1. GitHub Actions → `Deploy GitHub Pages (Tag)` 실행
2. `tag` 입력 (예: `v1.0.3`)
3. 해당 태그 기준으로 build/deploy 진행
