import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BASE_URL } from "@/lib/constants";
import { tools } from "@/lib/tools";
import { toolPages } from "@/tools";
import { AdsenseAutoRelaxed } from "@/components/adsense-auto-relaxed";
import { RecentToolTracker } from "@/components/recent-tool-tracker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/error-boundary";

type ToolPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return tools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) return {};
  return {
    title: tool.title,
    description: tool.desc,
    alternates: {
      canonical: `${BASE_URL}${tool.slug}/`,
    },
    openGraph: {
      type: "website",
      url: `${BASE_URL}${tool.slug}/`,
      title: `${tool.title} — Free Online Tool | Toolkit`,
      description: tool.desc,
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title: `${tool.title} — Free Online Tool | Toolkit`,
      description: tool.desc,
    },
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = tools.find((item) => item.slug === slug);
  const ToolComponent = toolPages[slug];

  if (!tool) {
    notFound();
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Toolkit",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: tool.title,
        item: `${BASE_URL}${tool.slug}/`,
      },
    ],
  };

  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.title,
    url: `${BASE_URL}${tool.slug}/`,
    description: tool.desc,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    isPartOf: {
      "@type": "WebApplication",
      name: "Toolkit",
      url: BASE_URL,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: tool.conceptTitle,
        acceptedAnswer: {
          "@type": "Answer",
          text: tool.conceptSummary,
        },
      },
      {
        "@type": "Question",
        name: `How to use the ${tool.title} tool?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${tool.desc} This free online tool runs entirely in your browser — no data is sent to any server. No installation required.`,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 sm:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <RecentToolTracker slug={tool.slug} />
        <nav aria-label="Breadcrumb" className="text-sm text-[var(--muted)]">
          <ol className="flex items-center gap-1">
            <li>
              <Link href="/" className="hover:text-[var(--foreground)] transition">
                Toolkit
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span className="text-[var(--foreground)] font-medium">{tool.title}</span>
            </li>
          </ol>
        </nav>
        <article>
          {ToolComponent ? (
            <ErrorBoundary>
              <ToolComponent tool={tool} />
            </ErrorBoundary>
          ) : (
            <Card className="rounded-3xl border border-[color:var(--card-border)] bg-[var(--surface)] p-8 shadow-[var(--card-shadow)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Tool Page</p>
              <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{tool.title}</h1>
              <p className="mt-2 text-base text-[var(--muted)]">
                This page is not wired yet. Add a component in
                <span className="font-mono"> src/tools</span> and register it in
                <span className="font-mono"> src/tools/index.ts</span>.
              </p>
            </Card>
          )}
        </article>
        <AdsenseAutoRelaxed />
      </div>
    </div>
  );
}
