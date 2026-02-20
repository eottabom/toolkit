"use client";

import { useMemo, useState } from "react";
import { ToolActionButton, ToolBadge, ToolCard, ToolHeader, ToolInfoPanel, ToolOutput, ToolPage, ToolTextarea } from "@/components/tool-ui";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

import type { ToolItem } from "@/lib/tools";

function encodeBase64(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64(input: string) {
  const binary = atob(input);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function Base64Tool({ tool }: { tool: ToolItem }) {
  const [plainInput, setPlainInput] = useState("");
  const [base64Input, setBase64Input] = useState("");
  const { copy, isCopied } = useCopyToClipboard();
  const [clearState, setClearState] = useState<"idle" | "plain" | "base64">("idle");

  const encoded = useMemo(() => {
    if (!plainInput.trim()) {
      return "";
    }
    try {
      return encodeBase64(plainInput);
    } catch {
      return "";
    }
  }, [plainInput]);

  const decoded = useMemo(() => {
    if (!base64Input.trim()) {
      return "";
    }
    try {
      return decodeBase64(base64Input);
    } catch {
      return "";
    }
  }, [base64Input]);

  const decodeError = useMemo(() => {
    if (!base64Input.trim()) return "";
    try {
      decodeBase64(base64Input);
      return "";
    } catch {
      return "Invalid Base64 string.";
    }
  }, [base64Input]);

  const handleClear = (type: "plain" | "base64") => {
    if (type === "plain") {
      setPlainInput("");
    } else {
      setBase64Input("");
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

      <ToolInfoPanel
        icon="E"
        title="Encode"
        description="텍스트를 Base64 문자열로 변환합니다. 바이너리 데이터를 안전하게 텍스트로 전달할 때 사용합니다."
        chips={["바이너리 → 텍스트", "데이터 URI", "API 토큰"]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-[var(--font-sora)] font-semibold">
            <ToolBadge>Text → Base64</ToolBadge>
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
            placeholder="Text to encode"
            className="min-h-[220px]"
          />
        </ToolCard>

        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-[var(--font-sora)] font-semibold">
            <ToolBadge>Base64 Output</ToolBadge>
            <ToolActionButton
              type="button"
              onClick={() => copy(encoded, "encoded")}
            >
              {isCopied("encoded") ? "Copied" : "Copy"}
            </ToolActionButton>
          </div>
          <ToolOutput className="min-h-[220px]">{encoded || " "}</ToolOutput>
        </ToolCard>
      </section>

      <ToolInfoPanel
        icon="D"
        title="Decode"
        description="Base64 문자열을 원래 텍스트로 복원합니다."
        chips={["Base64 → 원본"]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-[var(--font-sora)] font-semibold">
            <ToolBadge>Base64 → Text</ToolBadge>
            <ToolActionButton
              type="button"
              onClick={() => handleClear("base64")}
            >
              {clearState === "base64" ? "Cleared" : "Clear"}
            </ToolActionButton>
          </div>
          <ToolTextarea
            value={base64Input}
            onChange={(event) => setBase64Input(event.target.value)}
            placeholder="Base64 string to decode"
            className="min-h-[220px]"
          />
        </ToolCard>

        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-[var(--font-sora)] font-semibold">
            <ToolBadge>Text Output</ToolBadge>
            <ToolActionButton
              type="button"
              onClick={() => copy(decoded, "decoded")}
            >
              {isCopied("decoded") ? "Copied" : "Copy"}
            </ToolActionButton>
          </div>
          <ToolOutput className="min-h-[220px]">{decoded || " "}</ToolOutput>
          {decodeError && <p className="text-xs text-[var(--error)]">{decodeError}</p>}
        </ToolCard>
      </section>
    </ToolPage>
  );
}
