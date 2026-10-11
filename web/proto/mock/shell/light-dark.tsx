import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

const LightDark = () => {
  const { theme: activeMode, setTheme: setActiveMode } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Hydration guard: server and first client render must match, so this
    // can only flip after mount (the sanctioned exception to "no setState in
    // an effect body" - there is no external system to synchronize with).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const toggleTheme = async () => {
    const toggleMode = () => {
      setActiveMode(activeMode === "light" ? "dark" : "light");
    };

    const doc = document as DocumentWithViewTransition;
    if (!doc.startViewTransition) {
      toggleMode();
      return;
    }

    const transition = doc.startViewTransition(() => {
      toggleMode();
    });

    await transition.ready;

    document.documentElement.animate(
      {
        clipPath: ["inset(0 0 100% 0)", "inset(0)"]
      },
      {
        duration: 800,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)"
      }
    );
  };

  if (!isMounted) {
    // Render nothing on the server to avoid hydration mismatch
    return null;
  }

  return (
    <div>
      {/* Theme Toggle */}
      {activeMode === "light" ? (
        <Button
          variant="ghost"
          className=" h-10 w-10  hover:bg-primary/5  rounded-full cursor-pointer"
          onClick={toggleTheme}
        >
          <Moon className="size-5" />
        </Button>
      ) : (
        // Dark Mode Button
        <Button
          variant="ghost"
          className=" h-10 w-10  hover:bg-primary/5  rounded-full cursor-pointer"
          onClick={toggleTheme}
        >
          <Sun className="size-5" />
        </Button>
      )}
    </div>
  );
};

export default LightDark;
