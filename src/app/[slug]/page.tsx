import Link from "next/link";
import { notFound } from "next/navigation";
import { tools } from "@/lib/tools";
import { toolPages } from "@/tools";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ToolPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = tools.find((item) => item.slug === slug);
  const ToolComponent = toolPages[slug];

  if (!tool) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Button
          asChild
          variant="link"
          className="h-auto p-0 text-sm font-semibold text-[var(--accent-2)] hover:opacity-80"
        >
          <Link href="/">← Back to dashboard</Link>
        </Button>
        {ToolComponent ? (
          <ToolComponent tool={tool} />
        ) : (
          <Card className="rounded-3xl border border-[color:var(--card-border)] bg-[var(--surface)] p-8 shadow-[var(--card-shadow)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Tool Page
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
              {tool.title}
            </h1>
            <p className="mt-2 text-base text-[var(--muted)]">
              This page is not wired yet. Add a component in
              <span className="font-mono"> src/tools</span> and register it in
              <span className="font-mono"> src/tools/index.ts</span>.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
