"use client";

import { useMemo, useState } from "react";

type Base64ToolProps = {
  tool: {
    title: string;
    desc: string;
  };
};

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

export default function Base64Tool({ tool }: Base64ToolProps) {
  const [plainInput, setPlainInput] = useState("");
  const [base64Input, setBase64Input] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "encoded" | "decoded">(
    "idle",
  );
  const [clearState, setClearState] = useState<"idle" | "plain" | "base64">(
    "idle",
  );

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

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-3xl border border-black/10 bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-[var(--font-sora)] font-semibold">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-400/25 dark:text-emerald-200">
              Text → Base64
            </span>
            <button
              type="button"
              onClick={() => handleClear("plain")}
              className="cursor-pointer rounded-full border border-black/10 bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-black/30 hover:text-[var(--foreground)]"
            >
              {clearState === "plain" ? "Cleared" : "Clear"}
            </button>
          </div>
          <textarea
            value={plainInput}
            onChange={(event) => setPlainInput(event.target.value)}
            placeholder="Text to encode"
            className="min-h-[220px] w-full resize-none rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)] focus:border-black/30 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-black/10 bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-[var(--font-sora)] font-semibold">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-400/25 dark:text-emerald-200">
              Base64 Output
            </span>
            <button
              type="button"
              onClick={() => handleCopy(encoded, "encoded")}
              className="cursor-pointer rounded-full border border-black/10 bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-black/30 hover:text-[var(--foreground)]"
            >
              {copyState === "encoded" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="min-h-[220px] whitespace-pre-wrap rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)]">
            {encoded || " "}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-3xl border border-black/10 bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-[var(--font-sora)] font-semibold">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-400/25 dark:text-emerald-200">
              Base64 → Text
            </span>
            <button
              type="button"
              onClick={() => handleClear("base64")}
              className="cursor-pointer rounded-full border border-black/10 bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-black/30 hover:text-[var(--foreground)]"
            >
              {clearState === "base64" ? "Cleared" : "Clear"}
            </button>
          </div>
          <textarea
            value={base64Input}
            onChange={(event) => setBase64Input(event.target.value)}
            placeholder="Base64 string to decode"
            className="min-h-[220px] w-full resize-none rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)] focus:border-black/30 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-3 rounded-3xl border border-black/10 bg-[var(--surface)] p-5 shadow-[var(--card-shadow)]">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-[var(--font-sora)] font-semibold">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-400/25 dark:text-emerald-200">
              Text Output
            </span>
            <button
              type="button"
              onClick={() => handleCopy(decoded, "decoded")}
              className="cursor-pointer rounded-full border border-black/10 bg-[var(--surface)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-black/30 hover:text-[var(--foreground)]"
            >
              {copyState === "decoded" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="min-h-[220px] whitespace-pre-wrap rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)]">
            {decoded || " "}
          </div>
          {decodeError && (
            <p className="text-xs text-[color:var(--diff-removed)]">
              {decodeError}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
