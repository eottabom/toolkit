"use client";

import { useMemo, useState } from "react";
import { ToolActionButton, ToolBadge, ToolCard, ToolHeader, ToolOutput, ToolPage, ToolTextarea } from "@/components/tool-ui";

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
  const [copyState, setCopyState] = useState<"idle" | "encoded" | "decoded">("idle");
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
              onClick={() => handleCopy(encoded, "encoded")}
            >
              {copyState === "encoded" ? "Copied" : "Copy"}
            </ToolActionButton>
          </div>
          <ToolOutput className="min-h-[220px]">{encoded || " "}</ToolOutput>
        </ToolCard>
      </section>

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
              onClick={() => handleCopy(decoded, "decoded")}
            >
              {copyState === "decoded" ? "Copied" : "Copy"}
            </ToolActionButton>
          </div>
          <ToolOutput className="min-h-[220px]">{decoded || " "}</ToolOutput>
          {decodeError && <p className="text-xs text-[color:var(--diff-removed)]">{decodeError}</p>}
        </ToolCard>
      </section>
    </ToolPage>
  );
}
