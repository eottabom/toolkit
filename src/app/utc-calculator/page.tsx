// 하위 호환성을 위한 레거시 URL 별칭.
// slug가 /utc-unix-calculator/ 로 변경되기 전에 Google Search Console이 /utc-calculator/ 를 크롤링했음.
// 기존 링크와 북마크가 계속 동작하도록 정규 URL로 즉시 리다이렉트함.

import type { Metadata } from "next";
import RedirectClient from "./redirect-client";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://eottabom.github.io/toolkit/utc-unix-calculator/",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function UtcCalculatorLegacyPage() {
  return <RedirectClient />;
}
