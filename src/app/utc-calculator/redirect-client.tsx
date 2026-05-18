"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectClient() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/utc-unix-calculator/");
  }, [router]);

  return null;
}
