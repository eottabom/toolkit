import type { Metadata } from "next";
import { IBM_Plex_Mono, Sora } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { BASE_URL } from "@/lib/constants";
import { tools } from "@/lib/tools";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const SITE_DESCRIPTION =
  "Free online developer tools — Base64, JWT, JSON viewer, URL encoder, diff checker, cron builder, k6 generator, JVM memory calculator, and UTC/Unix converter. No install, runs in your browser.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Free Online Developer Tools — Toolkit",
    template: "%s — Free Online Tool | Toolkit",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "developer tools online",
    "free dev utilities",
    "base64 encode decode online",
    "url encode decode online",
    "jwt decoder online",
    "json viewer online",
    "diff checker",
    "cron expression generator",
    "k6 script generator",
    "java memory calculator",
    "utc converter",
    "unix timestamp converter",
  ],
  applicationName: "Toolkit",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    title: "Free Online Developer Tools — Toolkit",
    description: SITE_DESCRIPTION,
    siteName: "Toolkit",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Free Online Developer Tools — Toolkit",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "google18352289b026fe2f",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem("theme-mode");var isDark=stored?stored==="dark":true;document.documentElement.classList.toggle("theme-dark",isDark);}catch(_){document.documentElement.classList.add("theme-dark");}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Toolkit",
              url: BASE_URL,
              description: SITE_DESCRIPTION,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Any",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              browserRequirements: "Requires a modern web browser",
              inLanguage: "en",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Free Online Developer Tools",
              description: SITE_DESCRIPTION,
              numberOfItems: tools.length,
              itemListElement: tools.map((tool, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: tool.title,
                url: `${BASE_URL}${tool.slug}/`,
              })),
            }),
          }}
        />
        <Script
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5103032140213770"
          crossOrigin="anonymous"
        />
        <Script
          async
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-C4G71YP1XT"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-C4G71YP1XT');
          `}
        </Script>
      </head>
      <body className={`${sora.variable} ${plexMono.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
