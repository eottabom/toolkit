# @eottabom/diff-engine

라인 단위와 단어 단위 diff를 계산하는 유틸리티입니다.

## 설치

```bash
npm install @eottabom/diff-engine
```

## 사용 예시

```ts
import { DiffEngine } from '@eottabom/diff-engine';

const engine = new DiffEngine('hello\nworld', 'hello\ncodex');
const lineDiff = engine.buildLineDiff();
const wordDiff = DiffEngine.buildWordDiff('hello world', 'hello codex');
```
