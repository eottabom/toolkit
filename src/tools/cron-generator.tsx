"use client";

import { useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToolActionButton, ToolBadge, ToolCard, ToolHeader, ToolInfoPanel, ToolPage } from "@/components/tool-ui";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

import type { ToolItem } from "@/lib/tools";

/* 타입 */

type CronPlatform = "linux" | "jenkins" | "spring" | "quartz";

type FieldKey = "second" | "minute" | "hour" | "day" | "month" | "weekday" | "year";

type FieldMode = "every" | "specific" | "range" | "interval" | "hash" | "hashInterval" | "hashRange";

type FieldState = {
  mode: FieldMode;
  specific: number[];
  rangeStart: number;
  rangeEnd: number;
  intervalBase: number;
  intervalStep: number;
};

/* 플랫폼별 필드 정의 */

const PLATFORMS: { value: CronPlatform; label: string; desc: string }[] = [
  { value: "linux", label: "Linux", desc: "5필드: 분 시 일 월 요일" },
  { value: "jenkins", label: "Jenkins", desc: "5필드 + H (해시) 지원" },
  { value: "spring", label: "Spring", desc: "6필드: 초 분 시 일 월 요일" },
  { value: "quartz", label: "Quartz", desc: "7필드: 초 분 시 일 월 요일 연도" },
];

type FieldDef = {
  key: FieldKey;
  label: string;
  min: number;
  max: number;
  names?: string[];
};

const COMMON_FIELDS: FieldDef[] = [
  { key: "minute", label: "분 (Minute)", min: 0, max: 59 },
  { key: "hour", label: "시 (Hour)", min: 0, max: 23 },
  { key: "day", label: "일 (Day)", min: 1, max: 31 },
  { key: "month", label: "월 (Month)", min: 1, max: 12, names: ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] },
  { key: "weekday", label: "요일 (Weekday)", min: 0, max: 6, names: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] },
];

const SECOND_DEF: FieldDef = { key: "second", label: "초 (Second)", min: 0, max: 59 };
const YEAR_DEF: FieldDef = { key: "year", label: "연도 (Year)", min: 2024, max: 2099 };

const FIELD_DEFS: Record<CronPlatform, FieldDef[]> = {
  linux: COMMON_FIELDS,
  jenkins: COMMON_FIELDS,
  spring: [
    SECOND_DEF,
    ...COMMON_FIELDS,
  ],
  quartz: [
    SECOND_DEF,
    ...COMMON_FIELDS.slice(0, -1),
    { key: "weekday", label: "요일 (Weekday)", min: 1, max: 7, names: ["", "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] },
    YEAR_DEF,
  ],
};

/* 기본 상태 */

function defaultField(def: FieldDef): FieldState {
  return {
    mode: "every",
    specific: [],
    rangeStart: def.min,
    rangeEnd: def.max,
    intervalBase: def.min,
    intervalStep: 1,
  };
}

/* 프리셋 */

type Preset = { label: string; desc: string; platforms: CronPlatform[]; apply: (platform: CronPlatform) => Record<FieldKey, FieldState> };

function makeFields(platform: CronPlatform, overrides: Partial<Record<FieldKey, Partial<FieldState>>>): Record<FieldKey, FieldState> {
  const result = {} as Record<FieldKey, FieldState>;
  for (const def of FIELD_DEFS[platform]) {
    result[def.key] = { ...defaultField(def), ...overrides[def.key] };
  }
  // 나머지 키 기본값 채우기
  for (const key of ["second", "minute", "hour", "day", "month", "weekday", "year"] as FieldKey[]) {
    if (!result[key]) {
      result[key] = { mode: "every", specific: [], rangeStart: 0, rangeEnd: 59, intervalBase: 0, intervalStep: 1 };
    }
  }
  return result;
}

/** specific field shorthand */
function sf(values: number[]): Partial<FieldState> {
  return { mode: "specific", specific: values, rangeStart: 0, rangeEnd: 59, intervalBase: 0, intervalStep: 1 };
}

/** hash field shorthand */
function hf(): Partial<FieldState> {
  return { mode: "hash", specific: [], rangeStart: 0, rangeEnd: 59, intervalBase: 0, intervalStep: 1 };
}

const PRESETS: Preset[] = [
  {
    label: "매분",
    desc: "* * * * *",
    platforms: ["linux", "spring", "quartz"],
    apply: (p) => makeFields(p, {}),
  },
  {
    label: "매시 정각",
    desc: "매시간 0분에 실행",
    platforms: ["linux", "spring", "quartz"],
    apply: (p) => makeFields(p, { minute: sf([0]), second: sf([0]) }),
  },
  {
    label: "매일 자정",
    desc: "매일 00:00에 실행",
    platforms: ["linux", "spring", "quartz"],
    apply: (p) => makeFields(p, { minute: sf([0]), hour: { ...sf([0]), rangeEnd: 23 }, second: sf([0]) }),
  },
  {
    label: "매주 월요일",
    desc: "매주 월요일 00:00에 실행",
    platforms: ["linux", "spring", "quartz"],
    apply: (p) => {
      const wdVal = p === "quartz" ? 2 : 1;
      return makeFields(p, {
        minute: sf([0]),
        hour: { ...sf([0]), rangeEnd: 23 },
        weekday: { ...sf([wdVal]), rangeStart: p === "quartz" ? 1 : 0, rangeEnd: p === "quartz" ? 7 : 6, intervalBase: p === "quartz" ? 1 : 0 },
        second: sf([0]),
      });
    },
  },
  {
    label: "5분마다",
    desc: "매 5분 간격으로 실행",
    platforms: ["linux", "spring", "quartz"],
    apply: (p) => makeFields(p, { minute: { mode: "interval", specific: [], rangeStart: 0, rangeEnd: 59, intervalBase: 0, intervalStep: 5 }, second: sf([0]) }),
  },
  /* Jenkins 전용 프리셋 */
  {
    label: "H (분산)",
    desc: "H * * * * — Jenkins가 알아서 분산",
    platforms: ["jenkins"],
    apply: (p) => makeFields(p, { minute: hf() }),
  },
  {
    label: "H/15 (15분 분산)",
    desc: "H/15 * * * *",
    platforms: ["jenkins"],
    apply: (p) => makeFields(p, { minute: { mode: "hashInterval", specific: [], rangeStart: 0, rangeEnd: 59, intervalBase: 0, intervalStep: 15 } }),
  },
  {
    label: "매일 분산",
    desc: "H H * * * — 하루 한 번 분산 실행",
    platforms: ["jenkins"],
    apply: (p) => makeFields(p, { minute: hf(), hour: { ...hf(), rangeEnd: 23 } }),
  },
  {
    label: "평일 분산",
    desc: "H H * * 1-5 — 평일 하루 한 번",
    platforms: ["jenkins"],
    apply: (p) => makeFields(p, { minute: hf(), hour: { ...hf(), rangeEnd: 23 }, weekday: { mode: "range", specific: [], rangeStart: 1, rangeEnd: 5, intervalBase: 0, intervalStep: 1 } }),
  },
  {
    label: "업무시간 분산",
    desc: "H H(9-17) * * 1-5 — 업무시간 내 분산",
    platforms: ["jenkins"],
    apply: (p) => makeFields(p, { minute: hf(), hour: { mode: "hashRange", specific: [], rangeStart: 9, rangeEnd: 17, intervalBase: 0, intervalStep: 1 }, weekday: { mode: "range", specific: [], rangeStart: 1, rangeEnd: 5, intervalBase: 0, intervalStep: 1 } }),
  },
];

/* 표현식 생성 */

function fieldToExpression(field: FieldState, def: FieldDef, platform: CronPlatform): string {
  switch (field.mode) {
    case "every":
      return "*";
    case "specific":
      if (field.specific.length === 0) {
        return "*";
      }
      return field.specific.sort((a, b) => a - b).join(",");
    case "range":
      return `${field.rangeStart}-${field.rangeEnd}`;
    case "interval":
      if (field.intervalBase === def.min) {
        return `*/${field.intervalStep}`;
      }
      return `${field.intervalBase}/${field.intervalStep}`;
    case "hash":
      return "H";
    case "hashInterval":
      return `H/${field.intervalStep}`;
    case "hashRange":
      return `H(${field.rangeStart}-${field.rangeEnd})`;
    default:
      return "*";
  }
}

function buildExpression(fields: Record<FieldKey, FieldState>, platform: CronPlatform): string {
  const defs = FIELD_DEFS[platform];
  return defs.map((def) => fieldToExpression(fields[def.key], def, platform)).join(" ");
}

/* 표현식 해석 */

function describeExpression(fields: Record<FieldKey, FieldState>, platform: CronPlatform): string {
  const defs = FIELD_DEFS[platform];
  const parts: string[] = [];

  for (const def of defs) {
    const f = fields[def.key];
    if (f.mode === "every") {
      continue;
    }

    const label = def.label.split(" (")[0];

    if (f.mode === "specific" && f.specific.length > 0) {
      const vals = f.specific.sort((a, b) => a - b);
      if (def.names && def.key === "weekday") {
        const names = vals.map((v) => def.names![v] ?? String(v));
        parts.push(`${label}: ${names.join(", ")}`);
      } else if (def.names && def.key === "month") {
        const names = vals.map((v) => def.names![v] ?? String(v));
        parts.push(`${label}: ${names.join(", ")}`);
      } else {
        parts.push(`${label}: ${vals.join(", ")}`);
      }
    } else if (f.mode === "range") {
      parts.push(`${label}: ${f.rangeStart}~${f.rangeEnd}`);
    } else if (f.mode === "interval") {
      if (f.intervalBase === def.min) {
        parts.push(`${label}: 매 ${f.intervalStep}${label === "초" || label === "분" ? label : ""}마다`);
      } else {
        parts.push(`${label}: ${f.intervalBase}부터 매 ${f.intervalStep}마다`);
      }
    } else if (f.mode === "hash") {
      parts.push(`${label}: H (해시 분산)`);
    } else if (f.mode === "hashInterval") {
      parts.push(`${label}: H/${f.intervalStep} (해시 간격)`);
    } else if (f.mode === "hashRange") {
      parts.push(`${label}: H(${f.rangeStart}-${f.rangeEnd}) (해시 범위)`);
    }
  }

  if (parts.length === 0) {
    return "매분 실행";
  }
  return parts.join(" · ");
}

/* 유효성 검사 */

function validateExpression(expr: string, platform: CronPlatform): { valid: boolean; errors: string[] } {
  const parts = expr.trim().split(/\s+/);
  const defs = FIELD_DEFS[platform];
  const errors: string[] = [];

  if (parts.length !== defs.length) {
    errors.push(`필드 수가 맞지 않습니다. ${platform} 형식은 ${defs.length}개 필드가 필요합니다. (입력: ${parts.length}개)`);
    return { valid: false, errors };
  }

  for (let i = 0; i < defs.length; i++) {
    const part = parts[i];
    const def = defs[i];
    const label = def.label.split(" (")[0];

    if (part === "*") {
      continue;
    }

    // Jenkins H 문법
    if (platform === "jenkins") {
      // H
      if (part === "H") {
        continue;
      }
      // H/n
      const hInterval = part.match(/^H\/(\d+)$/);
      if (hInterval) {
        const step = Number(hInterval[1]);
        if (step < 1) errors.push(`${label}: 간격은 1 이상이어야 합니다.`);
        continue;
      }
      // H(n-m)
      const hRange = part.match(/^H\((\d+)-(\d+)\)$/);
      if (hRange) {
        const [, s, e] = hRange;
        const start = Number(s);
        const end = Number(e);
        if (start < def.min || start > def.max) errors.push(`${label}: 시작값 ${start}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
        if (end < def.min || end > def.max) errors.push(`${label}: 끝값 ${end}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
        if (start > end) errors.push(`${label}: 시작값이 끝값보다 큽니다.`);
        continue;
      }
      // H(n-m)/s
      const hRangeInterval = part.match(/^H\((\d+)-(\d+)\)\/(\d+)$/);
      if (hRangeInterval) {
        const [, s, e, st] = hRangeInterval;
        const start = Number(s);
        const end = Number(e);
        const step = Number(st);
        if (start < def.min || start > def.max) errors.push(`${label}: 시작값 ${start}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
        if (end < def.min || end > def.max) errors.push(`${label}: 끝값 ${end}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
        if (step < 1) errors.push(`${label}: 간격은 1 이상이어야 합니다.`);
        continue;
      }

      // Jenkins에서 범위(n-m)는 허용 (요일/월 등에서 사용)
      if (/^\d+-\d+$/.test(part)) {
        const [start, end] = part.split("-").map(Number);
        if (start < def.min || start > def.max) errors.push(`${label}: 시작값 ${start}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
        if (end < def.min || end > def.max) errors.push(`${label}: 끝값 ${end}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
        if (start > end) errors.push(`${label}: 시작값이 끝값보다 큽니다.`);
        continue;
      }

      // Jenkins에서 일반 숫자값은 H를 사용하도록 안내
      errors.push(`${label}: '${part}' — Jenkins에서는 H 기반 표현식을 사용하세요. (H, H/n, H(n-m))`);
      continue;
    }

    // 간격: */n 또는 n/m
    if (/^\*\/\d+$/.test(part)) {
      const step = parseInt(part.split("/")[1]);
      if (step < 1) errors.push(`${label}: 간격은 1 이상이어야 합니다.`);
      continue;
    }
    if (/^\d+\/\d+$/.test(part)) {
      const [base, step] = part.split("/").map(Number);
      if (base < def.min || base > def.max) errors.push(`${label}: 시작값 ${base}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
      if (step < 1) errors.push(`${label}: 간격은 1 이상이어야 합니다.`);
      continue;
    }

    // 범위: n-m
    if (/^\d+-\d+$/.test(part)) {
      const [start, end] = part.split("-").map(Number);
      if (start < def.min || start > def.max) errors.push(`${label}: 시작값 ${start}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
      if (end < def.min || end > def.max) errors.push(`${label}: 끝값 ${end}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
      if (start > end) errors.push(`${label}: 시작값이 끝값보다 큽니다.`);
      continue;
    }

    // 목록: n,m,...
    if (/^[\d,]+$/.test(part)) {
      const vals = part.split(",").map(Number);
      for (const v of vals) {
        if (v < def.min || v > def.max) {
          errors.push(`${label}: 값 ${v}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
        }
      }
      continue;
    }

    // Quartz ? 지원 (일/요일)
    if (platform === "quartz" && part === "?" && (def.key === "day" || def.key === "weekday")) {
      continue;
    }

    // 월/요일 이름 지원
    if (def.names) {
      const upper = part.toUpperCase();
      const nameList = upper.split(",");
      let allValid = true;
      for (const n of nameList) {
        if (!def.names.includes(n) && !/^\d+$/.test(n)) {
          allValid = false;
        }
      }
      if (allValid) {
        continue;
      }
    }

    errors.push(`${label}: '${part}' 형식을 인식할 수 없습니다.`);
  }

  return { valid: errors.length === 0, errors };
}

/* Jenkins H 치환 */

function resolveJenkinsH(expr: string, hashSeed: number, defs: FieldDef[]): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== defs.length) {
    return expr;
  }

  const resolved = parts.map((part, i) => {
    const def = defs[i];
    const range = def.max - def.min + 1;
    const hVal = def.min + (hashSeed % range);

    // H → 고정 해시값
    if (part === "H") {
      return String(hVal);
    }
    // H/n → hVal부터 n 간격 (cron에서는 */n과 유사하게 처리)
    const hInterval = part.match(/^H\/(\d+)$/);
    if (hInterval) {
      const step = Number(hInterval[1]);
      return `${hVal % step}/${step}`;
    }
    // H(n-m) → 범위 내 해시값
    const hRange = part.match(/^H\((\d+)-(\d+)\)$/);
    if (hRange) {
      const start = Number(hRange[1]);
      const end = Number(hRange[2]);
      const rangeSize = end - start + 1;
      return String(start + (hashSeed % rangeSize));
    }
    // H(n-m)/s
    const hRangeInterval = part.match(/^H\((\d+)-(\d+)\)\/(\d+)$/);
    if (hRangeInterval) {
      const start = Number(hRangeInterval[1]);
      const end = Number(hRangeInterval[2]);
      const step = Number(hRangeInterval[3]);
      const base = start + (hashSeed % (end - start + 1));
      return `${base % step}/${step}`;
    }
    return part;
  });

  return resolved.join(" ");
}

/* 다음 실행 시간 */

function getNextExecutions(expr: string, platform: CronPlatform, count: number, hashSeed?: number): Date[] {
  const defs = FIELD_DEFS[platform];

  // Jenkins H 표현식을 해시값으로 치환
  const resolvedExpr = platform === "jenkins" && hashSeed !== undefined
    ? resolveJenkinsH(expr, hashSeed, defs)
    : expr;

  const parts = resolvedExpr.trim().split(/\s+/);
  if (parts.length !== defs.length) {
    return [];
  }

  // 각 필드를 매칭 가능한 값 집합으로 파싱
  function parseField(part: string, def: FieldDef): number[] | null {
    // null = 모든 값
    if (part === "*" || part === "?") {
      return null;
    }

    if (/^\*\/(\d+)$/.test(part)) {
      const step = parseInt(part.split("/")[1]);
      const vals: number[] = [];
      for (let i = def.min; i <= def.max; i += step) vals.push(i);
      return vals;
    }

    if (/^(\d+)\/(\d+)$/.test(part)) {
      const [base, step] = part.split("/").map(Number);
      const vals: number[] = [];
      for (let i = base; i <= def.max; i += step) vals.push(i);
      return vals;
    }

    if (/^(\d+)-(\d+)$/.test(part)) {
      const [start, end] = part.split("-").map(Number);
      const vals: number[] = [];
      for (let i = start; i <= end; i++) vals.push(i);
      return vals;
    }

    if (/^[\d,]+$/.test(part)) {
      return part.split(",").map(Number);
    }

    return null;
  }

  const fieldMap: Partial<Record<FieldKey, number[] | null>> = {};
  for (let i = 0; i < defs.length; i++) {
    fieldMap[defs[i].key] = parseField(parts[i], defs[i]);
  }

  const matches = (val: number, allowed: number[] | null | undefined) =>
    allowed === null || allowed === undefined || allowed.includes(val);

  const results: Date[] = [];
  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0);

  const maxIterations = 525960; // 약 1년(분)
  for (let i = 0; i < maxIterations && results.length < count; i++) {
    const min = cursor.getMinutes();
    const hr = cursor.getHours();
    const day = cursor.getDate();
    const mon = cursor.getMonth() + 1;
    const wd = platform === "quartz" ? cursor.getDay() + 1 : cursor.getDay();
    const yr = cursor.getFullYear();

    let match = true;
    if (fieldMap.second !== undefined) {
      match = match && matches(0, fieldMap.second);
    }
    match = match && matches(min, fieldMap.minute);
    match = match && matches(hr, fieldMap.hour);
    match = match && matches(day, fieldMap.day);
    match = match && matches(mon, fieldMap.month);
    match = match && matches(wd, fieldMap.weekday);
    if (platform === "quartz" && fieldMap.year !== undefined) {
      match = match && matches(yr, fieldMap.year);
    }

    if (match) {
      results.push(new Date(cursor));
    }

    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return results;
}

/* 컴포넌트 */

export default function CronGenerator({ tool }: { tool: ToolItem }) {
  const [platform, setPlatform] = useState<CronPlatform>("linux");
  const [fields, setFields] = useState<Record<FieldKey, FieldState>>(() => {
    const result = {} as Record<FieldKey, FieldState>;
    for (const def of FIELD_DEFS.linux) {
      result[def.key] = defaultField(def);
    }
    result.second = defaultField(SECOND_DEF);
    result.year = defaultField(YEAR_DEF);
    return result;
  });

  /* 수동 입력 모드 */
  const [manualMode, setManualMode] = useState(false);
  const [manualExpr, setManualExpr] = useState("");

  /* Jenkins 해시 시드 (0~59) */
  const [hashSeed, setHashSeed] = useState(7);

  const { copy, isCopied } = useCopyToClipboard();

  const expression = useMemo(() => buildExpression(fields, platform), [fields, platform]);
  const description = useMemo(() => describeExpression(fields, platform), [fields, platform]);

  const activeExpr = manualMode ? manualExpr : expression;

  const validation = useMemo(() => {
    if (!activeExpr.trim()) {
      return null;
    }
    return validateExpression(activeExpr, platform);
  }, [activeExpr, platform]);

  const nextExecutions = useMemo(() => {
    if (!activeExpr.trim() || (validation && !validation.valid)) {
      return [];
    }
    return getNextExecutions(activeExpr, platform, 5, platform === "jenkins" ? hashSeed : undefined);
  }, [activeExpr, platform, validation, hashSeed]);

  const handlePlatformChange = useCallback(
    (p: CronPlatform) => {
      setPlatform(p);

      const jenkinsModes: FieldMode[] = ["hash", "hashInterval", "hashRange"];
      const standardOnlyModes: FieldMode[] = ["interval", "specific"];

      const isValidMode = (mode: FieldMode, target: CronPlatform): boolean => {
        if (target === "jenkins" && standardOnlyModes.includes(mode)) return false;
        if (target !== "jenkins" && jenkinsModes.includes(mode)) return false;
        return true;
      };

      // 새 플랫폼에 맞게 필드 초기화
      const result = {} as Record<FieldKey, FieldState>;
      for (const def of FIELD_DEFS[p]) {
        if (fields[def.key]) {
          const existing = { ...fields[def.key] };
          if (!isValidMode(existing.mode, p)) {
            existing.mode = "every";
          }
          result[def.key] = existing;
        } else {
          result[def.key] = defaultField(def);
        }
      }
      if (!result.second) result.second = defaultField(SECOND_DEF);
      if (!result.year) result.year = defaultField(YEAR_DEF);
      setFields(result);
    },
    [fields],
  );

  const applyPreset = useCallback(
    (preset: Preset) => {
      setFields(preset.apply(platform));
      setManualMode(false);
    },
    [platform],
  );

  const updateField = useCallback((key: FieldKey, patch: Partial<FieldState>) => {
    setFields((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  const toggleSpecific = useCallback((key: FieldKey, val: number) => {
    setFields((prev) => {
      const field = prev[key];
      const specific = field.specific.includes(val) ? field.specific.filter((v) => v !== val) : [...field.specific, val];
      return { ...prev, [key]: { ...field, mode: "specific", specific } };
    });
  }, []);

  const handleCopy = useCallback(async () => {
    await copy(activeExpr);
  }, [copy, activeExpr]);

  /* 스타일 */
  const inputClass =
    "h-9 rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none";
  const tabBtnClass = (active: boolean) =>
    `cursor-pointer h-8 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
      active
        ? "bg-blue-600 text-white"
        : "border border-[color:var(--card-border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;

  const currentDefs = FIELD_DEFS[platform];
  const standardModes: { value: FieldMode; label: string }[] = [
    { value: "every", label: "매번 (*)" },
    { value: "specific", label: "특정 값" },
    { value: "range", label: "범위 (n-m)" },
    { value: "interval", label: "간격 (*/n)" },
  ];
  const jenkinsModes: { value: FieldMode; label: string }[] = [
    { value: "every", label: "매번 (*)" },
    { value: "hash", label: "H (해시)" },
    { value: "hashInterval", label: "H/n (해시 간격)" },
    { value: "hashRange", label: "H(n-m) (해시 범위)" },
  ];
  const getModesForField = () => platform === "jenkins" ? jenkinsModes : standardModes;

  return (
    <ToolPage>
      <ToolHeader
        title={tool.title}
        description={tool.desc}
        right={
          <div className="self-start text-xs uppercase tracking-[0.2em] text-[var(--muted)] md:self-auto">
            Expression Builder
          </div>
        }
      />

      <ToolInfoPanel
        icon="⏰"
        title="Cron Expression Generator"
        description={
          <>
            UI 기반으로 cron 표현식을 생성하거나, 직접 입력하여 유효성을 검사합니다.
            Linux, Jenkins, Spring, Quartz 등 다양한 플랫폼 형식을 지원합니다.
          </>
        }
        chips={["Linux (5필드)", "Jenkins (H)", "Spring (6필드)", "Quartz (7필드)"]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* 입력 영역 */}
        <div className="flex flex-col gap-5">
          {/* 플랫폼 선택 */}
          <ToolCard>
            <ToolBadge>Platform</ToolBadge>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePlatformChange(p.value)}
                  className={`cursor-pointer flex flex-col gap-1 rounded-2xl border p-3 text-left transition ${
                    platform === p.value
                      ? "border-blue-500 bg-blue-500/10 text-[var(--foreground)]"
                      : "border-[color:var(--card-border)] bg-[var(--surface-muted)] text-[var(--muted)] hover:border-[color:var(--card-border-hover)]"
                  }`}
                >
                  <span className="text-sm font-semibold">{p.label}</span>
                  <span className="text-[10px]">{p.desc}</span>
                </button>
              ))}
            </div>
          </ToolCard>

          {/* 프리셋 */}
          <ToolCard>
            <ToolBadge>Presets</ToolBadge>
            <div className="flex flex-wrap gap-2">
              {PRESETS.filter((pr) => pr.platforms.includes(platform)).map((pr) => (
                <button
                  key={pr.label}
                  type="button"
                  onClick={() => applyPreset(pr)}
                  className="cursor-pointer rounded-full border border-[color:var(--card-border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:border-[color:var(--card-border-hover)] hover:bg-[var(--surface-muted)]"
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </ToolCard>

          {/* 모드 전환 */}
          <div className="flex items-center gap-2">
            <button type="button" className={tabBtnClass(!manualMode)} onClick={() => setManualMode(false)}>
              UI Builder
            </button>
            <button type="button" className={tabBtnClass(manualMode)} onClick={() => setManualMode(true)}>
              Manual Input
            </button>
          </div>

          {manualMode ? (
            <ToolCard>
              <ToolBadge>Expression Input</ToolBadge>
              <Input
                value={manualExpr}
                onChange={(e) => setManualExpr(e.target.value)}
                placeholder={platform === "quartz" ? "0 0 12 * * ? 2025" : platform === "spring" ? "0 0 12 * * *" : platform === "jenkins" ? "H H * * *" : "0 12 * * *"}
                className={`${inputClass} w-full font-mono`}
                aria-label="Cron expression"
              />
              <p className="text-xs text-[var(--muted)]">
                {platform === "linux" && "형식: 분 시 일 월 요일"}
                {platform === "jenkins" && "형식: 분 시 일 월 요일 — H, H/n, H(n-m) 사용"}
                {platform === "spring" && "형식: 초 분 시 일 월 요일"}
                {platform === "quartz" && "형식: 초 분 시 일 월 요일 연도"}
              </p>
              {validation && !validation.valid && (
                <div className="flex flex-col gap-1.5">
                  {validation.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-xl bg-[color:var(--error)]/10 px-3 py-2">
                      <span className="text-xs text-[color:var(--error)]">{err}</span>
                    </div>
                  ))}
                </div>
              )}
              {validation?.valid && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">유효한 표현식입니다.</span>
                </div>
              )}
            </ToolCard>
          ) : (
            /* 필드별 설정 */
            <div className="flex flex-col gap-4">
              {currentDefs.map((def) => (
                <ToolCard key={def.key}>
                  <div className="flex items-center justify-between">
                    <ToolBadge>{def.label}</ToolBadge>
                    <span className="font-mono text-xs text-[var(--muted)]">
                      {fieldToExpression(fields[def.key], def, platform)}
                    </span>
                  </div>

                  {/* 모드 선택 */}
                  <div className="flex flex-wrap gap-1.5">
                    {getModesForField().map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => updateField(def.key, { mode: m.value })}
                        className={`cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                          fields[def.key].mode === m.value
                            ? "bg-blue-600 text-white"
                            : "border border-[color:var(--card-border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* 모드별 UI */}
                  {fields[def.key].mode === "specific" && (
                    def.key === "weekday" ? (
                      /* 요일: 드롭다운 체크박스 */
                      <div className="flex flex-col gap-1.5 rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-2">
                        {Array.from({ length: def.max - def.min + 1 }, (_, i) => def.min + i).map((v) => (
                          <label
                            key={v}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-[var(--surface)]"
                          >
                            <input
                              type="checkbox"
                              checked={fields[def.key].specific.includes(v)}
                              onChange={() => toggleSpecific(def.key, v)}
                              className="h-3.5 w-3.5 cursor-pointer rounded accent-blue-600"
                            />
                            <span className="font-medium text-[var(--foreground)]">
                              {def.names ? (def.names[v] ?? v) : v}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : def.key === "month" ? (
                      /* 월: 체크박스 */
                      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-2 sm:grid-cols-3">
                        {Array.from({ length: def.max - def.min + 1 }, (_, i) => def.min + i).map((v) => (
                          <label
                            key={v}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-[var(--surface)]"
                          >
                            <input
                              type="checkbox"
                              checked={fields[def.key].specific.includes(v)}
                              onChange={() => toggleSpecific(def.key, v)}
                              className="h-3.5 w-3.5 cursor-pointer rounded accent-blue-600"
                            />
                            <span className="font-medium text-[var(--foreground)]">
                              {v}월 ({def.names?.[v] ?? v})
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      /* 초/분/시/일/연도: 텍스트 입력 */
                      <div className="flex flex-col gap-1.5">
                        <Input
                          value={fields[def.key].specific.sort((a, b) => a - b).join(", ")}
                          onChange={(e) => {
                            const vals = e.target.value
                              .split(",")
                              .map((s) => parseInt(s.trim()))
                              .filter((n) => !isNaN(n) && n >= def.min && n <= def.max);
                            updateField(def.key, { specific: vals });
                          }}
                          placeholder={`${def.min}~${def.max} 쉼표로 구분 (예: 0, 15, 30)`}
                          className={`${inputClass} w-full font-mono text-xs`}
                          aria-label={`${def.label} specific values`}
                        />
                        <p className="text-[10px] text-[var(--muted)]">범위: {def.min}~{def.max}</p>
                      </div>
                    )
                  )}

                  {fields[def.key].mode === "range" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={def.min}
                        max={def.max}
                        value={fields[def.key].rangeStart}
                        onChange={(e) => updateField(def.key, { rangeStart: Number(e.target.value) })}
                        className={`${inputClass} w-20`}
                        aria-label={`${def.label} range start`}
                      />
                      <span className="text-xs text-[var(--muted)]">~</span>
                      <Input
                        type="number"
                        min={def.min}
                        max={def.max}
                        value={fields[def.key].rangeEnd}
                        onChange={(e) => updateField(def.key, { rangeEnd: Number(e.target.value) })}
                        className={`${inputClass} w-20`}
                        aria-label={`${def.label} range end`}
                      />
                    </div>
                  )}

                  {fields[def.key].mode === "interval" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={def.min}
                        max={def.max}
                        value={fields[def.key].intervalBase}
                        onChange={(e) => updateField(def.key, { intervalBase: Number(e.target.value) })}
                        className={`${inputClass} w-20`}
                        aria-label={`${def.label} interval base`}
                      />
                      <span className="text-xs text-[var(--muted)]">부터 매</span>
                      <Input
                        type="number"
                        min={1}
                        value={fields[def.key].intervalStep}
                        onChange={(e) => updateField(def.key, { intervalStep: Number(e.target.value) })}
                        className={`${inputClass} w-20`}
                        aria-label={`${def.label} interval step`}
                      />
                      <span className="text-xs text-[var(--muted)]">마다</span>
                    </div>
                  )}

                  {platform === "jenkins" && fields[def.key].mode === "hash" && (
                    <p className="text-xs text-[var(--muted)]">Jenkins가 빌드별로 자동 분산합니다.</p>
                  )}

                  {platform === "jenkins" && fields[def.key].mode === "hashInterval" && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--muted)]">H /</span>
                      <Input
                        type="number"
                        min={1}
                        value={fields[def.key].intervalStep}
                        onChange={(e) => updateField(def.key, { intervalStep: Number(e.target.value) })}
                        className={`${inputClass} w-20`}
                        aria-label={`${def.label} hash interval`}
                      />
                    </div>
                  )}

                  {platform === "jenkins" && fields[def.key].mode === "hashRange" && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--muted)]">H(</span>
                      <Input
                        type="number"
                        min={def.min}
                        max={def.max}
                        value={fields[def.key].rangeStart}
                        onChange={(e) => updateField(def.key, { rangeStart: Number(e.target.value) })}
                        className={`${inputClass} w-20`}
                        aria-label={`${def.label} hash range start`}
                      />
                      <span className="font-mono text-xs text-[var(--muted)]">-</span>
                      <Input
                        type="number"
                        min={def.min}
                        max={def.max}
                        value={fields[def.key].rangeEnd}
                        onChange={(e) => updateField(def.key, { rangeEnd: Number(e.target.value) })}
                        className={`${inputClass} w-20`}
                        aria-label={`${def.label} hash range end`}
                      />
                      <span className="font-mono text-xs text-[var(--muted)]">)</span>
                    </div>
                  )}
                </ToolCard>
              ))}
            </div>
          )}
        </div>

        {/* 결과 영역 */}
        <div className="flex flex-col gap-5">
          {/* 생성된 표현식 */}
          <ToolCard>
            <div className="flex items-center justify-between">
              <ToolBadge>Generated Expression</ToolBadge>
              <ToolActionButton type="button" onClick={handleCopy} disabled={!activeExpr.trim()}>
                {isCopied() ? "Copied!" : "Copy"}
              </ToolActionButton>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-4 py-4">
              <code className="flex-1 text-lg font-bold text-[var(--foreground)]">{activeExpr || "* * * * *"}</code>
            </div>
            <p className="text-xs text-[var(--muted)]">{description}</p>
          </ToolCard>

          {/* 필드 분해 */}
          {!manualMode && (
            <ToolCard>
              <ToolBadge>Field Breakdown</ToolBadge>
              <div className="flex flex-col gap-1.5">
                {currentDefs.map((def, i) => {
                  const parts = activeExpr.split(/\s+/);
                  return (
                    <div
                      key={def.key}
                      className="flex items-center justify-between rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 py-2"
                    >
                      <span className="text-xs text-[var(--muted)]">{def.label}</span>
                      <code className="text-xs font-semibold text-[var(--foreground)]">{parts[i] ?? "*"}</code>
                    </div>
                  );
                })}
              </div>
            </ToolCard>
          )}

          {/* 다음 실행 시간 */}
          <ToolCard>
            <ToolBadge>Next Executions</ToolBadge>
            {platform === "jenkins" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)]">해시 시드</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={hashSeed}
                    onChange={(e) => setHashSeed(Number(e.target.value))}
                    className={`${inputClass} w-20`}
                    aria-label="해시 시드값"
                  />
                  <span className="text-[10px] text-[var(--muted)]">실제 값은 잡 이름에 따라 다릅니다</span>
                </div>
              </div>
            )}
            {nextExecutions.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {nextExecutions.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 py-2"
                  >
                    <span className="text-xs text-[var(--muted)]">#{i + 1}</span>
                    <code className="text-xs font-semibold text-[var(--foreground)]">
                      {d.toLocaleString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        weekday: "short",
                      })}
                    </code>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)]">
                {activeExpr.trim() ? "다음 실행 시간을 계산할 수 없습니다." : "표현식을 생성하면 다음 실행 시간을 표시합니다."}
              </p>
            )}
          </ToolCard>

          {/* 플랫폼 참고 */}
          <ToolCard>
            <ToolBadge>Reference</ToolBadge>
            <div className="flex flex-col gap-2 text-xs text-[var(--muted)]">
              {platform === "linux" && (
                <>
                  <p className="font-semibold text-[var(--foreground)]">Linux Cron (5필드)</p>
                  <code className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 font-mono">분 시 일 월 요일</code>
                  <p>* = 모든 값, , = 목록, - = 범위, / = 간격</p>
                </>
              )}
              {platform === "jenkins" && (
                <>
                  <p className="font-semibold text-[var(--foreground)]">Jenkins Cron (5필드 + H)</p>
                  <code className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 font-mono">분 시 일 월 요일</code>
                  <p>H = 해시 기반 분산 (빌드 부하 분산 용도)</p>
                  <p>H/15 = 해시 기반 15분 간격</p>
                </>
              )}
              {platform === "spring" && (
                <>
                  <p className="font-semibold text-[var(--foreground)]">Spring Cron (6필드)</p>
                  <code className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 font-mono">초 분 시 일 월 요일</code>
                  <p>@Scheduled(cron = &quot;0 0 12 * * *&quot;)</p>
                </>
              )}
              {platform === "quartz" && (
                <>
                  <p className="font-semibold text-[var(--foreground)]">Quartz Cron (7필드)</p>
                  <code className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 font-mono">초 분 시 일 월 요일 연도</code>
                  <p>? = 미지정 (일/요일 중 하나에 사용)</p>
                  <p>요일: 1(SUN) ~ 7(SAT)</p>
                </>
              )}
            </div>
          </ToolCard>
        </div>
      </div>
    </ToolPage>
  );
}

