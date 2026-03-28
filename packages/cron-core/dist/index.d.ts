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
export declare const PLATFORMS: Array<{
    value: CronPlatform;
    label: string;
    desc: string;
}>;
export declare const SECOND_DEF: FieldDef;
export declare const YEAR_DEF: FieldDef;
export declare const ALL_FIELD_DEFS: Record<FieldKey, FieldDef>;
export declare const FIELD_DEFS: Record<CronPlatform, FieldDef[]>;
export declare function defaultField(def: FieldDef): FieldState;
export declare function makeFields(platform: CronPlatform, overrides: Partial<Record<FieldKey, Partial<FieldState>>>): Record<FieldKey, FieldState>;
export declare const PRESETS: Preset[];
export declare function fieldToExpression(field: FieldState, def: FieldDef): string;
export declare function buildExpression(fields: Record<FieldKey, FieldState>, platform: CronPlatform): string;
export declare function describeExpression(fields: Record<FieldKey, FieldState>, platform: CronPlatform): string;
export declare function validateExpression(expr: string, platform: CronPlatform): {
    valid: boolean;
    errors: string[];
};
export declare function resolveJenkinsH(expr: string, hashSeed: number, defs: FieldDef[]): string;
export declare function getNextExecutions(expr: string, platform: CronPlatform, count: number, hashSeed?: number): Date[];
//# sourceMappingURL=index.d.ts.map