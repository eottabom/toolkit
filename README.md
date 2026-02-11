# Toolkit

Next.js 기반으로 만드는 유용한 도구 모음

## 실행

```bash
npm install
npm run dev
```

> http://localhost:3000 열기

## 페이지 추가 (간단)

1. `src/tools/<slug>.tsx`에 컴포넌트 추가

* `src/tools/hello.tsx`

```tsx
export default function HelloTool() {
  return (
    <div className="rounded-3xl border border-black/10 bg-[var(--surface)] p-6">
      Hello Tool
    </div>
  );
}
```

2. `src/tools/index.ts`에서 `<slug>`를 매핑에 연결

* `src/tools/hello.tsx`

```tsx
export default function HelloTool() {
  return (
    <div className="rounded-3xl border border-black/10 bg-[var(--surface)] p-6">
      Hello Tool
    </div>
  );
}
```

3. `src/lib/tools.ts`에 카드용 메타데이터(슬러그/타이틀/설명 등) 추가

* `src/lib/tools.ts`

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
4. 이전 버전 태그 1개만 삭제하고 `v<version>` 태그 생성

### 수동 배포 (tag)
1. GitHub Actions → `Deploy GitHub Pages (Tag)` 실행
2. `tag` 입력 (예: `v1.0.3`)
3. 해당 태그 기준으로 build/deploy 진행
