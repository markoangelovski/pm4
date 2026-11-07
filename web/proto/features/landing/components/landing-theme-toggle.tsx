"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

const subscribe = () => () => {};

/** True after hydration; the theme is only known on the client. */
function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

/**
 * The landing header's light/dark switch. Same behaviour as the app header's toggle: it starts from the
 * system theme and wipes the new theme in from the top where the browser supports view transitions.
 */
export function LandingThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isClient = useIsClient();
  const isDark = isClient && resolvedTheme === "dark";

  const toggle = async () => {
    const next = isDark ? "light" : "dark";
    const doc = document as DocumentWithViewTransition;
    if (!doc.startViewTransition) {
      setTheme(next);
      return;
    }
    const transition = doc.startViewTransition(() => setTheme(next));
    await transition.ready;
    document.documentElement.animate(
      { clipPath: ["inset(0 0 100% 0)", "inset(0)"] },
      {
        duration: 800,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)"
      }
    );
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="rounded-full"
      onClick={toggle}
      disabled={!isClient}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
