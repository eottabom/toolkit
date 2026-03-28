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

export const COMMON_TIME_ZONES = [
    "UTC",
    "Asia/Seoul",
    "Asia/Tokyo",
    "America/Los_Angeles",
    "America/New_York",
    "Europe/London",
    "Europe/Paris",
    "Australia/Sydney",
] as const;

export function getTimeZoneList(browserTimeZone: string): string[] {
    const intlWithSupported = Intl as typeof Intl & {
        supportedValuesOf?: (key: "timeZone") => string[];
    };
    const supported = intlWithSupported.supportedValuesOf?.("timeZone") ?? [];
    const merged = [...COMMON_TIME_ZONES, browserTimeZone, ...supported];
    const unique = [...new Set(merged)];
    const commonSet = new Set(COMMON_TIME_ZONES);

    return unique.sort((left, right) => {
        const leftCommon = commonSet.has(left as (typeof COMMON_TIME_ZONES)[number]);
        const rightCommon = commonSet.has(right as (typeof COMMON_TIME_ZONES)[number]);

        if (leftCommon && !rightCommon) {
            return -1;
        }

        if (!leftCommon && rightCommon) {
            return 1;
        }

        return left.localeCompare(right);
    });
}

export function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

export function parseDateTimeInput(value: string): DateTimeParts | null {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);

    if (!match) {
        return null;
    }

    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: Number(match[4]),
        minute: Number(match[5]),
        second: Number(match[6] ?? "0"),
    };
}

export function parseUtcOffsetMinutes(zone: string): number | null {
    const raw = zone.trim().toUpperCase();
    const normalized = raw.startsWith("UTC") ? raw : `UTC${raw}`;
    const match = normalized.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);

    if (!match) {
        return null;
    }

    const sign = match[1] === "+" ? 1 : -1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? "0");

    if (hours > 14 || minutes > 59) {
        return null;
    }

    return sign * (hours * 60 + minutes);
}

export function getDatePartsByFixedOffset(date: Date, offsetMinutes: number): DateTimeParts {
    const shifted = new Date(date.getTime() + offsetMinutes * 60_000);

    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
        hour: shifted.getUTCHours(),
        minute: shifted.getUTCMinutes(),
        second: shifted.getUTCSeconds(),
    };
}

export function toUtcDateFromUtcInput(value: string): Date | null {
    const raw = value.trim();

    if (!raw) {
        return null;
    }

    const parsedDirect = new Date(raw);

    if (!Number.isNaN(parsedDirect.getTime()) && /[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) {
        return parsedDirect;
    }

    const parsed = parseDateTimeInput(value);

    if (!parsed) {
        return null;
    }

    return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, parsed.second));
}

export function getOffsetMinutes(timeZone: string, date: Date): number {
    const name = new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "shortOffset",
    })
        .formatToParts(date)
        .find((part) => part.type === "timeZoneName")?.value;

    if (!name || name === "GMT" || name === "UTC") {
        return 0;
    }

    const match = name.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);

    if (!match) {
        return 0;
    }

    const sign = match[1] === "+" ? 1 : -1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? "0");

    return sign * (hours * 60 + minutes);
}

export function toUtcDateFromZonedInput(value: string, timeZone: string): Date | null {
    const parsed = parseDateTimeInput(value);

    if (!parsed) {
        return null;
    }

    const fixedOffset = parseUtcOffsetMinutes(timeZone);

    if (fixedOffset !== null) {
        const utcMs = Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, parsed.second)
            - fixedOffset * 60_000;
        return new Date(utcMs);
    }

    let utcMs = Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, parsed.second);

    for (let i = 0; i < 3; i += 1) {
        const offset = getOffsetMinutes(timeZone, new Date(utcMs));
        const corrected = Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, parsed.second)
            - offset * 60_000;

        if (corrected === utcMs) {
            break;
        }

        utcMs = corrected;
    }

    return new Date(utcMs);
}

export function getDatePartsInZone(date: Date, timeZone: string): DateTimeParts {
    const fixedOffset = parseUtcOffsetMinutes(timeZone);

    if (fixedOffset !== null) {
        return getDatePartsByFixedOffset(date, fixedOffset);
    }

    const map = new Map<string, string>();
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(date);

    parts.forEach((part) => {
        map.set(part.type, part.value);
    });

    return {
        year: Number(map.get("year")),
        month: Number(map.get("month")),
        day: Number(map.get("day")),
        hour: Number(map.get("hour")),
        minute: Number(map.get("minute")),
        second: Number(map.get("second")),
    };
}

export function formatDateTime(parts: DateTimeParts): string {
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
}

export function formatDateTimeInput(parts: DateTimeParts): string {
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
}

export function getOffsetLabel(timeZone: string, date: Date): string {
    const fixedOffset = parseUtcOffsetMinutes(timeZone);
    const offset = fixedOffset ?? getOffsetMinutes(timeZone, date);
    const sign = offset >= 0 ? "+" : "-";
    const absolute = Math.abs(offset);
    const hours = Math.floor(absolute / 60);
    const minutes = absolute % 60;

    return `UTC${sign}${pad2(hours)}:${pad2(minutes)}`;
}

export function nowUtcInput(): string {
    return `${new Date().toISOString().slice(0, 19)}Z`;
}

export function nowUtcPickerInput(): string {
    return new Date().toISOString().slice(0, 19);
}

export function nowInZoneInput(timeZone: string): string {
    return formatDateTimeInput(getDatePartsInZone(new Date(), timeZone));
}

export function parseUnixTimestampInput(value: string): Date | null {
    const raw = value.trim();

    if (!raw || !/^-?\d+$/.test(raw)) {
        return null;
    }

    const parsed = Number(raw);

    if (!Number.isFinite(parsed)) {
        return null;
    }

    const absolute = Math.abs(parsed);
    const milliseconds = absolute < 100_000_000_000 ? parsed * 1000 : parsed;
    const date = new Date(milliseconds);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}
