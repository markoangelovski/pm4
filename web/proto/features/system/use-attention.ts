"use client";

import { useEffect } from "react";

const TITLE_PREFIX = /^\(\d+\) /;
const ORIGINAL_HREF = "data-pm4-href";
const BADGE_SIZE = 64;

/** "(n) " before the page title, kept when a navigation sets a new title; removed for 0. */
function useTitleCount(count: number) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const apply = () => {
      const base = document.title.replace(TITLE_PREFIX, "");
      const next = count > 0 ? `(${count}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    if (count === 0) return;
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true
    });
    return () => {
      observer.disconnect();
      document.title = document.title.replace(TITLE_PREFIX, "");
    };
  }, [count]);
}

/** The favicon with a red dot in its top-right corner while `on`; the original icons come back after. */
function useFaviconDot(on: boolean) {
  useEffect(() => {
    if (!on || typeof document === "undefined") return;
    const links = [
      ...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
    ];
    const source =
      links.find((l) => l.type === "image/svg+xml") ?? links.at(0) ?? null;
    if (!source) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = BADGE_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, BADGE_SIZE, BADGE_SIZE);
      ctx.beginPath();
      ctx.arc(BADGE_SIZE - 16, 16, 15, 0, 2 * Math.PI);
      ctx.fillStyle = "#e5484d";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      const url = canvas.toDataURL("image/png");
      for (const l of links) {
        if (!l.hasAttribute(ORIGINAL_HREF))
          l.setAttribute(ORIGINAL_HREF, l.href);
        l.href = url;
      }
    };
    img.src = source.getAttribute(ORIGINAL_HREF) ?? source.href;
    return () => {
      cancelled = true;
      for (const l of links) {
        const original = l.getAttribute(ORIGINAL_HREF);
        if (original !== null) {
          l.href = original;
          l.removeAttribute(ORIGINAL_HREF);
        }
      }
    };
  }, [on]);
}

/**
 * The installed app's icon badge (Badging API): the count, or none for 0. Browsers without the API (or an app that
 * isn't installed) ignore it.
 */
function useAppBadge(count: number) {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("setAppBadge" in navigator))
      return;
    const set =
      count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge();
    set.catch(() => {});
    return () => {
      navigator.clearAppBadge().catch(() => {});
    };
  }, [count]);
}

/** Shows `count` unread notifications outside the page: in the tab's title and favicon and on the installed app's icon. */
export function useAttention(count: number) {
  useTitleCount(count);
  useFaviconDot(count > 0);
  useAppBadge(count);
}
