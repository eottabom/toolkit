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
