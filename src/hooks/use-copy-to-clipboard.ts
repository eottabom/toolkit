"use client";

import { useCallback, useState } from "react";

export function useCopyToClipboard(timeout = 1200) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = useCallback(
    async (text: string, key = "default") => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        window.setTimeout(() => setCopiedKey(null), timeout);
      } catch {
        // ignore clipboard errors
      }
    },
    [timeout],
  );

  const isCopied = useCallback((key = "default") => copiedKey === key, [copiedKey]);

  return { copy, isCopied };
}
