"use client";

import { useState } from "react";
import { MoreHorizontal, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { Day } from "../types";
import { DayPromptDialog } from "./day-prompt-dialog";
import { DeleteDayDialog } from "./delete-day-dialog";

/** SCR-040's ⋯ menu on the date row: **Prompt**, disabled while the day has no logs; **Delete day**, disabled
 *  while the day has no start and no logs. */
export function DayMenu({ day }: { day: Day }) {
  const [prompting, setPrompting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const empty = day.startMinute === null && day.logs.length === 0;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label="Day actions"
              className="cursor-pointer"
            />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={day.logs.length === 0}
            className="cursor-pointer"
            onClick={() => setPrompting(true)}
          >
            <Sparkles /> Prompt
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={empty}
            className="cursor-pointer"
            onClick={() => setDeleting(true)}
          >
            <Trash2 /> Delete day
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DayPromptDialog day={day} open={prompting} onOpenChange={setPrompting} />
      <DeleteDayDialog day={day} open={deleting} onOpenChange={setDeleting} />
    </>
  );
}
