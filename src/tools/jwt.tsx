"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ToolActionButton, ToolBadge, ToolCard, ToolHeader, ToolOutput, ToolPage } from "@/components/tool-ui";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

import type { ToolItem } from "@/lib/tools";

const ALGORITHMS = ["HS256", "HS384", "HS512"] as const;
type Algorithm = (typeof ALGORITHMS)[number];

const ALG_HASH_MAP: Record<Algorithm, string> = {
  HS256: "SHA-256",
  HS384: "SHA-384",
  HS512: "SHA-512",
};

const ALG_MIN_KEY_BYTES: Record<Algorithm, number> = {
  HS256: 32,
  HS384: 48,
  HS512: 64,
};

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad) {
    base64 += "=".repeat(4 - pad);
  }
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeJwt(token: string): {
  header: string;
  payload: string;
  signature: string;
  headerAlg: string;
} {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("JWT must have 3 parts separated by dots.");
  }
  const headerObj = JSON.parse(base64UrlDecode(parts[0]));
  const header = JSON.stringify(headerObj, null, 2);
  const payload = JSON.stringify(JSON.parse(base64UrlDecode(parts[1])), null, 2);
  return {
    header,
    payload,
    signature: parts[2],
    headerAlg: headerObj.alg || "",
  };
}

async function signJwt(data: string, secret: string, alg: Algorithm): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: ALG_HASH_MAP[alg] },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return base64UrlEncode(sig);
}

async function verifyJwt(token: string, secret: string, alg: Algorithm): Promise<boolean> {
  const enc = new TextEncoder();
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return false;
  }
  const data = `${parts[0]}.${parts[1]}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: ALG_HASH_MAP[alg] },
    false,
    ["verify"],
  );
  const sigBytes = Uint8Array.from(
    atob(parts[2].replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (parts[2].length % 4)) % 4)),
    (c) => c.charCodeAt(0),
  );
  return crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(data));
}

async function encodeJwt(headerJson: string, payloadJson: string, secret: string, alg: Algorithm): Promise<string> {
  JSON.parse(headerJson);
  JSON.parse(payloadJson);

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(headerJson).buffer as ArrayBuffer);
  const payloadB64 = base64UrlEncode(enc.encode(payloadJson).buffer as ArrayBuffer);
  const data = `${headerB64}.${payloadB64}`;
  const sigB64 = await signJwt(data, secret, alg);
  return `${data}.${sigB64}`;
}

type CopyTarget = "header" | "payload" | "signature" | "encoded";

export default function JwtTool({ tool }: { tool: ToolItem }) {
  // Decode
  const [jwtInput, setJwtInput] = useState("");
  const [verifySecret, setVerifySecret] = useState("");
  const [verifyAlg, setVerifyAlg] = useState<Algorithm>("HS256");
  const [verifyResult, setVerifyResult] = useState<"idle" | "valid" | "invalid">("idle");

  // Encode
  const [encAlg, setEncAlg] = useState<Algorithm>("HS256");
  const [encHeader, setEncHeader] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  const [encPayload, setEncPayload] = useState(
    '{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}',
  );
  const [secret, setSecret] = useState("");
  const [encodedJwt, setEncodedJwt] = useState("");
  const [encodeError, setEncodeError] = useState("");

  const { copy, isCopied } = useCopyToClipboard();

  const decoded = useMemo(() => {
    if (!jwtInput.trim()) {
      return null;
    }
    try {
      return decodeJwt(jwtInput);
    } catch {
      return null;
    }
  }, [jwtInput]);

  // Decode 시 Header의 alg를 자동으로 Verify 알고리즘에 반영
  useEffect(() => {
    if (decoded?.headerAlg && ALGORITHMS.includes(decoded.headerAlg as Algorithm)) {
      setVerifyAlg(decoded.headerAlg as Algorithm);
    }
  }, [decoded?.headerAlg]);

  const decodeError = useMemo(() => {
    if (!jwtInput.trim()) {
      return "";
    }
    try {
      decodeJwt(jwtInput);
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : "Invalid JWT.";
    }
  }, [jwtInput]);

  const handleVerify = useCallback(async () => {
    if (!jwtInput.trim() || !verifySecret) {
      return;
    }
    try {
      const valid = await verifyJwt(jwtInput, verifySecret, verifyAlg);
      setVerifyResult(valid ? "valid" : "invalid");
    } catch {
      setVerifyResult("invalid");
    }
  }, [jwtInput, verifySecret, verifyAlg]);

  // Secret 키나 알고리즘이 변경되면 검증 결과 초기화
  useEffect(() => {
    setVerifyResult("idle");
  }, [verifySecret, verifyAlg, jwtInput]);

  const handleEncAlgChange = (alg: Algorithm) => {
    setEncAlg(alg);
    try {
      const headerObj = JSON.parse(encHeader);
      headerObj.alg = alg;
      setEncHeader(JSON.stringify(headerObj, null, 2));
    } catch {
      // Header가 유효한 JSON이 아니면 무시
    }
  };

  const handleEncode = useCallback(async () => {
    setEncodeError("");
    setEncodedJwt("");
    try {
      const result = await encodeJwt(encHeader, encPayload, secret, encAlg);
      setEncodedJwt(result);
    } catch (e) {
      setEncodeError(e instanceof Error ? e.message : "Failed to encode JWT.");
    }
  }, [encHeader, encPayload, secret, encAlg]);

  const textareaClass =
    "min-h-[140px] w-full resize-none rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)] focus:border-[color:var(--card-border-hover)] focus:outline-none";
  const selectClass =
    "h-8 rounded-full border border-[color:var(--card-border)] bg-[var(--surface)] px-3 text-[11px] font-semibold text-[var(--foreground)] outline-none transition hover:border-[color:var(--card-border-hover)] cursor-pointer";

  return (
    <ToolPage>
      <ToolHeader
        title={tool.title}
        description={tool.desc}
        right={<div className="self-start text-xs uppercase tracking-[0.2em] text-[var(--muted)] md:self-auto">Encode + Decode</div>}
      />

      {/* Decode Section */}
      <section className="flex flex-col gap-4">
        <Card className="rounded-2xl border border-[color:var(--url-panel-border)] bg-[var(--url-panel-bg)] p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--url-panel-icon-bg)] text-sm text-[var(--url-panel-accent)]">
              D
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Decode</h2>
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                JWT 토큰을 붙여넣으면 Header, Payload, Signature 세 부분으로 분리하여 보여줍니다. Secret Key를 입력하면
                서명을 검증할 수 있습니다.
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                  Header : 알고리즘(alg) + 토큰 타입(typ)
                </span>
                <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                  Payload : 사용자 정보 + 클레임(sub, exp, iss 등)
                </span>
                <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                  Signature : HMAC 해시값 (Secret Key로 검증)
                </span>
              </div>
            </div>
          </div>
        </Card>

        <ToolCard>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
            <ToolBadge>Decode JWT</ToolBadge>
            <ToolActionButton type="button" onClick={() => setJwtInput("")}>
              Clear
            </ToolActionButton>
          </div>
          <Textarea
            value={jwtInput}
            onChange={(e) => setJwtInput(e.target.value)}
            placeholder="Paste a JWT token (e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.xxx)"
            className={`${textareaClass} min-h-[100px]`}
          />
          {decodeError && <p className="text-xs text-[color:var(--error)]">{decodeError}</p>}
        </ToolCard>

        {decoded && (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <ToolCard>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
                  <ToolBadge>Header</ToolBadge>
                  <ToolActionButton
                    type="button"
                    onClick={() => copy(decoded.header, "header")}
                  >
                    {isCopied("header") ? "Copied" : "Copy"}
                  </ToolActionButton>
                </div>
                <ToolOutput className="min-h-[140px]">{decoded.header}</ToolOutput>
              </ToolCard>

              <ToolCard>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
                  <ToolBadge>Payload</ToolBadge>
                  <ToolActionButton
                    type="button"
                    onClick={() => copy(decoded.payload, "payload")}
                  >
                    {isCopied("payload") ? "Copied" : "Copy"}
                  </ToolActionButton>
                </div>
                <ToolOutput className="min-h-[140px]">{decoded.payload}</ToolOutput>
              </ToolCard>

              <ToolCard>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
                  <ToolBadge>Signature</ToolBadge>
                  <div className="flex items-center gap-2">
                    <select
                      value={verifyAlg}
                      onChange={(e) => setVerifyAlg(e.target.value as Algorithm)}
                      className={selectClass}
                    >
                      {ALGORITHMS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <ToolActionButton
                      type="button"
                      onClick={() => copy(decoded.signature, "signature")}
                    >
                      {isCopied("signature") ? "Copied" : "Copy"}
                    </ToolActionButton>
                  </div>
                </div>

                {/* Raw signature */}
                <div className="break-all rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs text-[var(--foreground)]">
                  {decoded.signature}
                </div>

                {/* Algorithm formula */}
                <div className="rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 font-mono text-xs leading-relaxed text-[var(--muted)]">
                  <span className="text-[var(--syntax-key)]">HMAC{verifyAlg.replace("HS", "SHA")}</span>
                  {"(\n  base64UrlEncode("}
                  <span className="text-[var(--syntax-string)]">header</span>
                  {') + "." +\n  base64UrlEncode('}
                  <span className="text-[var(--syntax-string)]">payload</span>
                  {"),"}
                  {"\n  "}
                  <span className="text-[var(--syntax-boolean)]">{verifySecret ? verifySecret : "your-secret"}</span>
                  {"\n)"}
                </div>

                {/* Secret key input */}
                <input
                  type="text"
                  value={verifySecret}
                  onChange={(e) => setVerifySecret(e.target.value)}
                  placeholder="Enter secret key to verify signature"
                  className="w-full rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-4 py-3 font-mono text-xs text-[var(--foreground)] outline-none focus:border-[color:var(--card-border-hover)]"
                />

                {verifySecret.length > 0 && verifySecret.length < ALG_MIN_KEY_BYTES[verifyAlg] && (
                  <p className="text-[11px] text-[color:var(--error)]">
                    RFC 7518: {verifyAlg} requires a key of {ALG_MIN_KEY_BYTES[verifyAlg] * 8} bits (
                    {ALG_MIN_KEY_BYTES[verifyAlg]} bytes) or larger. Current: {verifySecret.length} bytes.
                  </p>
                )}

                {/* Verify button + result */}
                <div className="flex items-center gap-3">
                  <ToolActionButton type="button" onClick={handleVerify}>
                    Verify
                  </ToolActionButton>
                  {verifyResult !== "idle" && (
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        verifyResult === "valid"
                          ? "bg-[var(--diff-added)] text-[var(--syntax-valid)]"
                          : "bg-[var(--diff-removed)] text-[var(--error)]"
                      }`}
                    >
                      {verifyResult === "valid" ? "Signature Verified" : "Invalid Signature"}
                    </span>
                  )}
                </div>
              </ToolCard>
            </div>
          </>
        )}
      </section>

      {/* Encode Section */}
      <section className="flex flex-col gap-4">
        <Card className="rounded-2xl border border-[color:var(--url-panel-border)] bg-[var(--url-panel-bg)] p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--url-panel-icon-bg)] text-sm text-[var(--url-panel-accent)]">
              E
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Encode</h2>
              <p className="text-xs leading-relaxed text-[var(--muted)]">
                Header와 Payload JSON을 작성하고 Secret Key를 입력한 뒤 Generate 버튼을 누르면 서명된 JWT를 생성합니다.
                알고리즘을 선택하면 Header의 alg 필드가 자동으로 변경됩니다.
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                  1. 알고리즘 선택
                </span>
                <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                  2. Header / Payload JSON 작성
                </span>
                <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                  3. Secret Key 입력
                </span>
                <span className="rounded-md bg-[var(--url-panel-chip-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--url-panel-accent)]">
                  4. Generate JWT 클릭
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Algorithm Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Algorithm</span>
          <div className="flex gap-1">
            {ALGORITHMS.map((alg) => (
              <button
                key={alg}
                type="button"
                onClick={() => handleEncAlgChange(alg)}
                className={`rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                  encAlg === alg
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "border border-[color:var(--card-border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[color:var(--card-border-hover)] hover:text-[var(--foreground)]"
                }`}
              >
                {alg}
              </button>
            ))}
          </div>
        </div>

          <div className="grid gap-4 lg:grid-cols-3">
          <ToolCard>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
              <ToolBadge>Header (JSON)</ToolBadge>
            </div>
            <Textarea
              value={encHeader}
              onChange={(e) => setEncHeader(e.target.value)}
              placeholder='{"alg": "HS256", "typ": "JWT"}'
              className={textareaClass}
            />
          </ToolCard>

          <ToolCard>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
              <ToolBadge>Payload (JSON)</ToolBadge>
            </div>
            <Textarea
              value={encPayload}
              onChange={(e) => setEncPayload(e.target.value)}
              placeholder='{"sub": "1234567890", "name": "John Doe"}'
              className={textareaClass}
            />
          </ToolCard>

          <ToolCard>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
              <ToolBadge>Secret Key</ToolBadge>
            </div>
            <Textarea
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter your HMAC secret key"
              className={textareaClass}
            />
            {secret.length > 0 && secret.length < ALG_MIN_KEY_BYTES[encAlg] && (
              <p className="text-[11px] text-[color:var(--error)]">
                RFC 7518: {encAlg} requires a key of {ALG_MIN_KEY_BYTES[encAlg] * 8} bits ({ALG_MIN_KEY_BYTES[encAlg]}{" "}
                bytes) or larger. Current: {secret.length} bytes.
              </p>
            )}
          </ToolCard>
        </div>

        <div className="flex items-center justify-center gap-4">
          <ToolActionButton type="button" onClick={handleEncode}>
            Generate JWT
          </ToolActionButton>
        </div>

        {encodeError && <p className="text-xs text-center text-[color:var(--error)]">{encodeError}</p>}

        {encodedJwt && (
          <ToolCard>
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)] font-semibold">
              <ToolBadge>Encoded JWT</ToolBadge>
              <ToolActionButton
                type="button"
                onClick={() => copy(encodedJwt, "encoded")}
              >
                {isCopied("encoded") ? "Copied" : "Copy"}
              </ToolActionButton>
            </div>
            <ToolOutput className="min-h-[140px] break-all">{encodedJwt}</ToolOutput>
          </ToolCard>
        )}
      </section>
    </ToolPage>
  );
}
