# @eottabom/tokenizer-core

오프라인 환경에서 LLM 3사(OpenAI, Anthropic, Google)의 토큰 수를 계산하는 순수 JavaScript 토크나이저입니다.

API 키 없이, 외부 의존성 없이, 로컬에서 바로 동작합니다.

## 특징

- **의존성 제로**: tiktoken WASM, HuggingFace transformers 등 무거운 라이브러리 없이 순수 JS로 BPE 알고리즘을 직접 구현
- **오프라인 동작**: 토크나이저 데이터(vocab, merges)를 프로젝트에 내장
- **3사 통합**: OpenAI(tiktoken), Anthropic(Claude), Google(Gemma3) 토크나이저를 하나의 인터페이스로 제공

## 정확도

| Provider | 토크나이저 출처 | 정확도 |
|---|---|---|
| OpenAI | tiktoken 공식 인코딩 데이터 포팅 | 공식 tiktoken과 동일 |
| Anthropic | Xenova/claude-tokenizer 데이터 | 근사치 (~10% 오차 가능) |
| Google | unsloth/gemma-3-1b-it 데이터 | Gemma3 토크나이저와 동일 |

> Anthropic은 공식 오프라인 토크나이저를 공개하지 않아, 공개된 토크나이저 데이터 기반의 근사치입니다.

## CLI 사용법

```bash
# 워크스페이스 루트에서 설치
npm install

# 텍스트 직접 입력
npx tokenizer-core -t "Hello, world! 안녕하세요."

# 파일에서 읽기
npx tokenizer-core -f ./document.txt

# 특정 프로바이더만 출력
npx tokenizer-core -t "텍스트" -p openai
npx tokenizer-core -t "텍스트" -p anthropic
npx tokenizer-core -t "텍스트" -p google
```

### 옵션

| 옵션 | 설명 | 기본값 |
|---|---|---|
| `-t, --text <string>` | 토큰을 계산할 텍스트 (`-t` 또는 `-f` 중 하나 필수) | - |
| `-f, --file <path>` | 토큰을 계산할 파일 경로 (UTF-8) (`-t` 또는 `-f` 중 하나 필수) | - |
| `-p, --provider <type>` | (선택) 필터링 (`all`, `openai`, `anthropic`, `google`) | `all` |

### 출력 예시

```
==================================================
입력된 텍스트 길이: 1,882 글자
==================================================

[ OpenAI ]
▶ GPT-4.1, o3, o4-mini, GPT-4o (o200k_base)  : 812 Tokens
▶ GPT-4-turbo, GPT-4, GPT-3.5 (cl100k_base) : 995 Tokens
▶ Codex, text-davinci (p50k_base)            : 1,857 Tokens

[ Anthropic ]
▶ Claude 4.6 ~ 3 Family                      : ~1,095 Tokens (근사치)

[ Google ]
▶ Gemini 2.5 ~ 1.5, Gemma (Gemma3)           : 842 Tokens

※ Anthropic은 공식 오프라인 토크나이저가 없어 근사치입니다 (~10% 오차 가능)
==================================================
```

## 라이브러리로 사용

```javascript
import { countTokens, providers } from '@eottabom/tokenizer-core';

// 개별 프로바이더 토큰 수 계산
const count = countTokens("Hello, world!", "openai_o200k");

// 사용 가능한 프로바이더 목록
// ["openai_o200k", "openai_cl100k", "openai_p50k", "anthropic", "google"]
console.log(providers);
```

### 프로바이더 ID

| ID | 대상 모델 |
|---|---|
| `openai_o200k` | GPT-4.1, o3, o4-mini, GPT-4o |
| `openai_cl100k` | GPT-4-turbo, GPT-4, GPT-3.5 |
| `openai_p50k` | Codex, text-davinci |
| `anthropic` | Claude 4.6 ~ 3 전 계열 |
| `google` | Gemini 2.5 ~ 1.5, Gemma |

## 구조

```
packages/tokenizer-core/
├── cli.js          ← CLI 진입점
├── index.js        ← 통합 API (countTokens)
├── bpe.js          ← BPE 알고리즘 (rank 기반 + merge 목록 기반)
├── tiktoken.js     ← OpenAI tiktoken 포맷 처리
├── hf-bpe.js       ← HuggingFace tokenizer.json 포맷 처리
└── data/
    ├── o200k_base.json   (2.2MB)
    ├── cl100k_base.json  (1.0MB)
    ├── p50k_base.json    (0.5MB)
    ├── claude.json       (1.7MB)
    └── gemma3.json       (14MB)
```

## 토크나이저 데이터 출처

- **OpenAI**: [tiktoken](https://github.com/openai/tiktoken) 인코딩 데이터
- **Anthropic**: [Xenova/claude-tokenizer](https://huggingface.co/Xenova/claude-tokenizer) (HuggingFace)
- **Google**: [unsloth/gemma-3-1b-it](https://huggingface.co/unsloth/gemma-3-1b-it) (HuggingFace)
