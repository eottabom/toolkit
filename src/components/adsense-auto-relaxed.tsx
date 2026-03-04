"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdsenseAutoRelaxed() {
  const insRef = useRef<HTMLModElement | null>(null);
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (hasRequestedRef.current) {
      return;
    }

    const ins = insRef.current;
    if (!ins) {
      return;
    }

    if (ins.getAttribute("data-adsbygoogle-status") === "done") {
      hasRequestedRef.current = true;
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      hasRequestedRef.current = true;
    } catch (error) {
      console.error("AdSense render failed:", error);
    }
  }, []);

  return (
    <div className="mt-10 flex min-h-[100px] justify-center">
      <div className="w-full max-w-[728px] min-h-[100px]">
        <ins
          ref={insRef}
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
