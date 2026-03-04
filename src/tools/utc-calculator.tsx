"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ToolActionButton,
  ToolBadge,
  ToolCard,
  ToolHeader,
  ToolInfoPanel,
  ToolInput,
  ToolOutput,
  ToolPage,
} from "@/components/tool-ui";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

import type { ToolItem } from "@/lib/tools";

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type TimeZoneOption = {
  value: string;
  label: string;
};

const COMMON_TIME_ZONES = [
  "UTC",
  "Asia/Seoul",
  "Asia/Tokyo",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney",
] as const;

function getTimeZoneList(browserTimeZone: string) {
  const intlWithSupported = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  const supported = intlWithSupported.supportedValuesOf?.("timeZone") ?? [];
  const merged = [...COMMON_TIME_ZONES, browserTimeZone, ...supported];
  const unique = [...new Set(merged)];
  const commonSet = new Set(COMMON_TIME_ZONES);
  return unique.sort((a, b) => {
    const aCommon = commonSet.has(a as (typeof COMMON_TIME_ZONES)[number]);
    const bCommon = commonSet.has(b as (typeof COMMON_TIME_ZONES)[number]);
    if (aCommon && !bCommon) return -1;
    if (!aCommon && bCommon) return 1;
    return a.localeCompare(b);
  });
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateTimeInput(value: string): DateTimeParts | null {
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

function parseUtcOffsetMinutes(zone: string): number | null {
  const raw = zone.trim().toUpperCase();
  const normalized = raw.startsWith("UTC") ? raw : `UTC${raw}`;
  const match = normalized.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return null;
  }
  const sign = match[1] === "+" ? 1 : -1;
  const hh = Number(match[2]);
  const mm = Number(match[3] ?? "0");
  if (hh > 14 || mm > 59) {
    return null;
  }
  return sign * (hh * 60 + mm);
}

function getDatePartsByFixedOffset(date: Date, offsetMinutes: number): DateTimeParts {
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

function toUtcDateFromUtcInput(value: string): Date | null {
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

function getOffsetMinutes(timeZone: string, date: Date): number {
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

function toUtcDateFromZonedInput(value: string, timeZone: string): Date | null {
  const parsed = parseDateTimeInput(value);
  if (!parsed) {
    return null;
  }

  const fixedOffset = parseUtcOffsetMinutes(timeZone);
  if (fixedOffset !== null) {
    const utcMs = Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, parsed.second) - fixedOffset * 60_000;
    return new Date(utcMs);
  }

  let utcMs = Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, parsed.second);
  for (let i = 0; i < 3; i += 1) {
    const offset = getOffsetMinutes(timeZone, new Date(utcMs));
    const corrected = Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute, parsed.second) - offset * 60_000;
    if (corrected === utcMs) {
      break;
    }
    utcMs = corrected;
  }

  return new Date(utcMs);
}

function getDatePartsInZone(date: Date, timeZone: string): DateTimeParts {
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

function formatDateTime(parts: DateTimeParts) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
}

function formatDateTimeInput(parts: DateTimeParts) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
}

function getOffsetLabel(timeZone: string, date: Date) {
  const fixedOffset = parseUtcOffsetMinutes(timeZone);
  const offset = fixedOffset ?? getOffsetMinutes(timeZone, date);
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  return `UTC${sign}${pad2(hh)}:${pad2(mm)}`;
}

function nowUtcInput() {
  return `${new Date().toISOString().slice(0, 19)}Z`;
}

function nowUtcPickerInput() {
  return new Date().toISOString().slice(0, 19);
}

function nowInZoneInput(timeZone: string) {
  return formatDateTimeInput(getDatePartsInZone(new Date(), timeZone));
}

function TimeZonePicker({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  options: TimeZoneOption[];
  placeholder: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? options
      : options.filter(
          (option) => option.value.toLowerCase().includes(q) || option.label.toLowerCase().includes(q),
        );

    if (!q) {
      return list;
    }
    const customOffset = parseUtcOffsetMinutes(query);
    if (customOffset === null) {
      return list;
    }
    const sign = customOffset >= 0 ? "+" : "-";
    const abs = Math.abs(customOffset);
    const hh = Math.floor(abs / 60);
    const mm = abs % 60;
    const normalized = `UTC${sign}${pad2(hh)}:${pad2(mm)}`;
    if (list.some((item) => item.value === normalized)) {
      return list;
    }
    return [{ value: normalized, label: `${normalized} (Custom Offset)` }, ...list];
  }, [query, options]);

  useEffect(() => {
    if (!open || !listRef.current) {
      return;
    }
    const node = listRef.current.querySelector<HTMLButtonElement>(`[data-tz-index="${activeIndex}"]`);
    if (node) {
      node.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open || !rootRef.current) {
      return;
    }
    const input = rootRef.current.querySelector("input");
    if (input) {
      input.focus();
      input.select();
    }
  }, [open]);

  const selectedLabel = useMemo(() => {
    const found = options.find((option) => option.value === value);
    return found ? found.label : value;
  }, [options, value]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setQuery("");
          setActiveIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setQuery("");
            setActiveIndex(0);
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
          }
        }}
        className="flex h-9 w-full items-center justify-between rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-3 text-left text-sm text-[var(--foreground)] transition hover:border-[color:var(--card-border-hover)]"
      >
        <span className="truncate font-mono">{selectedLabel || placeholder}</span>
        <span className="ml-2 text-xs text-[var(--muted)]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-[color:var(--card-border)] bg-[var(--surface)] p-2 shadow-[var(--card-shadow)]">
          <ToolInput
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((prev) => Math.max(prev - 1, 0));
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const active = filtered[activeIndex];
                if (active) {
                  onChange(active.value);
                  setOpen(false);
                  setQuery("");
                }
                return;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
              }
            }}
            placeholder={placeholder}
            className="h-8 font-mono text-xs"
          />
          <div ref={listRef} className="mt-2 max-h-48 overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-[var(--muted)]">No matching timezone</div>
            ) : (
              filtered.map((option, index) => (
                <button
                  key={option.value}
                  data-tz-index={index}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full rounded-lg px-2 py-1.5 text-left text-xs text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] ${
                    index === activeIndex ? "bg-[var(--surface-muted)]" : ""
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CurrentTimePanel({
  browserTimeZone,
  timeZoneOptions,
}: {
  browserTimeZone: string;
  timeZoneOptions: TimeZoneOption[];
}) {
  const [nowIso, setNowIso] = useState(new Date().toISOString());
  const [rightZone, setRightZone] = useState("UTC");
  const nowDate = useMemo(() => new Date(nowIso), [nowIso]);
  const browserNowText = useMemo(() => formatDateTime(getDatePartsInZone(nowDate, browserTimeZone)), [nowDate, browserTimeZone]);
  const rightNowText = useMemo(() => formatDateTime(getDatePartsInZone(nowDate, rightZone)), [nowDate, rightZone]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowIso(new Date().toISOString());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <ToolCard>
      <div className="flex items-center justify-between">
        <ToolBadge>Current Time</ToolBadge>
        <ToolActionButton type="button" onClick={() => setNowIso(new Date().toISOString())}>
          Refresh Now
        </ToolActionButton>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-3">
          <p className="text-[11px] font-semibold text-[var(--muted)]">Browser Local</p>
          <p className="mt-1 font-mono text-sm text-[var(--foreground)]">{browserNowText}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            {browserTimeZone} ({getOffsetLabel(browserTimeZone, nowDate)})
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-[var(--muted)]">Selected Timezone</p>
            <p className="text-[11px] text-[var(--muted)]">{getOffsetLabel(rightZone, nowDate)}</p>
          </div>
          <p className="mt-1 font-mono text-sm text-[var(--foreground)]">{rightNowText}</p>
          <div className="mt-2">
            <TimeZonePicker
              value={rightZone}
              onChange={setRightZone}
              options={timeZoneOptions}
              placeholder="Search timezone or type UTC+8"
            />
          </div>
        </div>
      </div>
    </ToolCard>
  );
}

export default function UtcCalculator({ tool }: { tool: ToolItem }) {
  const { copy, isCopied } = useCopyToClipboard();
  const [utcInput, setUtcInput] = useState(nowUtcInput());
  const [utcPickerInput, setUtcPickerInput] = useState(nowUtcPickerInput());
  const [targetZone, setTargetZone] = useState("Asia/Seoul");
  const initialLocalInput = useMemo(() => nowInZoneInput("Asia/Seoul"), []);
  const [localInput, setLocalInput] = useState(initialLocalInput);
  const [localPickerInput, setLocalPickerInput] = useState(initialLocalInput);
  const [sourceZone, setSourceZone] = useState("Asia/Seoul");
  const browserTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);

  const timeZones = useMemo(() => getTimeZoneList(browserTimeZone), [browserTimeZone]);
  const optionsReferenceDate = useMemo(() => new Date(), []);
  const timeZoneOptions = useMemo(
    () =>
      timeZones.map((tz) => ({
        value: tz,
        label: `${tz} (${getOffsetLabel(tz, optionsReferenceDate)})`,
      })),
    [timeZones, optionsReferenceDate],
  );
  const timeZoneSet = useMemo(() => new Set(timeZones), [timeZones]);

  const utcToLocal = useMemo(() => {
    if (!timeZoneSet.has(targetZone) && parseUtcOffsetMinutes(targetZone) === null) {
      return { error: "Invalid target timezone. Use IANA timezone or UTC offset (e.g. UTC+8)." };
    }
    const utcDate = toUtcDateFromUtcInput(utcInput);
    if (!utcDate) {
      return { error: "Invalid UTC input. Use ISO format, e.g. 2026-03-05T12:30:00Z." };
    }
    const localParts = getDatePartsInZone(utcDate, targetZone);
    return {
      localText: formatDateTime(localParts),
      localInputText: formatDateTimeInput(localParts),
      offset: getOffsetLabel(targetZone, utcDate),
      utcIso: utcDate.toISOString(),
      epochMs: String(utcDate.getTime()),
    };
  }, [utcInput, targetZone, timeZoneSet]);

  const localToUtc = useMemo(() => {
    if (!timeZoneSet.has(sourceZone) && parseUtcOffsetMinutes(sourceZone) === null) {
      return { error: "Invalid source timezone. Use IANA timezone or UTC offset (e.g. UTC+8)." };
    }
    const utcDate = toUtcDateFromZonedInput(localInput, sourceZone);
    if (!utcDate) {
      return { error: "Invalid local input. Use YYYY-MM-DDTHH:mm:ss format." };
    }
    const localParts = getDatePartsInZone(utcDate, sourceZone);
    return {
      normalizedLocal: formatDateTime(localParts),
      utcIso: utcDate.toISOString(),
      utcInputText: utcDate.toISOString().slice(0, 19),
      epochMs: String(utcDate.getTime()),
    };
  }, [localInput, sourceZone, timeZoneSet]);

  return (
    <ToolPage>
      <ToolHeader
        title={tool.title}
        description={tool.desc}
        right={<div className="self-start text-xs uppercase tracking-[0.2em] text-[var(--muted)] md:self-auto">UTC + Local</div>}
      />

      <ToolInfoPanel
        icon="T"
        title="UTC Time Calculator"
        description="현재 브라우저 로컬시간과 UTC를 함께 확인하고, 원하는 타임존으로 시간을 변환할 수 있습니다. 드롭다운을 클릭한 뒤 검색해 선택하거나 UTC+8 같은 오프셋을 직접 입력할 수 있습니다."
        chips={["현재 로컬 + UTC", "UTC → Local", "Local → UTC"]}
      />

      <CurrentTimePanel browserTimeZone={browserTimeZone} timeZoneOptions={timeZoneOptions} />

      <section className="grid gap-4 lg:grid-cols-2">
        <ToolCard className="lg:order-2">
          <div className="flex items-center justify-between">
            <ToolBadge>UTC → Local</ToolBadge>
            <ToolActionButton
              type="button"
              onClick={() => {
                setUtcInput(nowUtcInput());
                setUtcPickerInput(nowUtcPickerInput());
              }}
            >
              Now(UTC)
            </ToolActionButton>
          </div>
          <div className="relative">
            <ToolInput
              type="datetime-local"
              step={1}
              value={utcPickerInput}
              onChange={(e) => {
                setUtcPickerInput(e.target.value);
                if (e.target.value) {
                  setUtcInput(`${e.target.value}Z`);
                }
              }}
              className="pr-9 font-mono"
            />
          </div>
          <ToolInput
            value={utcInput}
            onChange={(e) => setUtcInput(e.target.value)}
            onBlur={(e) => {
              const parsed = toUtcDateFromUtcInput(e.target.value);
              if (parsed) {
                setUtcPickerInput(parsed.toISOString().slice(0, 19));
              }
            }}
            placeholder="2026-03-05T12:30:00Z"
            className="font-mono"
          />
          <TimeZonePicker
            value={targetZone}
            onChange={setTargetZone}
            options={timeZoneOptions}
            placeholder="Search timezone or type UTC+8"
          />
          {"error" in utcToLocal ? (
            <p className="text-xs text-[color:var(--error)]">{utcToLocal.error}</p>
          ) : (
            <>
              <ToolOutput>{utcToLocal.localText}</ToolOutput>
              <p className="text-xs text-[var(--muted)]">
                {targetZone} ({utcToLocal.offset})
              </p>
              <div className="flex flex-wrap gap-2">
                <ToolActionButton type="button" onClick={() => copy(utcToLocal.localInputText, "utc-local")}>
                  {isCopied("utc-local") ? "Copied" : "Copy Local"}
                </ToolActionButton>
                <ToolActionButton type="button" onClick={() => copy(utcToLocal.utcIso, "utc-iso")}>
                  {isCopied("utc-iso") ? "Copied" : "Copy UTC ISO"}
                </ToolActionButton>
                <ToolActionButton type="button" onClick={() => copy(utcToLocal.epochMs, "utc-epoch")}>
                  {isCopied("utc-epoch") ? "Copied" : "Copy Epoch"}
                </ToolActionButton>
              </div>
            </>
          )}
        </ToolCard>

        <ToolCard className="lg:order-1">
          <div className="flex items-center justify-between">
            <ToolBadge>Local → UTC</ToolBadge>
            <ToolActionButton
              type="button"
              onClick={() => {
                const nowLocal = nowInZoneInput(sourceZone);
                setLocalInput(nowLocal);
                setLocalPickerInput(nowLocal);
              }}
            >
              Now(Local)
            </ToolActionButton>
          </div>
          <div className="relative">
            <ToolInput
              type="datetime-local"
              step={1}
              value={localPickerInput}
              onChange={(e) => {
                setLocalPickerInput(e.target.value);
                if (e.target.value) {
                  setLocalInput(e.target.value);
                }
              }}
              className="pr-9 font-mono"
            />
          </div>
          <ToolInput
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            onBlur={(e) => {
              const parsed = parseDateTimeInput(e.target.value);
              if (parsed) {
                setLocalPickerInput(formatDateTimeInput(parsed));
              }
            }}
            placeholder="2026-03-05T12:30:00"
            className="font-mono"
          />
          <TimeZonePicker
            value={sourceZone}
            onChange={setSourceZone}
            options={timeZoneOptions}
            placeholder="Search timezone or type UTC+8"
          />
          {"error" in localToUtc ? (
            <p className="text-xs text-[color:var(--error)]">{localToUtc.error}</p>
          ) : (
            <>
              <ToolOutput>{localToUtc.utcIso}</ToolOutput>
              <p className="text-xs text-[var(--muted)]">Normalized Local: {localToUtc.normalizedLocal}</p>
              <div className="flex flex-wrap gap-2">
                <ToolActionButton type="button" onClick={() => copy(localToUtc.utcInputText, "local-utc")}>
                  {isCopied("local-utc") ? "Copied" : "Copy UTC"}
                </ToolActionButton>
                <ToolActionButton type="button" onClick={() => copy(localToUtc.utcIso, "local-iso")}>
                  {isCopied("local-iso") ? "Copied" : "Copy ISO"}
                </ToolActionButton>
                <ToolActionButton type="button" onClick={() => copy(localToUtc.epochMs, "local-epoch")}>
                  {isCopied("local-epoch") ? "Copied" : "Copy Epoch"}
                </ToolActionButton>
              </div>
            </>
          )}
        </ToolCard>
      </section>
    </ToolPage>
  );
}
