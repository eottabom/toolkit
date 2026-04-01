/**
 * hf-bpe.js - HuggingFace tokenizer.json 포맷 토크나이저
 *
 * HuggingFace의 tokenizer.json은 다음 파이프라인으로 동작합니다:
 * 1. Normalizer  - 텍스트 정규화 (예: NFKC, 공백→▁ 치환)
 * 2. PreTokenizer - 텍스트를 단어/청크로 분리
 * 3. Model (BPE) - merge 목록 기반 BPE로 토큰화
 * 4. PostProcessor - BOS/EOS 등 특수 토큰 추가
 *
 * 이 파일은 Claude(ByteLevel BPE)와 Gemma3(SentencePiece BPE) 두 가지를 지원합니다.
 *
 * ┌─────────────┬──────────────────────┬───────────────────────┐
 * │             │ Claude               │ Gemma3                │
 * ├─────────────┼──────────────────────┼───────────────────────┤
 * │ Normalizer  │ NFKC                 │ Replace " "→"▁"       │
 * │ PreTokenizer│ ByteLevel (GPT-2식)  │ 전체를 하나로 처리     │
 * │ Vocab 크기  │ 65,000               │ 262,144               │
 * │ Merge 수    │ 64,739               │ 514,906               │
 * │ BOS 토큰    │ 없음                 │ <bos> (id=2) 자동 추가 │
 * └─────────────┴──────────────────────┴───────────────────────┘
 */

import { mergeBPE } from './bpe.js';

// ============================================================
// GPT-2 Byte-to-Unicode 매핑
// ============================================================

/**
 * GPT-2의 byte_to_unicode 매핑 테이블 생성
 *
 * ByteLevel BPE(Claude, GPT-2 등)에서 사용되는 핵심 매핑입니다.
 * 모든 256개 바이트를 출력 가능한 유니코드 문자로 매핑합니다.
 *
 * 동작 원리:
 * - 출력 가능한 ASCII (33~126, 161~172, 174~255) → 그 자체를 문자로 사용
 * - 나머지 바이트 (0~32, 127~160, 173) → U+0100부터 순서대로 매핑
 *
 * 예: 바이트 0x20 (공백) → U+0120 (Ġ)
 *     바이트 0x41 (A)   → 'A' (출력 가능하므로 그대로)
 *
 * 이렇게 하면 모든 바이트열을 "보이는 문자열"로 표현할 수 있어,
 * vocab에 바이트 시퀀스를 문자열 키로 저장할 수 있습니다.
 */
function buildByteToUnicode() {
  const bs = [];
  // 출력 가능한 바이트 범위 수집
  for (let i = 33; i <= 126; i++) bs.push(i);   // ! ~ ~
  for (let i = 161; i <= 172; i++) bs.push(i);   // ¡ ~ ¬
  for (let i = 174; i <= 255; i++) bs.push(i);   // ® ~ ÿ

  const cs = [...bs]; // 매핑될 유니코드 코드포인트
  let n = 0;

  // 위에서 포함되지 않은 바이트(비출력)는 U+0100부터 순서대로 매핑
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n); // U+0100, U+0101, ...
      n++;
    }
  }

  const byteToUni = {};
  for (let i = 0; i < bs.length; i++) {
    byteToUni[bs[i]] = String.fromCharCode(cs[i]);
  }
  return byteToUni;
}

/** 바이트(0~255) → 유니코드 문자 매핑 테이블 */
const BYTE_TO_UNICODE = buildByteToUnicode();
const textEncoder = new TextEncoder();

/**
 * GPT-2 스타일 정규식 (ByteLevel pre-tokenizer용)
 * 영어 축약형('s, 't 등), 단어, 숫자, 공백 등을 단위로 분리합니다.
 */
const BYTE_LEVEL_REGEX =
  /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

// ============================================================
// HFTokenizer 클래스
// ============================================================

export class HFTokenizer {
  /**
   * @param {object} data - tokenizer.json에서 로드한 전체 데이터
   */
  constructor(data) {
    /** 토큰 문자열 → ID 매핑 (예: "hello" → 1234) */
    this.vocab = data.model.vocab;

    // Normalizer 설정
    this.normalizerType = data.normalizer?.type;
    this.normalizerPattern = data.normalizer?.pattern?.String;
    this.normalizerContent = data.normalizer?.content;

    // PreTokenizer 설정
    this.preTokenizerType = data.pre_tokenizer?.type;

    // Merge 규칙 → 우선순위(인덱스) 맵 구축
    // merges는 문자열("Ġ t") 또는 배열(["▁", "이"]) 형식일 수 있음
    this.mergeRanks = new Map();
    for (let i = 0; i < data.model.merges.length; i++) {
      const m = data.model.merges[i];
      const key = Array.isArray(m) ? m.join(' ') : m;
      this.mergeRanks.set(key, i);
    }

    // added_tokens: BPE로 분할되지 않는 특수/사전정의 토큰
    this.addedTokens = new Map();
    if (data.added_tokens) {
      for (const t of data.added_tokens) {
        this.addedTokens.set(t.content, t.id);
      }
    }

    // PostProcessor: BOS(Beginning of Sequence) 토큰 자동 추가 여부 확인
    // Gemma3는 모든 인코딩 앞에 <bos> 토큰(id=2)을 붙임
    this.bosTokenId = null;
    const pp = data.post_processor;
    if (pp?.type === 'TemplateProcessing' && pp.single?.[0]?.SpecialToken) {
      const bosContent = pp.single[0].SpecialToken.id;
      const bosToken = data.added_tokens?.find(t => t.content === bosContent);
      if (bosToken) this.bosTokenId = bosToken.id;
    }
  }

  /**
   * 텍스트 정규화 (Normalizer 단계)
   *
   * - NFKC: 유니코드 호환 분해 후 합성 (Claude)
   *   예: "ﬁ" → "fi", "Ⅲ" → "III"
   * - Replace: 특정 문자를 다른 문자로 치환 (Gemma3)
   *   예: " " → "▁" (SentencePiece 공백 마커)
   */
  normalize(text) {
    if (this.normalizerType === 'NFKC') {
      return text.normalize('NFKC');
    }
    if (this.normalizerType === 'Replace' && this.normalizerPattern != null) {
      return text.split(this.normalizerPattern).join(this.normalizerContent);
    }
    return text;
  }

  /**
   * 텍스트를 토큰화 단위로 분리 (PreTokenizer 단계)
   *
   * - ByteLevel (Claude): GPT-2 스타일 정규식으로 단어/숫자/공백 분리
   * - 기타 (Gemma3): 전체 텍스트를 하나의 청크로 처리
   *   (SentencePiece는 전체를 한 번에 BPE 처리)
   */
  preTokenize(text) {
    if (this.preTokenizerType === 'ByteLevel') {
      return text.match(BYTE_LEVEL_REGEX) || [];
    }
    return [text];
  }

  /**
   * 단일 텍스트 조각을 토큰 ID 배열로 인코딩
   *
   * ByteLevel 모드 (Claude):
   *   1. UTF-8 바이트로 변환
   *   2. 각 바이트를 GPT-2 유니코드 문자로 매핑
   *   3. BPE 병합 수행
   *   4. vocab에서 ID 조회
   *
   * SentencePiece 모드 (Gemma3):
   *   1. 문자 단위로 분리
   *   2. BPE 병합 수행
   *   3. vocab에서 ID 조회
   */
  encodePiece(piece) {
    let symbols;

    if (this.preTokenizerType === 'ByteLevel') {
      // 텍스트 → UTF-8 바이트 → GPT-2 유니코드 문자 배열
      // 예: "Hello" → [72,101,...] → ["H","e","l","l","o"]
      // 예: " the" → [32,116,...] → ["Ġ","t","h","e"] (공백 0x20 → Ġ)
      const bytes = textEncoder.encode(piece);
      symbols = Array.from(bytes).map(b => BYTE_TO_UNICODE[b]);
    } else {
      // SentencePiece 방식: 유니코드 문자 단위로 분리
      // 예: "▁안녕" → ["▁", "안", "녕"]
      symbols = Array.from(piece);
    }

    if (symbols.length === 0) return [];

    // 1개 심볼이면 BPE 불필요, 바로 vocab 조회
    if (symbols.length === 1) {
      const id = this.vocab[symbols[0]];
      return id != null ? [id] : [];
    }

    // BPE merge 수행
    const merged = mergeBPE(symbols, this.mergeRanks);

    // 병합된 각 심볼을 vocab 또는 added_tokens에서 ID로 변환
    const ids = [];
    for (const token of merged) {
      const id = this.vocab[token] ?? this.addedTokens.get(token);
      if (id != null) ids.push(id);
    }
    return ids;
  }

  /**
   * 전체 텍스트를 토큰 ID 배열로 인코딩
   *
   * 파이프라인: normalize → preTokenize → encodePiece → postProcess(BOS)
   *
   * @param {string} text - 인코딩할 텍스트
   * @returns {number[]} 토큰 ID 배열
   */
  encode(text) {
    text = this.normalize(text);
    const pieces = this.preTokenize(text);
    const result = [];

    // BOS 토큰이 설정된 경우 맨 앞에 추가 (Gemma3: <bos> id=2)
    if (this.bosTokenId != null) result.push(this.bosTokenId);

    for (const piece of pieces) {
      result.push(...this.encodePiece(piece));
    }
    return result;
  }
}
