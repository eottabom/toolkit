export type DateTimeParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};
export type TimeZoneOption = {
    value: string;
    label: string;
};
export declare const COMMON_TIME_ZONES: readonly ["UTC", "Asia/Seoul", "Asia/Tokyo", "America/Los_Angeles", "America/New_York", "Europe/London", "Europe/Paris", "Australia/Sydney"];
export declare function getTimeZoneList(browserTimeZone: string): string[];
export declare function pad2(value: number): string;
export declare function parseDateTimeInput(value: string): DateTimeParts | null;
export declare function parseUtcOffsetMinutes(zone: string): number | null;
export declare function getDatePartsByFixedOffset(date: Date, offsetMinutes: number): DateTimeParts;
export declare function toUtcDateFromUtcInput(value: string): Date | null;
export declare function getOffsetMinutes(timeZone: string, date: Date): number;
export declare function toUtcDateFromZonedInput(value: string, timeZone: string): Date | null;
export declare function getDatePartsInZone(date: Date, timeZone: string): DateTimeParts;
export declare function formatDateTime(parts: DateTimeParts): string;
export declare function formatDateTimeInput(parts: DateTimeParts): string;
export declare function getOffsetLabel(timeZone: string, date: Date): string;
export declare function nowUtcInput(): string;
export declare function nowUtcPickerInput(): string;
export declare function nowInZoneInput(timeZone: string): string;
export declare function parseUnixTimestampInput(value: string): Date | null;
//# sourceMappingURL=index.d.ts.map