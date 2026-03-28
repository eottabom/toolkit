"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatDateTime,
  formatDateTimeInput,
  getDatePartsInZone,
  getOffsetLabel,
  getTimeZoneList,
  nowInZoneInput,
  nowUtcInput,
  nowUtcPickerInput,
  pad2,
  parseDateTimeInput,
  parseUnixTimestampInput,
  parseUtcOffsetMinutes,
  toUtcDateFromUtcInput,
  toUtcDateFromZonedInput,
  type TimeZoneOption,
} from "@eottabom/datetime-utils";
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
      <div className="flex items-center">
        <ToolBadge>Current Time</ToolBadge>
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
  const browserTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", []);
  const [utcInput, setUtcInput] = useState(() => nowUtcInput());
  const [utcPickerInput, setUtcPickerInput] = useState(() => nowUtcPickerInput());
  const [targetZone, setTargetZone] = useState(browserTimeZone);
  const [localInput, setLocalInput] = useState(() => nowInZoneInput(browserTimeZone));
  const [localPickerInput, setLocalPickerInput] = useState(() => nowInZoneInput(browserTimeZone));
  const [sourceZone, setSourceZone] = useState(browserTimeZone);
  const [unixInput, setUnixInput] = useState(() => String(Math.trunc(Date.now() / 1000)));
  const [unixTargetZone, setUnixTargetZone] = useState(browserTimeZone);
  const [unixLocalInput, setUnixLocalInput] = useState(() => nowInZoneInput(browserTimeZone));
  const [unixSourceZone, setUnixSourceZone] = useState(browserTimeZone);

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

  const unixToDate = useMemo(() => {
    if (!timeZoneSet.has(unixTargetZone) && parseUtcOffsetMinutes(unixTargetZone) === null) {
      return { error: "Invalid target timezone. Use IANA timezone or UTC offset (e.g. UTC+8)." };
    }
    const parsed = parseUnixTimestampInput(unixInput);
    if (!parsed) {
      return { error: "Invalid Unix timestamp. Use seconds(10) or milliseconds(13)." };
    }
    return {
      zonedText: formatDateTime(getDatePartsInZone(parsed, unixTargetZone)),
      iso: parsed.toISOString(),
      epochSec: String(Math.trunc(parsed.getTime() / 1000)),
      epochMs: String(parsed.getTime()),
      offset: getOffsetLabel(unixTargetZone, parsed),
    };
  }, [timeZoneSet, unixInput, unixTargetZone]);

  const dateToUnix = useMemo(() => {
    if (!timeZoneSet.has(unixSourceZone) && parseUtcOffsetMinutes(unixSourceZone) === null) {
      return { error: "Invalid source timezone. Use IANA timezone or UTC offset (e.g. UTC+8)." };
    }
    const utcDate = toUtcDateFromZonedInput(unixLocalInput, unixSourceZone);
    if (!utcDate) {
      return { error: "Invalid local input. Use YYYY-MM-DDTHH:mm:ss format." };
    }
    return {
      iso: utcDate.toISOString(),
      epochSec: String(Math.trunc(utcDate.getTime() / 1000)),
      epochMs: String(utcDate.getTime()),
    };
  }, [timeZoneSet, unixLocalInput, unixSourceZone]);

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
        description="현재 브라우저 로컬시간과 UTC를 함께 확인하고, 원하는 타임존으로 시간을 변환할 수 있습니다. Unix timestamp(초/밀리초)와 날짜/시간의 양방향 변환도 지원합니다."
        chips={["현재 로컬 + UTC", "UTC → Local", "Local → UTC", "Unix ↔ DateTime"]}
      />

      <CurrentTimePanel browserTimeZone={browserTimeZone} timeZoneOptions={timeZoneOptions} />

      <section className="grid gap-4 lg:grid-cols-2">
        <ToolCard className="lg:order-2">
          <div className="flex items-center justify-between">
            <ToolBadge tone="sky">UTC → Local</ToolBadge>
            <ToolActionButton
              type="button"
              tone="purple"
              className="cursor-default"
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
              <ToolOutput className="border-[color:var(--utc-to-local-output-border)] bg-[var(--utc-to-local-output-bg)] font-semibold">
                {utcToLocal.localText}
              </ToolOutput>
              <p className="text-xs text-[var(--muted)]">
                {targetZone} ({utcToLocal.offset})
              </p>
              <div className="flex flex-wrap gap-2">
                <ToolActionButton type="button" tone="teal" onClick={() => copy(utcToLocal.localInputText, "utc-local")}>
                  {isCopied("utc-local") ? "Copied" : "Copy Local"}
                </ToolActionButton>
                <ToolActionButton type="button" tone="teal" onClick={() => copy(utcToLocal.utcIso, "utc-iso")}>
                  {isCopied("utc-iso") ? "Copied" : "Copy UTC ISO"}
                </ToolActionButton>
                <ToolActionButton type="button" tone="teal" onClick={() => copy(utcToLocal.epochMs, "utc-epoch")}>
                  {isCopied("utc-epoch") ? "Copied" : "Copy Epoch"}
                </ToolActionButton>
              </div>
            </>
          )}
        </ToolCard>

        <ToolCard className="lg:order-1">
          <div className="flex items-center justify-between">
            <ToolBadge tone="orange">Local → UTC</ToolBadge>
            <ToolActionButton
              type="button"
              tone="purple"
              className="cursor-default"
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
              <ToolOutput className="border-[color:var(--local-to-utc-output-border)] bg-[var(--local-to-utc-output-bg)] font-semibold">
                {localToUtc.utcIso}
              </ToolOutput>
              <p className="text-xs text-[var(--muted)]">Normalized Local: {localToUtc.normalizedLocal}</p>
              <div className="flex flex-wrap gap-2">
                <ToolActionButton type="button" tone="teal" onClick={() => copy(localToUtc.utcInputText, "local-utc")}>
                  {isCopied("local-utc") ? "Copied" : "Copy UTC"}
                </ToolActionButton>
                <ToolActionButton type="button" tone="teal" onClick={() => copy(localToUtc.utcIso, "local-iso")}>
                  {isCopied("local-iso") ? "Copied" : "Copy ISO"}
                </ToolActionButton>
                <ToolActionButton type="button" tone="teal" onClick={() => copy(localToUtc.epochMs, "local-epoch")}>
                  {isCopied("local-epoch") ? "Copied" : "Copy Epoch"}
                </ToolActionButton>
              </div>
            </>
          )}
        </ToolCard>
      </section>

      <ToolInfoPanel
        icon="U"
        title="Unix Timestamp Converter"
        description="Unix timestamp(초/밀리초)와 날짜/시간을 원하는 타임존 기준으로 상호 변환합니다."
        chips={["Unix → Date/Time", "Date/Time → Unix", "Seconds / Milliseconds"]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <ToolCard>
          <div className="flex items-center justify-between">
            <ToolBadge tone="teal">Unix → Date/Time</ToolBadge>
            <ToolActionButton
              type="button"
              tone="purple"
              className="cursor-default"
              onClick={() => setUnixInput(String(Math.trunc(Date.now() / 1000)))}
            >
              Now(Unix)
            </ToolActionButton>
          </div>
          <ToolInput
            value={unixInput}
            onChange={(e) => setUnixInput(e.target.value)}
            placeholder="1710153600 or 1710153600000"
            className="font-mono"
          />
          <TimeZonePicker
            value={unixTargetZone}
            onChange={setUnixTargetZone}
            options={timeZoneOptions}
            placeholder="Search timezone or type UTC+8"
          />
          {"error" in unixToDate ? (
            <p className="text-xs text-[color:var(--error)]">{unixToDate.error}</p>
          ) : (
            <>
              <ToolOutput className="border-[color:var(--unix-to-date-output-border)] bg-[var(--unix-to-date-output-bg)] font-semibold">
                {unixToDate.zonedText}
              </ToolOutput>
              <p className="text-xs text-[var(--muted)]">
                {unixTargetZone} ({unixToDate.offset})
              </p>
              <div className="flex flex-wrap gap-2">
                <ToolActionButton type="button" tone="teal" onClick={() => copy(unixToDate.iso, "unix-iso")}>
                  {isCopied("unix-iso") ? "Copied" : "Copy ISO"}
                </ToolActionButton>
                <ToolActionButton type="button" tone="teal" onClick={() => copy(unixToDate.epochSec, "unix-sec")}>
                  {isCopied("unix-sec") ? "Copied" : "Copy Sec"}
                </ToolActionButton>
                <ToolActionButton type="button" tone="teal" onClick={() => copy(unixToDate.epochMs, "unix-ms")}>
                  {isCopied("unix-ms") ? "Copied" : "Copy Ms"}
                </ToolActionButton>
              </div>
            </>
          )}
        </ToolCard>

        <ToolCard>
          <div className="flex items-center justify-between">
            <ToolBadge>Date/Time → Unix</ToolBadge>
            <ToolActionButton
              type="button"
              tone="purple"
              className="cursor-default"
              onClick={() => setUnixLocalInput(nowInZoneInput(unixSourceZone))}
            >
              Now(Local)
            </ToolActionButton>
          </div>
          <ToolInput
            type="datetime-local"
            step={1}
            value={unixLocalInput}
            onChange={(e) => setUnixLocalInput(e.target.value)}
            className="pr-9 font-mono"
          />
          <TimeZonePicker
            value={unixSourceZone}
            onChange={setUnixSourceZone}
            options={timeZoneOptions}
            placeholder="Search timezone or type UTC+8"
          />
          {"error" in dateToUnix ? (
            <p className="text-xs text-[color:var(--error)]">{dateToUnix.error}</p>
          ) : (
            <>
              <ToolOutput className="border-[color:var(--date-to-unix-output-border)] bg-[var(--date-to-unix-output-bg)] font-semibold">
                {dateToUnix.epochSec}
              </ToolOutput>
              <p className="text-xs text-[var(--muted)]">Milliseconds: {dateToUnix.epochMs}</p>
              <div className="flex flex-wrap gap-2">
                <ToolActionButton type="button" tone="teal" onClick={() => copy(dateToUnix.epochSec, "date-unix-sec")}>
                  {isCopied("date-unix-sec") ? "Copied" : "Copy Sec"}
                </ToolActionButton>
                <ToolActionButton type="button" tone="teal" onClick={() => copy(dateToUnix.epochMs, "date-unix-ms")}>
                  {isCopied("date-unix-ms") ? "Copied" : "Copy Ms"}
                </ToolActionButton>
                <ToolActionButton type="button" tone="teal" onClick={() => copy(dateToUnix.iso, "date-unix-iso")}>
                  {isCopied("date-unix-iso") ? "Copied" : "Copy ISO"}
                </ToolActionButton>
              </div>
            </>
          )}
        </ToolCard>
      </section>
    </ToolPage>
  );
}
