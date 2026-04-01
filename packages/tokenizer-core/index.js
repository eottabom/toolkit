/**
 * index.js - 통합 토크나이저 API
 *
 * 외부 의존성 없이(commander 제외) OpenAI, Anthropic, Google의
 * 토큰 수를 계산하는 통합 인터페이스입니다.
 *
 * 사용법:
 *   import { countTokens } from './index.js';
 *   const count = countTokens("Hello world", "openai_o200k");
 *
 * 지원 프로바이더:
 *   - openai_o200k  : GPT-4.1, o3, o4-mini, GPT-4o (최신)
 *   - openai_cl100k : GPT-4-turbo, GPT-4, GPT-3.5-turbo
 *   - openai_p50k   : Codex, text-davinci (레거시)
 *   - anthropic     : Claude 4.6 ~ 3 전 계열
 *   - google        : Gemini 2.5 ~ 1.5, Gemma 전 계열
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { TiktokenTokenizer } from './tiktoken.js';
import { HFTokenizer } from './hf-bpe.js';

// ES Module에서 __dirname 대체
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

/**
 * 토크나이저 인스턴스 캐시
 * 같은 토크나이저를 반복 사용할 때 데이터를 다시 파싱하지 않도록
 * 한 번 생성한 인스턴스를 재사용합니다.
 */
const cache = {};

/** data/ 디렉토리에서 JSON 파일을 읽어 파싱 */
function loadJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8'));
}

/** tiktoken 포맷 토크나이저 싱글턴 로드 (OpenAI용) */
function getTiktoken(encoding) {
  if (!cache[encoding]) {
    cache[encoding] = new TiktokenTokenizer(loadJSON(`${encoding}.json`));
  }
  return cache[encoding];
}

/** HuggingFace 포맷 토크나이저 싱글턴 로드 (Claude, Gemma3용) */
function getHF(name) {
  if (!cache[name]) {
    cache[name] = new HFTokenizer(loadJSON(`${name}.json`));
  }
  return cache[name];
}

/**
 * 텍스트의 토큰 수를 계산합니다.
 *
 * @param {string} text     - 토큰 수를 계산할 텍스트
 * @param {string} provider - 프로바이더 식별자
 * @returns {number} 토큰 수
 * @throws {Error} 알 수 없는 provider일 경우
 */
export function countTokens(text, provider) {
  switch (provider) {
    case 'openai_o200k':
      return getTiktoken('o200k_base').encode(text).length;
    case 'openai_cl100k':
      return getTiktoken('cl100k_base').encode(text).length;
    case 'openai_p50k':
      return getTiktoken('p50k_base').encode(text).length;
    case 'anthropic':
      return getHF('claude').encode(text).length;
    case 'google':
      return getHF('gemma3').encode(text).length;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/** 사용 가능한 프로바이더 목록 */
export const providers = [
  'openai_o200k',
  'openai_cl100k',
  'openai_p50k',
  'anthropic',
  'google',
];
