/**
 * tiktoken.js - OpenAI tiktoken 포맷 토크나이저
 *
 * OpenAI의 tiktoken은 다음과 같이 동작합니다:
 * 1. 정규식(pat_str)으로 텍스트를 단어/청크 단위로 분리
 * 2. 각 청크를 UTF-8 바이트로 변환
 * 3. 바이트열에 rank 기반 BPE를 적용하여 토큰 ID 생성
 *
 * 데이터 포맷 (encoders/*.json):
 *   - pat_str: 사전 분리용 정규식
 *   - bpe_ranks: "MARKER OFFSET base64_token1 base64_token2 ..." 형식
 *     각 base64 토큰의 위치(인덱스)가 곧 rank
 *   - special_tokens: 특수 토큰 → ID 매핑
 *
 * js-tiktoken (MIT license)의 알고리즘을 참고하여 포팅하였습니다.
 */

import { bytePairEncode } from './bpe.js';

const textEncoder = new TextEncoder();

// ============================================================
// Base64 디코딩 (외부 의존성 없이 직접 구현)
// ============================================================

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const b64Lookup = new Uint8Array(128);
for (let i = 0; i < B64_CHARS.length; i++) {
  b64Lookup[B64_CHARS.charCodeAt(i)] = i;
}

/**
 * Base64 문자열을 바이트 배열(Uint8Array)로 디코딩
 * tiktoken의 bpe_ranks에 저장된 토큰은 base64로 인코딩되어 있음
 *
 * 예: "SGVsbG8=" → Uint8Array [72, 101, 108, 108, 111] ("Hello")
 */
function base64ToBytes(b64) {
  // 패딩(=) 제거 후 실제 데이터 길이 계산
  let len = b64.length;
  while (b64[len - 1] === '=') len--;
  const byteLen = (len * 3) >> 2; // base64 3/4 비율

  const bytes = new Uint8Array(byteLen);
  for (let i = 0, j = 0; i < len; i += 4) {
    // 4개의 base64 문자 → 3바이트 변환
    const a = b64Lookup[b64.charCodeAt(i)];
    const b = b64Lookup[b64.charCodeAt(i + 1)];
    const c = b64Lookup[b64.charCodeAt(i + 2)];
    const d = b64Lookup[b64.charCodeAt(i + 3)];
    bytes[j++] = (a << 2) | (b >> 4);
    if (j < byteLen) bytes[j++] = ((b & 0xf) << 4) | (c >> 2);
    if (j < byteLen) bytes[j++] = ((c & 0x3) << 6) | d;
  }
  return bytes;
}

// ============================================================
// TiktokenTokenizer 클래스
// ============================================================

export class TiktokenTokenizer {
  /**
   * @param {object} data - encoders/*.json에서 로드한 데이터
   *   - pat_str: 텍스트 분리용 정규식 패턴
   *   - bpe_ranks: rank 데이터 문자열
   *   - special_tokens: 특수 토큰 매핑
   */
  constructor(data) {
    /** @type {Map<string, number>} 바이트열(쉼표 구분) → rank 매핑 */
    this.rankMap = new Map();
    this.patStr = data.pat_str;
    this.specialTokens = data.special_tokens || {};

    // bpe_ranks 파싱
    // 포맷: "MARKER OFFSET token1 token2 token3 ..."
    // - MARKER: 라인 식별자 (무시)
    // - OFFSET: 이 라인의 첫 토큰에 부여될 rank 번호
    // - token1, token2, ...: base64 인코딩된 바이트 시퀀스
    //   → token1의 rank = OFFSET, token2의 rank = OFFSET+1, ...
    const lines = data.bpe_ranks.split('\n').filter(Boolean);
    for (const line of lines) {
      const [, offsetStr, ...tokens] = line.split(' ');
      const offset = parseInt(offsetStr, 10);
      for (let i = 0; i < tokens.length; i++) {
        // base64 디코딩 → 바이트 배열 → 쉼표 구분 문자열로 키 생성
        const bytes = base64ToBytes(tokens[i]);
        this.rankMap.set(Array.from(bytes).join(','), offset + i);
      }
    }
  }

  /**
   * 텍스트를 토큰 ID 배열로 인코딩
   *
   * 과정:
   * 1. pat_str 정규식으로 텍스트를 청크로 분리
   *    예: "Hello world" → ["Hello", " world"]
   * 2. 각 청크를 UTF-8 바이트로 변환
   * 3. 바이트열이 rankMap에 바로 있으면 (= 이미 하나의 토큰) 그대로 사용
   * 4. 없으면 BPE 알고리즘으로 바이트열을 분할/병합하여 토큰 ID 추출
   *
   * @param {string} text - 인코딩할 텍스트
   * @returns {number[]} 토큰 ID 배열
   */
  encode(text) {
    const regex = new RegExp(this.patStr, 'ug');
    const result = [];

    for (const match of text.matchAll(regex)) {
      // 매치된 텍스트 조각을 UTF-8 바이트로 변환
      const piece = Array.from(textEncoder.encode(match[0]));

      // 전체가 하나의 토큰인 경우 빠르게 처리 (최적화)
      const singleToken = this.rankMap.get(piece.join(','));
      if (singleToken != null) {
        result.push(singleToken);
        continue;
      }

      // BPE 병합을 통해 토큰 ID들을 추출
      result.push(...bytePairEncode(piece, this.rankMap));
    }

    return result;
  }
}
