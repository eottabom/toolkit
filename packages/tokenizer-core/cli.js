#!/usr/bin/env node

/**
 * cli.js - 오프라인 LLM 3사 모델별 토큰 계산 CLI
 *
 * 사용법:
 *   node cli.js -t "텍스트"          # 직접 텍스트 입력
 *   node cli.js -f ./file.txt        # 파일에서 읽기
 *   node cli.js -t "텍스트" -p openai # 특정 프로바이더만 출력
 *
 * 옵션:
 *   -t, --text <string>   토큰을 계산할 텍스트
 *   -f, --file <path>     토큰을 계산할 파일 경로 (UTF-8)
 *   -p, --provider <type> 필터링 (all | openai | anthropic | google)
 */

import { program } from 'commander';
import fs from 'fs';
import { countTokens } from './index.js';

// CLI 옵션 정의
program
  .name('tokenizer-core')
  .description('오프라인 LLM 3사 모델별 토큰 계산 CLI (의존성 제로)')
  .option('-t, --text <string>', '토큰을 계산할 직접 텍스트 입력')
  .option('-f, --file <path>', '토큰을 계산할 텍스트 파일 경로 (UTF-8)')
  .option('-p, --provider <type>', '특정 제공자 필터링 (all, openai, anthropic, google)', 'all')
  .parse();

const opts = program.opts();

// ── 입력 검증 ──────────────────────────────────────────────

if (!opts.text && !opts.file) {
  console.error('오류: -t (텍스트) 또는 -f (파일) 옵션 중 하나를 반드시 제공해야 합니다.');
  process.exit(1);
}

const validProviders = ['all', 'openai', 'anthropic', 'google'];
if (!validProviders.includes(opts.provider)) {
  console.error(`오류: --provider 값은 ${validProviders.join(', ')} 중 하나여야 합니다.`);
  process.exit(1);
}

// ── 텍스트 로드 ────────────────────────────────────────────

let text;
if (opts.file) {
  if (!fs.existsSync(opts.file)) {
    console.error(`오류: 파일을 찾을 수 없습니다: ${opts.file}`);
    process.exit(1);
  }
  text = fs.readFileSync(opts.file, 'utf-8');
} else {
  text = opts.text;
}

// ── 숫자 포맷팅 (천단위 콤마) ──────────────────────────────

function fmt(n) {
  return n.toLocaleString('ko-KR');
}

// ── 결과 출력 ──────────────────────────────────────────────

const separator = '='.repeat(50);
const provider = opts.provider;

console.log(separator);
console.log(`입력된 텍스트 길이: ${fmt(text.length)} 글자`);
console.log(separator);

// [ OpenAI ] - 인코딩별로 대응하는 모델 그룹이 다름
if (provider === 'all' || provider === 'openai') {
  console.log('');
  console.log('[ OpenAI ]');
  console.log(`▶ GPT-4.1, o3, o4-mini, GPT-4o (o200k_base)  : ${fmt(countTokens(text, 'openai_o200k'))} Tokens`);
  console.log(`▶ GPT-4-turbo, GPT-4, GPT-3.5 (cl100k_base) : ${fmt(countTokens(text, 'openai_cl100k'))} Tokens`);
  console.log(`▶ Codex, text-davinci (p50k_base)            : ${fmt(countTokens(text, 'openai_p50k'))} Tokens`);
}

// [ Anthropic ] - Claude 3 이후 전 계열 공통 토크나이저
// 공식 오프라인 토크나이저가 없어 근사치 (실제 API 대비 ~10% 오차 가능)
if (provider === 'all' || provider === 'anthropic') {
  console.log('');
  console.log('[ Anthropic ]');
  console.log(`▶ Claude 4.6 ~ 3 Family                      : ~${fmt(countTokens(text, 'anthropic'))} Tokens (근사치)`);
}

// [ Google ] - Gemini/Gemma 전 계열 공통 (Gemma3 토크나이저 기반)
if (provider === 'all' || provider === 'google') {
  console.log('');
  console.log('[ Google ]');
  console.log(`▶ Gemini 2.5 ~ 1.5, Gemma (Gemma3)           : ${fmt(countTokens(text, 'google'))} Tokens`);
}

console.log('');
console.log('※ Anthropic은 공식 오프라인 토크나이저가 없어 근사치입니다 (~10% 오차 가능)');
console.log(separator);
