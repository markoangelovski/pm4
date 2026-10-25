"use client";

import { useRef, useState, type PointerEvent } from "react";
import { ChevronLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { today } from "@/lib/time";
import { useMe } from "@/proto/features/users/api";
import { LogFormDialog } from "./log-form-dialog";

/** How far (px) a swipe has to travel before it hides or shows the button. */
const SWIPE_DISTANCE = 48;
/** Movement (px) below which a press counts as a tap. */
const TAP_SLOP = 6;

/**
 * FR-TLOG-011: the floating Log time button, bottom-right on every screen. Opens the dialog for today.
 * A left-to-right swipe slides it off screen and leaves a small handle at the edge; a right-to-left swipe
 * on the handle (or a tap) slides it back.
 * A tap, click, Enter or Space opens the dialog (on the tab: shows the button).
 */
export function LogTimeButton() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Live drag offset in px (positive = towards the right edge); null when not dragging.
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ x: number; moved: boolean } | null>(null);
  // True when the last press moved past TAP_SLOP, so the click that ends a swipe is ignored.
  const swiped = useRef(false);
  /** Runs `action` for a tap, a mouse click or a key press, not for the click that ends a swipe. */
  const onTap = (action: () => void) => () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    action();
  };
  // A key press is never the end of a swipe: Enter and Space click after keydown, so clear the flag first.
  const onKeyDown = () => {
    swiped.current = false;
  };
  const { data: me } = useMe();

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    swiped.current = false;
    start.current = { x: e.clientX, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    if (Math.abs(dx) > TAP_SLOP) start.current.moved = true;
    if (start.current.moved)
      setDrag(hidden ? Math.min(0, dx) : Math.max(0, dx));
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const moved = start.current.moved;
    start.current = null;
    setDrag(null);
    swiped.current = moved;
    if (!moved) return;
    if (!hidden && dx > SWIPE_DISTANCE) setHidden(true);
    else if (hidden && dx < -SWIPE_DISTANCE) setHidden(false);
  };
  const onPointerCancel = () => {
    start.current = null;
    setDrag(null);
  };
  const swipe = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };

  return (
    <>
      <Button
        size="icon"
        aria-label="Log time"
        title="Log time"
        tabIndex={hidden ? -1 : 0}
        aria-hidden={hidden}
        className={cn(
          "fixed right-6 bottom-6 z-20 size-10! cursor-pointer touch-pan-y rounded-full! shadow-lg select-none",
          drag === null && "transition-transform duration-300 ease-out"
        )}
        style={{
          transform: hidden
            ? "translateX(calc(100% + 1.5rem))"
            : `translateX(${drag ?? 0}px)`
        }}
        onClick={onTap(() => setOpen(true))}
        onKeyDown={onKeyDown}
        {...(hidden ? {} : swipe)}
      >
        <Clock className="size-8" />
      </Button>
      <button
        type="button"
        aria-label="Show Log time button"
        tabIndex={hidden ? 0 : -1}
        aria-hidden={!hidden}
        className={cn(
          "fixed right-0 bottom-6 z-20 flex h-10 w-6 cursor-pointer touch-pan-y items-center justify-center rounded-l-full bg-primary text-primary-foreground shadow-lg select-none",
          drag === null && "transition-transform duration-300 ease-out"
        )}
        style={{
          transform: hidden ? `translateX(${drag ?? 0}px)` : "translateX(100%)"
        }}
        onClick={onTap(() => setHidden(false))}
        onKeyDown={onKeyDown}
        {...(hidden ? swipe : {})}
      >
        <ChevronLeft className="size-4" />
      </button>
      <LogFormDialog
        open={open}
        onOpenChange={setOpen}
        defaultDate={today(me?.timeZone ?? "UTC")}
      />
    </>
  );
}
