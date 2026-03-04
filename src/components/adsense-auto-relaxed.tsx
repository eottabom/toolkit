"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdsenseAutoRelaxed() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("AdSense render failed:", error);
    }
  }, [pathname]);

  return (
    <div className="mt-10 flex min-h-[100px] justify-center">
      <div className="w-full max-w-[728px] min-h-[100px]">
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", minHeight: "100px" }}
          data-ad-client="ca-pub-5103032140213770"
          data-ad-slot="3384415421"
          data-ad-format="autorelaxed"
        />
      </div>
    </div>
  );
}

