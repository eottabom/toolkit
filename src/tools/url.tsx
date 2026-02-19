"use client";

import { useMemo, useState } from "react";
import {
  ToolActionButton,
  ToolBadge,
  ToolCard,
  ToolHeader,
  ToolInfoPanel,
  ToolOutput,
  ToolPage,
  ToolTextarea,
} from "@/components/tool-ui";

import type { ToolItem } from "@/lib/tools";

export default function UrlTool({ tool }: { tool: ToolItem }) {
  const [plainInput, setPlainInput] = useState("");
  const [encodedInput, setEncodedInput] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "encoded" | "decoded">("idle");
  const [clearState, setClearState] = useState<"idle" | "plain" | "encoded">("idle");

  const encoded = useMemo(() => {
    if (!plainInput) {
      return "";
    }
    try {
      return encodeURIComponent(plainInput);
    } catch {
      return "";
    }
  }, [plainInput]);

  const decoded = useMemo(() => {
    if (!encodedInput) {
      return "";
    }
    try {
      return decodeURIComponent(encodedInput);
    } catch {
      return "";
    }
  }, [encodedInput]);

  const decodeError = useMemo(() => {
    if (!encodedInput) {
      return "";
    }
    try {
      decodeURIComponent(encodedInput);
      return "";
    } catch {
      return "Invalid URL-encoded string.";
    }
  }, [encodedInput]);

  const handleCopy = async (text: string, type: "encoded" | "decoded") => {
    if (!text) {
      return;
    }
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

  return (
    <ToolPage>
      <ToolHeader
        title={tool.title}
        description={tool.desc}
        right={<div className="self-start text-xs uppercase tracking-[0.2em] text-[var(--muted)] md:self-auto">Encode + Decode</div>}
      />

      {/* Info Panel */}
      <ToolInfoPanel
        icon="%"
        title="URL Encoding"
        description={
          <>
            URL 인코딩은 특수 문자를 <code className="text-[var(--url-panel-accent)]">%XX</code> 형태로 변환하여 URL에서
            안전하게 사용할 수 있도록 합니다. 모든 처리는 브라우저에서 수행되며 서버로 전송되지 않습니다.
          </>
        }
        chips={["쿼리 파라미터 인코딩", "폼 데이터 전송", "특수 문자 → %XX 변환"]}
      />

      {/* Encode Section */}
      <section className="grid gap-4 lg:grid-cols-2">
        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
            <ToolBadge>Text → URL Encode</ToolBadge>
            <ToolActionButton
              type="button"
              onClick={() => handleClear("plain")}
            >
              {clearState === "plain" ? "Cleared" : "Clear"}
            </ToolActionButton>
          </div>
          <ToolTextarea
            value={plainInput}
            onChange={(event) => setPlainInput(event.target.value)}
            placeholder="Text to encode (e.g. hello world&foo=bar)"
            className="min-h-[220px]"
          />
        </ToolCard>

        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
            <ToolBadge>Encoded Output</ToolBadge>
            <ToolActionButton
              type="button"
              onClick={() => handleCopy(encoded, "encoded")}
            >
              {copyState === "encoded" ? "Copied" : "Copy"}
            </ToolActionButton>
          </div>
          <ToolOutput className="min-h-[220px]">{encoded || " "}</ToolOutput>
        </ToolCard>
      </section>

      {/* Decode Section */}
      <section className="grid gap-4 lg:grid-cols-2">
        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
            <ToolBadge>URL Encoded → Text</ToolBadge>
            <ToolActionButton
              type="button"
              onClick={() => handleClear("encoded")}
            >
              {clearState === "encoded" ? "Cleared" : "Clear"}
            </ToolActionButton>
          </div>
          <ToolTextarea
            value={encodedInput}
            onChange={(event) => setEncodedInput(event.target.value)}
            placeholder="URL-encoded string to decode (e.g. hello%20world%26foo%3Dbar)"
            className="min-h-[220px]"
          />
        </ToolCard>

        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
            <ToolBadge>Text Output</ToolBadge>
            <ToolActionButton
              type="button"
              onClick={() => handleCopy(decoded, "decoded")}
            >
              {copyState === "decoded" ? "Copied" : "Copy"}
            </ToolActionButton>
          </div>
          <ToolOutput className="min-h-[220px]">{decoded || " "}</ToolOutput>
          {decodeError && <p className="text-xs text-[color:var(--syntax-error)]">{decodeError}</p>}
        </ToolCard>
      </section>
    </ToolPage>
  );
}
