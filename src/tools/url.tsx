"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import type { ToolItem } from "@/lib/tools";

export default function UrlTool({ tool }: { tool: ToolItem }) {
  const [plainInput, setPlainInput] = useState("");
  const [encodedInput, setEncodedInput] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "encoded" | "decoded">(
    "idle",
  );
  const [clearState, setClearState] = useState<"idle" | "plain" | "encoded">(
    "idle",
  );

  const encoded = useMemo(() => {
    if (!plainInput) return "";
    try {
      return encodeURIComponent(plainInput);
    } catch {
      return "";
    }
  }, [plainInput]);

  const decoded = useMemo(() => {
    if (!encodedInput) return "";
    try {
      return decodeURIComponent(encodedInput);
    } catch {
      return "";
    }
  }, [encodedInput]);

  const decodeError = useMemo(() => {
    if (!encodedInput) return "";
    try {
      decodeURIComponent(encodedInput);
      return "";
    } catch {
      return "Invalid URL-encoded string.";
    }
  }, [encodedInput]);

  const handleCopy = async (text: string, type: "encoded" | "decoded") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(type);
      window.setTimeout(() => setCopyState("idle"), 1200);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleClear = (type: "plain" | "encoded") => {
    if (type === "plain") {
      setPlainInput("");
    } else {
      setEncodedInput("");
    }
    setClearState(type);
    window.setTimeout(() => setClearState("idle"), 900);
  };

  const badgeClass =
    "rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 hover:bg-emerald-500/15 dark:bg-emerald-400/25 dark:text-emerald-200";
  const copyBtnClass =
    "h-auto rounded-full border border-[color:var(--card-border)] bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[color:var(--card-border-hover)] hover:text-[var(--foreground)]";
  const cardClass =
    "flex flex-col gap-3 rounded-3xl border border-[color:var(--card-border)] bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]";
  const textareaClass =
    "min-h-[220px] w-full resize-none rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none";
  const outputClass =
    "min-h-[220px] whitespace-pre-wrap rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)]";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-[var(--foreground)]">
            {tool.title}
          </h1>
          <p className="text-sm text-[var(--muted)]">{tool.desc}</p>
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
          Encode + Decode
        </div>
      </div>

      {/* Info Panel */}
      <Card className="rounded-2xl border border-[color:var(--url-panel-border)] bg-[var(--url-panel-bg)] p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--url-panel-icon-bg)] text-sm text-[var(--url-panel-accent)]">
            %
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              URL Encoding
            </h2>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              URL 인코딩은 특수 문자를 <code className="text-[var(--url-panel-accent)]">%XX</code> 형태로 변환하여
              URL에서 안전하게 사용할 수 있도록 합니다. 모든 처리는 브라우저에서
              수행되며 서버로 전송되지 않습니다.
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                쿼리 파라미터 인코딩
              </span>
              <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                폼 데이터 전송
              </span>
              <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                특수 문자 → %XX 변환
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Encode Section */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className={cardClass}>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
            <Badge className={badgeClass}>
              Text → URL Encode
            </Badge>
            <Button
              type="button"
              onClick={() => handleClear("plain")}
              variant="ghost"
              size="sm"
              className={copyBtnClass}
            >
              {clearState === "plain" ? "Cleared" : "Clear"}
            </Button>
          </div>
          <Textarea
            value={plainInput}
            onChange={(event) => setPlainInput(event.target.value)}
            placeholder="Text to encode (e.g. hello world&foo=bar)"
            className={textareaClass}
          />
        </Card>

        <Card className={cardClass}>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
            <Badge className={badgeClass}>
              Encoded Output
            </Badge>
            <Button
              type="button"
              onClick={() => handleCopy(encoded, "encoded")}
              variant="ghost"
              size="sm"
              className={copyBtnClass}
            >
              {copyState === "encoded" ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className={outputClass}>
            {encoded || " "}
          </div>
        </Card>
      </section>

      {/* Decode Section */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className={cardClass}>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
            <Badge className={badgeClass}>
              URL Encoded → Text
            </Badge>
            <Button
              type="button"
              onClick={() => handleClear("encoded")}
              variant="ghost"
              size="sm"
              className={copyBtnClass}
            >
              {clearState === "encoded" ? "Cleared" : "Clear"}
            </Button>
          </div>
          <Textarea
            value={encodedInput}
            onChange={(event) => setEncodedInput(event.target.value)}
            placeholder="URL-encoded string to decode (e.g. hello%20world%26foo%3Dbar)"
            className={textareaClass}
          />
        </Card>

        <Card className={cardClass}>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
            <Badge className={badgeClass}>
              Text Output
            </Badge>
            <Button
              type="button"
              onClick={() => handleCopy(decoded, "decoded")}
              variant="ghost"
              size="sm"
              className={copyBtnClass}
            >
              {copyState === "decoded" ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className={outputClass}>
            {decoded || " "}
          </div>
          {decodeError && (
            <p className="text-xs text-[color:var(--syntax-error)]">
              {decodeError}
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
