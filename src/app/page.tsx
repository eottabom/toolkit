"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { tools } from "@/lib/tools";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Home() {
  const { theme, mounted, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter((tool) => {
      return (
        tool.title.toLowerCase().includes(q) ||
        tool.desc.toLowerCase().includes(q) ||
        tool.tag.toLowerCase().includes(q) ||
        tool.slug.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const recentTools = useMemo(() => {
    return [...tools]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 3);
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,106,61,0.14)_0%,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(31,122,224,0.16)_0%,_transparent_45%)]">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10 sm:px-10">
        <div className="pointer-events-none absolute -top-24 right-6 h-44 w-44 rounded-full bg-[#ff6a3d]/20 blur-3xl animate-[float-slow_10s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute bottom-10 left-8 h-56 w-56 rounded-full bg-[#1f7ae0]/15 blur-3xl animate-[float-slow_12s_ease-in-out_infinite]" />

        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--foreground)] text-[var(--background)] text-base font-semibold">
              TK
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
                Toolkit
              </p>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                Useful Utilities
              </h1>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-sm text-[var(--muted)]">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full border border-[color:var(--card-border)] bg-[var(--surface)] px-4 text-[var(--foreground)] transition hover:border-[color:var(--card-border-hover)]"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {mounted && theme === "dark" ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="4.5" />
                    <line x1="12" y1="2.5" x2="12" y2="5" />
                    <line x1="12" y1="19" x2="12" y2="21.5" />
                    <line x1="2.5" y1="12" x2="5" y2="12" />
                    <line x1="19" y1="12" x2="21.5" y2="12" />
                    <line x1="4.6" y1="4.6" x2="6.4" y2="6.4" />
                    <line x1="17.6" y1="17.6" x2="19.4" y2="19.4" />
                    <line x1="4.6" y1="19.4" x2="6.4" y2="17.6" />
                    <line x1="17.6" y1="6.4" x2="19.4" y2="4.6" />
                  </svg>
                  <span className="leading-none">Light</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 12.6A8.6 8.6 0 0 1 11.4 3 7.4 7.4 0 1 0 21 12.6Z" />
                  </svg>
                  <span className="leading-none">Dark</span>
                </span>
              )}
            </Button>
          </nav>
        </header>

        <main className="flex flex-1 flex-col gap-10">
          <section
            className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-stretch animate-[fade-in_0.8s_ease-out]"
            style={{ animationDelay: "0.05s", animationFillMode: "both" }}
          >
            <Card className="flex flex-col gap-5 rounded-3xl border border-[color:var(--card-border)] bg-[var(--surface)]/80 p-6 shadow-[var(--card-shadow)] backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    Tool Search
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold leading-tight text-[var(--foreground)]">
                    Search your tools.
                  </h2>
                </div>
                <span />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-10 flex-1 rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface-muted)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[color:var(--card-border-hover)] focus:outline-none sm:h-12"
                  placeholder="Type a tool name"
                />
                <Button className="h-10 rounded-2xl bg-[var(--accent-2)] px-4 text-xs font-semibold text-white transition hover:opacity-90 sm:h-12 sm:px-6 sm:text-sm">
                  Go
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {filteredTools.slice(0, 3).map((tool) => (
                  <Link
                    key={tool.slug}
                    href={`/${tool.slug}`}
                    className="flex items-center justify-between rounded-2xl border border-[color:var(--card-border)] bg-[var(--surface)] px-4 py-3 text-sm transition hover:-translate-y-0.5 hover:border-[color:var(--card-border-hover)]"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                        {tool.tag}
                      </p>
                      <p className="mt-1 font-semibold text-[var(--foreground)]">
                        {tool.title}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--muted)]">Open →</span>
                  </Link>
                ))}
                {filteredTools.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[color:var(--card-border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted)]">
                    No tools found. Try a different keyword.
                  </div>
                )}
              </div>
            </Card>

            <Card className="flex h-full flex-col gap-5 rounded-3xl border border-[color:var(--card-border)] bg-[#141414] p-6 text-white shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
                <span>Workspace Pulse</span>
              </div>
              <h3 className="text-2xl font-semibold">Workspace overview.</h3>
              <p className="text-sm text-white/70">
                A quick snapshot of tools and recent changes.
              </p>
              <div className="mt-2 grid gap-3 text-sm">
                <div className="flex min-h-[48px] items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <span>Total tools</span>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/20 text-sm font-semibold text-emerald-200">
                    {tools.length}
                  </span>
                </div>
                <div className="flex min-h-[48px] items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <span>Recently added</span>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/20 text-sm font-semibold text-emerald-200">
                    {recentTools.length}
                  </span>
                </div>
                <div className="flex min-h-[48px] items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <span>Latest</span>
                  <span className="inline-flex h-9 items-center rounded-full bg-white/10 px-3 text-right text-xs font-semibold text-white/90">
                    {recentTools[0]?.title ?? "—"}
                  </span>
                </div>
              </div>
            </Card>
          </section>

          <section
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-[fade-in_0.8s_ease-out]"
            style={{ animationDelay: "0.18s", animationFillMode: "both" }}
          >
            {[...tools].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).map((tool, index) => (
              <Card
                key={tool.slug}
                className="group rounded-3xl border border-[color:var(--card-border)] bg-[var(--surface)] p-6 shadow-[var(--card-shadow)] transition hover:-translate-y-1 hover:border-[color:var(--card-border-hover)] hover:shadow-[0_18px_45px_rgba(16,24,40,0.12)] animate-[fade-in_0.7s_ease-out]"
                style={{
                  animationDelay: `${0.12 + index * 0.06}s`,
                  animationFillMode: "both",
                }}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  <span>{tool.tag}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
                  {tool.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{tool.desc}</p>
                <Link
                  href={`/${tool.slug}`}
                  className="mt-6 inline-flex text-sm font-semibold text-[var(--accent-2)] transition group-hover:opacity-80"
                >
                  Open →
                </Link>
              </Card>
            ))}
          </section>
        </main>

        <footer className="mt-6 h-14 border-t border-[color:var(--card-border)]" />
      </div>
    </div>
  );
}
