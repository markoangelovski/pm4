"use client";

import type { JSX } from "react";
import type { Day } from "../types";

export function DayPromptDialog(props: {
  day: Day;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  void props;
  throw new Error("not implemented (feat-tlog-prompt)");
}
