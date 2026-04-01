/**
 * bpe.js - BPE (Byte Pair Encoding) 핵심 알고리즘
 *
 * BPE는 텍스트를 토큰으로 분할하는 알고리즘으로,
 * "가장 우선순위가 높은 인접 쌍을 반복적으로 병합"하는 원리입니다.
 *
 * 두 가지 변형을 제공합니다:
 * 1. bytePairEncode - rank 기반 (tiktoken/OpenAI용)
 * 2. mergeBPE       - merge 목록 기반 (HuggingFace/Claude,Gemma용)
 */

// ============================================================
// 1. Rank-based BPE (tiktoken 방식 - OpenAI에서 사용)
// ============================================================

/**
 * rank 기반 BPE 인코딩
 *
 * tiktoken은 모든 가능한 바이트 조합에 "rank(순위)"를 부여합니다.
 * rank가 낮을수록 우선순위가 높아 먼저 병합됩니다.
 *
 * @param {number[]} piece  - 입력 바이트 배열 (UTF-8 인코딩된 텍스트 조각)
 * @param {Map<string, number>} ranks - 바이트 시퀀스 → rank 매핑
 *   key: 쉼표로 연결된 바이트열 (예: "72,101,108" = "Hel")
 *   value: rank 번호 (낮을수록 병합 우선)
 * @returns {number[]} 토큰 ID 배열
 */
export function bytePairEncode(piece, ranks) {
  // 1바이트는 그 자체가 토큰이므로 바로 반환
  if (piece.length === 1) {
    return [ranks.get(String(piece[0]))];
  }

  // 병합 수행 후, 각 구간을 rank에서 찾아 토큰 ID로 변환
  const parts = bytePairMerge(piece, ranks);
  return parts
    .map(p => ranks.get(piece.slice(p.start, p.end).join(',')))
    .filter(x => x != null);
}

/**
 * rank 기반 BPE의 핵심 병합 루프
 *
 * 동작 원리:
 * 1. 각 바이트를 개별 구간(part)으로 시작
 * 2. 인접한 두 구간을 합쳤을 때의 rank를 확인
 * 3. rank가 가장 낮은(우선순위 높은) 쌍을 병합
 * 4. 더 이상 병합할 수 없을 때까지 반복
 *
 * @param {number[]} piece  - 바이트 배열
 * @param {Map<string, number>} ranks - rank 맵
 * @returns {{start: number, end: number}[]} 병합된 구간 배열
 */
function bytePairMerge(piece, ranks) {
  // 초기 상태: 각 바이트가 하나의 구간
  // 예: [72, 101, 108] → [{0,1}, {1,2}, {2,3}]
  let parts = Array.from({ length: piece.length }, (_, i) => ({
    start: i,
    end: i + 1,
  }));

  while (parts.length > 1) {
    let minRank = null;

    // 인접 구간 쌍 중 rank가 가장 낮은 것을 찾기
    for (let i = 0; i < parts.length - 1; i++) {
      // 두 구간을 합친 바이트열의 rank를 조회
      const key = piece.slice(parts[i].start, parts[i + 1].end).join(',');
      const rank = ranks.get(key);
      if (rank != null && (minRank == null || rank < minRank[0])) {
        minRank = [rank, i];
      }
    }

    // 병합 가능한 쌍이 없으면 종료
    if (minRank == null) break;

    // 가장 우선순위 높은 쌍을 하나의 구간으로 병합
    const i = minRank[1];
    parts[i] = { start: parts[i].start, end: parts[i + 1].end };
    parts.splice(i + 1, 1);
  }

  return parts;
}

// ============================================================
// 2. Merge-list BPE (HuggingFace 방식 - Claude, Gemma에서 사용)
// ============================================================

/**
 * merge 목록 기반 BPE 인코딩
 *
 * HuggingFace tokenizer.json에는 merge 규칙이 순서대로 나열되어 있습니다.
 * 목록의 앞에 있을수록 우선순위가 높아 먼저 병합됩니다.
 *
 * 예) merges: ["▁ t", "e r", "▁t h", ...]
 *   → "▁"와 "t"를 먼저 병합, 그 다음 "e"와 "r" 병합, ...
 *
 * @param {string[]} symbols    - 초기 심볼 배열 (개별 문자 또는 바이트 문자)
 * @param {Map<string, number>} mergeRanks - "심볼A 심볼B" → 우선순위(인덱스) 매핑
 * @returns {string[]} 병합이 완료된 심볼 배열 (각 심볼 = 하나의 토큰)
 */
export function mergeBPE(symbols, mergeRanks) {
  if (symbols.length <= 1) return symbols;

  let word = [...symbols];

  while (word.length > 1) {
    // 현재 인접 쌍 중 우선순위가 가장 높은(인덱스가 가장 낮은) 것 찾기
    let bestPair = null;
    let bestRank = Infinity;

    for (let i = 0; i < word.length - 1; i++) {
      const pair = word[i] + ' ' + word[i + 1];
      const rank = mergeRanks.get(pair);
      if (rank !== undefined && rank < bestRank) {
        bestRank = rank;
        bestPair = [word[i], word[i + 1]];
      }
    }

    // merge 목록에 해당하는 쌍이 없으면 종료
    if (bestPair == null) break;

    // 해당 쌍의 모든 출현을 병합
    // 예: ["a", "b", "a", "b"] + merge("a","b") → ["ab", "ab"]
    const [first, second] = bestPair;
    const merged = first + second;
    const newWord = [];
    let i = 0;

    while (i < word.length) {
      if (i < word.length - 1 && word[i] === first && word[i + 1] === second) {
        newWord.push(merged);
        i += 2; // 두 심볼을 건너뜀
      } else {
        newWord.push(word[i]);
        i++;
      }
    }

    word = newWord;
  }

  return word;
}
