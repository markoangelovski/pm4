"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { BookingTarget } from "../days";

/** "Worked on" / "Booked to" links: the href of a booking's row on another day, and what a click tells the page. */
export interface BookingLinks {
  href: (target: BookingTarget) => string;
  /** Called on every click with the link's target: the page scrolls to it, expands its day and outlines it. */
  onJump: (target: BookingTarget) => void;
}

/**
 * A link to the other end of a booking: the day it points to is listed on this page → only the hash
 * changes, so the URL keeps its range; else Link opens that day's month. Either way the page scrolls itself
 * (smoothly) once the day renders, so there is no native jump.
 */
export function DayLink({
  target,
  links,
  className,
  title,
  children
}: {
  target: BookingTarget;
  links: BookingLinks;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  const href = links.href(target);
  return href.startsWith("#") ? (
    <a
      href={href}
      className={className}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        window.history.pushState(null, "", href);
        links.onJump(target);
      }}
    >
      {children}
    </a>
  ) : (
    <Link
      href={href}
      scroll={false}
      className={className}
      title={title}
      onClick={() => links.onJump(target)}
    >
      {children}
    </Link>
  );
}
