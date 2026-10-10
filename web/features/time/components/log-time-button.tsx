"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { today } from "@/lib/time";
import { useMe } from "@/features/users/api";
import { LogFormDialog } from "./log-form-dialog";

/** FR-TLOG-011: the header button. Opens the dialog for today from any screen. */
export function LogTimeButton() {
  const [open, setOpen] = useState(false);
  const { data: me } = useMe();
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer gap-2"
        onClick={() => setOpen(true)}
      >
        <Clock className="size-4" />
        <span className="hidden sm:inline">Log time</span>
      </Button>
      <LogFormDialog
        open={open}
        onOpenChange={setOpen}
        defaultDate={today(me?.timeZone ?? "UTC")}
      />
    </>
  );
}
