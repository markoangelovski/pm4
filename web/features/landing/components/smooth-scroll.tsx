"use client";

import { useEffect } from "react";

/** Smooth-scrolls in-page anchor jumps (header links, "How a day works") while the landing page is mounted. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";
    return () => {
      root.style.scrollBehavior = previous;
    };
  }, []);
  return null;
}
