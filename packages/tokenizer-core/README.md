# @eottabom/tokenizer-core

OpenAI, Anthropic, Google 계열 모델의 토큰 수를 오프라인에서 계산하는 패키지입니다.

## 설치

```bash
npm install @eottabom/tokenizer-core
```

## 사용 예시

```bash
npx tokenizer-core -t "Hello, world!"
```

```bash
npm install -g @eottabom/tokenizer-core
tokenizer-core -t "Hello, world!"
```

```js
import { countTokens } from '@eottabom/tokenizer-core';

const count = countTokens('Hello, world!', 'openai_o200k');
```

### 옵션

| 옵션 | 설명 | 기본값 |
|---|---|---|
| `-t, --text <string>` | 토큰을 계산할 텍스트 (`-t` 또는 `-f` 중 하나 필수) | - |
| `-f, --file <path>` | 토큰을 계산할 파일 경로 (UTF-8) (`-t` 또는 `-f` 중 하나 필수) | - |
| `-p, --provider <type>` | (선택) 필터링 (`all`, `openai`, `anthropic`, `google`) | `all` |

### 프로바이더 ID

| ID | 대상 모델 |
|---|---|
| `openai_o200k` | GPT-4.1, o3, o4-mini, GPT-4o |
| `openai_cl100k` | GPT-4-turbo, GPT-4, GPT-3.5 |
| `openai_p50k` | Codex, text-davinci |
| `anthropic` | Claude 4.6 ~ 3 전 계열 |
| `google` | Gemini 2.5 ~ 1.5, Gemma |

Anthropic 토큰 수는 공개 토크나이저 데이터 기반의 근사치입니다.
