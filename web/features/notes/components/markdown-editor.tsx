"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NOTE_BODY_MAX } from "../schemas";
import { Markdown } from "./markdown";

/**
 * A Markdown textarea with Write / Preview tabs, like GitHub's. Nothing is saved until the form is.
 * Near `maxLength` (a note's body by default; null for none) it shows a character count.
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  autoFocus,
  placeholder = "Write your note… Markdown is supported.",
  maxLength = NOTE_BODY_MAX,
  "aria-label": ariaLabel
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  maxLength?: number | null;
  "aria-label"?: string;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const near = maxLength !== null && value.length > maxLength * 0.9;
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "write" | "preview")}>
      <div className="flex items-center justify-between">
        <TabsList className="h-8">
          <TabsTrigger value="write" className="cursor-pointer px-3 text-xs">
            Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="cursor-pointer px-3 text-xs">
            Preview
          </TabsTrigger>
        </TabsList>
        {near ? (
          <span
            className={cn(
              "text-xs tabular-nums",
              value.length > (maxLength ?? Infinity)
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {value.length.toLocaleString("en")} /{" "}
            {(maxLength ?? 0).toLocaleString("en")}
          </span>
        ) : null}
      </div>
      <TabsContent value="write">
        <Textarea
          id={id}
          rows={12}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          className="max-h-[50vh] min-h-48 font-mono text-sm"
        />
      </TabsContent>
      <TabsContent value="preview">
        <div className="max-h-[50vh] min-h-48 overflow-y-auto rounded-md border px-3 py-2">
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
