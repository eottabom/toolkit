export type CronPlatform = "linux" | "jenkins" | "spring" | "quartz";

export type FieldKey = "second" | "minute" | "hour" | "day" | "month" | "weekday" | "year";

export type FieldMode = "every" | "specific" | "range" | "interval" | "hash" | "hashInterval" | "hashRange";

export type FieldState = {
    mode: FieldMode;
    specific: number[];
    rangeStart: number;
    rangeEnd: number;
    intervalBase: number;
    intervalStep: number;
};

export type FieldDef = {
    key: FieldKey;
    label: string;
    min: number;
    max: number;
    names?: string[];
};

export type Preset = {
    label: string;
    desc: string;
    platforms: CronPlatform[];
    apply: (platform: CronPlatform) => Record<FieldKey, FieldState>;
};

export const PLATFORMS: Array<{ value: CronPlatform; label: string; desc: string }> = [
    { value: "linux", label: "Linux", desc: "5필드: 분 시 일 월 요일" },
    { value: "jenkins", label: "Jenkins", desc: "5필드 + H (해시) 지원" },
    { value: "spring", label: "Spring", desc: "6필드: 초 분 시 일 월 요일" },
    { value: "quartz", label: "Quartz", desc: "7필드: 초 분 시 일 월 요일 연도" },
];

const COMMON_FIELDS: FieldDef[] = [
    { key: "minute", label: "분 (Minute)", min: 0, max: 59 },
    { key: "hour", label: "시 (Hour)", min: 0, max: 23 },
    { key: "day", label: "일 (Day)", min: 1, max: 31 },
    { key: "month", label: "월 (Month)", min: 1, max: 12, names: ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] },
    { key: "weekday", label: "요일 (Weekday)", min: 0, max: 6, names: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] },
];

export const SECOND_DEF: FieldDef = { key: "second", label: "초 (Second)", min: 0, max: 59 };
export const YEAR_DEF: FieldDef = { key: "year", label: "연도 (Year)", min: 2024, max: 2099 };

export const ALL_FIELD_DEFS: Record<FieldKey, FieldDef> = [
    SECOND_DEF,
    ...COMMON_FIELDS,
    YEAR_DEF,
].reduce((acc, def) => {
    acc[def.key] = def;
    return acc;
}, {} as Record<FieldKey, FieldDef>);

export const FIELD_DEFS: Record<CronPlatform, FieldDef[]> = {
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

export function defaultField(def: FieldDef): FieldState {
    return {
        mode: "every",
        specific: [],
        rangeStart: def.min,
        rangeEnd: def.max,
        intervalBase: def.min,
        intervalStep: 1,
    };
}

export function makeFields(
    platform: CronPlatform,
    overrides: Partial<Record<FieldKey, Partial<FieldState>>>,
): Record<FieldKey, FieldState> {
    const result = {} as Record<FieldKey, FieldState>;

    for (const def of FIELD_DEFS[platform]) {
        result[def.key] = { ...defaultField(def), ...overrides[def.key] };
    }

    for (const key of ["second", "minute", "hour", "day", "month", "weekday", "year"] as FieldKey[]) {
        if (!result[key]) {
            result[key] = defaultField(ALL_FIELD_DEFS[key]);
        }
    }

    return result;
}

function specificField(values: number[]): Partial<FieldState> {
    return {
        mode: "specific",
        specific: values,
        rangeStart: 0,
        rangeEnd: 59,
        intervalBase: 0,
        intervalStep: 1,
    };
}

function hashField(): Partial<FieldState> {
    return {
        mode: "hash",
        specific: [],
        rangeStart: 0,
        rangeEnd: 59,
        intervalBase: 0,
        intervalStep: 1,
    };
}

export const PRESETS: Preset[] = [
    {
        label: "매분",
        desc: "* * * * *",
        platforms: ["linux", "spring", "quartz"],
        apply: (platform) => makeFields(platform, {}),
    },
    {
        label: "매시 정각",
        desc: "매시간 0분에 실행",
        platforms: ["linux", "spring", "quartz"],
        apply: (platform) => makeFields(platform, { minute: specificField([0]), second: specificField([0]) }),
    },
    {
        label: "매일 자정",
        desc: "매일 00:00에 실행",
        platforms: ["linux", "spring", "quartz"],
        apply: (platform) => makeFields(platform, { minute: specificField([0]), hour: { ...specificField([0]), rangeEnd: 23 }, second: specificField([0]) }),
    },
    {
        label: "매주 월요일",
        desc: "매주 월요일 00:00에 실행",
        platforms: ["linux", "spring", "quartz"],
        apply: (platform) => {
            const weekdayValue = platform === "quartz" ? 2 : 1;

            return makeFields(platform, {
                minute: specificField([0]),
                hour: { ...specificField([0]), rangeEnd: 23 },
                weekday: {
                    ...specificField([weekdayValue]),
                    rangeStart: platform === "quartz" ? 1 : 0,
                    rangeEnd: platform === "quartz" ? 7 : 6,
                    intervalBase: platform === "quartz" ? 1 : 0,
                },
                second: specificField([0]),
            });
        },
    },
    {
        label: "5분마다",
        desc: "매 5분 간격으로 실행",
        platforms: ["linux", "spring", "quartz"],
        apply: (platform) => makeFields(platform, {
            minute: { mode: "interval", specific: [], rangeStart: 0, rangeEnd: 59, intervalBase: 0, intervalStep: 5 },
            second: specificField([0]),
        }),
    },
    {
        label: "H (분산)",
        desc: "H * * * * — Jenkins가 알아서 분산",
        platforms: ["jenkins"],
        apply: (platform) => makeFields(platform, { minute: hashField() }),
    },
    {
        label: "H/15 (15분 분산)",
        desc: "H/15 * * * *",
        platforms: ["jenkins"],
        apply: (platform) => makeFields(platform, {
            minute: { mode: "hashInterval", specific: [], rangeStart: 0, rangeEnd: 59, intervalBase: 0, intervalStep: 15 },
        }),
    },
    {
        label: "매일 분산",
        desc: "H H * * * — 하루 한 번 분산 실행",
        platforms: ["jenkins"],
        apply: (platform) => makeFields(platform, { minute: hashField(), hour: { ...hashField(), rangeEnd: 23 } }),
    },
    {
        label: "평일 분산",
        desc: "H H * * 1-5 — 평일 하루 한 번",
        platforms: ["jenkins"],
        apply: (platform) => makeFields(platform, {
            minute: hashField(),
            hour: { ...hashField(), rangeEnd: 23 },
            weekday: { mode: "range", specific: [], rangeStart: 1, rangeEnd: 5, intervalBase: 0, intervalStep: 1 },
        }),
    },
    {
        label: "업무시간 분산",
        desc: "H H(9-17) * * 1-5 — 업무시간 내 분산",
        platforms: ["jenkins"],
        apply: (platform) => makeFields(platform, {
            minute: hashField(),
            hour: { mode: "hashRange", specific: [], rangeStart: 9, rangeEnd: 17, intervalBase: 0, intervalStep: 1 },
            weekday: { mode: "range", specific: [], rangeStart: 1, rangeEnd: 5, intervalBase: 0, intervalStep: 1 },
        }),
    },
];

export function fieldToExpression(field: FieldState, def: FieldDef): string {
    switch (field.mode) {
        case "every":
            return "*";
        case "specific":
            return field.specific.length === 0 ? "*" : [...field.specific].sort((left, right) => left - right).join(",");
        case "range":
            return `${field.rangeStart}-${field.rangeEnd}`;
        case "interval":
            return field.intervalBase === def.min ? `*/${field.intervalStep}` : `${field.intervalBase}/${field.intervalStep}`;
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

export function buildExpression(fields: Record<FieldKey, FieldState>, platform: CronPlatform): string {
    return FIELD_DEFS[platform].map((def) => fieldToExpression(fields[def.key], def)).join(" ");
}

export function describeExpression(fields: Record<FieldKey, FieldState>, platform: CronPlatform): string {
    const parts: string[] = [];

    for (const def of FIELD_DEFS[platform]) {
        const field = fields[def.key];

        if (field.mode === "every") {
            continue;
        }

        const label = def.label.split(" (")[0];

        if (field.mode === "specific" && field.specific.length > 0) {
            const values = [...field.specific].sort((left, right) => left - right);
            const valueText = def.names
                ? values.map((value) => def.names?.[value] ?? String(value)).join(", ")
                : values.join(", ");
            parts.push(`${label}: ${valueText}`);
            continue;
        }

        if (field.mode === "range") {
            parts.push(`${label}: ${field.rangeStart}~${field.rangeEnd}`);
            continue;
        }

        if (field.mode === "interval") {
            if (field.intervalBase === def.min) {
                parts.push(`${label}: 매 ${field.intervalStep}${label === "초" || label === "분" ? label : ""}마다`);
            } else {
                parts.push(`${label}: ${field.intervalBase}부터 매 ${field.intervalStep}마다`);
            }
            continue;
        }

        if (field.mode === "hash") {
            parts.push(`${label}: H (해시 분산)`);
            continue;
        }

        if (field.mode === "hashInterval") {
            parts.push(`${label}: H/${field.intervalStep} (해시 간격)`);
            continue;
        }

        if (field.mode === "hashRange") {
            parts.push(`${label}: H(${field.rangeStart}-${field.rangeEnd}) (해시 범위)`);
        }
    }

    return parts.length === 0 ? "매분 실행" : parts.join(" · ");
}

export function validateExpression(expr: string, platform: CronPlatform): {
    valid: boolean;
    errors: string[];
} {
    const parts = expr.trim().split(/\s+/);
    const defs = FIELD_DEFS[platform];
    const errors: string[] = [];

    if (parts.length !== defs.length) {
        errors.push(`필드 수가 맞지 않습니다. ${platform} 형식은 ${defs.length}개 필드가 필요합니다. (입력: ${parts.length}개)`);
        return { valid: false, errors };
    }

    for (let index = 0; index < defs.length; index += 1) {
        const part = parts[index];
        const def = defs[index];
        const label = def.label.split(" (")[0];

        if (part === "*") {
            continue;
        }

        if (platform === "jenkins") {
            if (part === "H") {
                continue;
            }

            const hashInterval = part.match(/^H\/(\d+)$/);

            if (hashInterval) {
                const step = Number(hashInterval[1]);
                if (step < 1) {
                    errors.push(`${label}: 간격은 1 이상이어야 합니다.`);
                }
                continue;
            }

            const hashRange = part.match(/^H\((\d+)-(\d+)\)$/);

            if (hashRange) {
                const start = Number(hashRange[1]);
                const end = Number(hashRange[2]);

                if (start < def.min || start > def.max) {
                    errors.push(`${label}: 시작값 ${start}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
                }

                if (end < def.min || end > def.max) {
                    errors.push(`${label}: 끝값 ${end}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
                }

                if (start > end) {
                    errors.push(`${label}: 시작값이 끝값보다 큽니다.`);
                }

                continue;
            }

            const hashRangeInterval = part.match(/^H\((\d+)-(\d+)\)\/(\d+)$/);

            if (hashRangeInterval) {
                const start = Number(hashRangeInterval[1]);
                const end = Number(hashRangeInterval[2]);
                const step = Number(hashRangeInterval[3]);

                if (start < def.min || start > def.max) {
                    errors.push(`${label}: 시작값 ${start}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
                }

                if (end < def.min || end > def.max) {
                    errors.push(`${label}: 끝값 ${end}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
                }

                if (step < 1) {
                    errors.push(`${label}: 간격은 1 이상이어야 합니다.`);
                }

                continue;
            }

            if (/^\d+-\d+$/.test(part)) {
                const [start, end] = part.split("-").map(Number);

                if (start < def.min || start > def.max) {
                    errors.push(`${label}: 시작값 ${start}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
                }

                if (end < def.min || end > def.max) {
                    errors.push(`${label}: 끝값 ${end}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
                }

                if (start > end) {
                    errors.push(`${label}: 시작값이 끝값보다 큽니다.`);
                }

                continue;
            }

            errors.push(`${label}: '${part}' — Jenkins에서는 H 기반 표현식을 사용하세요. (H, H/n, H(n-m))`);
            continue;
        }

        if (/^\*\/\d+$/.test(part)) {
            const step = Number(part.split("/")[1]);
            if (step < 1) {
                errors.push(`${label}: 간격은 1 이상이어야 합니다.`);
            }
            continue;
        }

        if (/^\d+\/\d+$/.test(part)) {
            const [base, step] = part.split("/").map(Number);

            if (base < def.min || base > def.max) {
                errors.push(`${label}: 시작값 ${base}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
            }

            if (step < 1) {
                errors.push(`${label}: 간격은 1 이상이어야 합니다.`);
            }

            continue;
        }

        if (/^\d+-\d+$/.test(part)) {
            const [start, end] = part.split("-").map(Number);

            if (start < def.min || start > def.max) {
                errors.push(`${label}: 시작값 ${start}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
            }

            if (end < def.min || end > def.max) {
                errors.push(`${label}: 끝값 ${end}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
            }

            if (start > end) {
                errors.push(`${label}: 시작값이 끝값보다 큽니다.`);
            }

            continue;
        }

        if (/^[\d,]+$/.test(part)) {
            const values = part.split(",").map(Number);

            for (const value of values) {
                if (value < def.min || value > def.max) {
                    errors.push(`${label}: 값 ${value}이(가) 범위(${def.min}-${def.max})를 벗어납니다.`);
                }
            }

            continue;
        }

        if (platform === "quartz" && part === "?" && (def.key === "day" || def.key === "weekday")) {
            continue;
        }

        if (def.names) {
            const upper = part.toUpperCase();
            const names = upper.split(",");
            const allValid = names.every((name) => def.names?.includes(name) || /^\d+$/.test(name));

            if (allValid) {
                continue;
            }
        }

        errors.push(`${label}: '${part}' 형식을 인식할 수 없습니다.`);
    }

    return { valid: errors.length === 0, errors };
}

export function resolveJenkinsH(expr: string, hashSeed: number, defs: FieldDef[]): string {
    const parts = expr.trim().split(/\s+/);

    if (parts.length !== defs.length) {
        return expr;
    }

    const resolved = parts.map((part, index) => {
        const def = defs[index];
        const range = def.max - def.min + 1;
        const hashValue = def.min + (hashSeed % range);

        if (part === "H") {
            return String(hashValue);
        }

        const hashInterval = part.match(/^H\/(\d+)$/);

        if (hashInterval) {
            const step = Number(hashInterval[1]);
            return `${hashValue % step}/${step}`;
        }

        const hashRange = part.match(/^H\((\d+)-(\d+)\)$/);

        if (hashRange) {
            const start = Number(hashRange[1]);
            const end = Number(hashRange[2]);
            const rangeSize = end - start + 1;
            return String(start + (hashSeed % rangeSize));
        }

        const hashRangeInterval = part.match(/^H\((\d+)-(\d+)\)\/(\d+)$/);

        if (hashRangeInterval) {
            const start = Number(hashRangeInterval[1]);
            const end = Number(hashRangeInterval[2]);
            const step = Number(hashRangeInterval[3]);
            const base = start + (hashSeed % (end - start + 1));
            return `${base % step}/${step}`;
        }

        return part;
    });

    return resolved.join(" ");
}

export function getNextExecutions(
    expr: string,
    platform: CronPlatform,
    count: number,
    hashSeed?: number,
): Date[] {
    const defs = FIELD_DEFS[platform];
    const resolvedExpr = platform === "jenkins" && hashSeed !== undefined
        ? resolveJenkinsH(expr, hashSeed, defs)
        : expr;
    const parts = resolvedExpr.trim().split(/\s+/);

    if (parts.length !== defs.length) {
        return [];
    }

    function parseField(part: string, def: FieldDef): number[] | null {
        if (part === "*" || part === "?") {
            return null;
        }

        if (/^\*\/(\d+)$/.test(part)) {
            const step = Number(part.split("/")[1]);
            const values: number[] = [];

            for (let value = def.min; value <= def.max; value += step) {
                values.push(value);
            }

            return values;
        }

        if (/^(\d+)\/(\d+)$/.test(part)) {
            const [base, step] = part.split("/").map(Number);
            const values: number[] = [];

            for (let value = base; value <= def.max; value += step) {
                values.push(value);
            }

            return values;
        }

        if (/^(\d+)-(\d+)$/.test(part)) {
            const [start, end] = part.split("-").map(Number);
            const values: number[] = [];

            for (let value = start; value <= end; value += 1) {
                values.push(value);
            }

            return values;
        }

        if (/^[\d,]+$/.test(part)) {
            return part.split(",").map(Number);
        }

        return null;
    }

    const fieldMap: Partial<Record<FieldKey, number[] | null>> = {};

    for (let index = 0; index < defs.length; index += 1) {
        fieldMap[defs[index].key] = parseField(parts[index], defs[index]);
    }

    const matches = (value: number, allowed: number[] | null | undefined): boolean =>
        allowed == null || allowed.includes(value);

    const results: Date[] = [];
    const now = new Date();
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0);
    const maxIterations = 525960;

    for (let index = 0; index < maxIterations && results.length < count; index += 1) {
        const minute = cursor.getMinutes();
        const hour = cursor.getHours();
        const day = cursor.getDate();
        const month = cursor.getMonth() + 1;
        const weekday = platform === "quartz" ? cursor.getDay() + 1 : cursor.getDay();
        const year = cursor.getFullYear();

        let match = true;

        if (fieldMap.second !== undefined) {
            match = match && matches(0, fieldMap.second);
        }

        match = match && matches(minute, fieldMap.minute);
        match = match && matches(hour, fieldMap.hour);
        match = match && matches(day, fieldMap.day);
        match = match && matches(month, fieldMap.month);
        match = match && matches(weekday, fieldMap.weekday);

        if (platform === "quartz" && fieldMap.year !== undefined) {
            match = match && matches(year, fieldMap.year);
        }

        if (match) {
            results.push(new Date(cursor));
        }

        cursor.setMinutes(cursor.getMinutes() + 1);
    }

    return results;
}
