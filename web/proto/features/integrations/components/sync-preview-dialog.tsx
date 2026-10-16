"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  CircleMinus,
  CircleX,
  Clock,
  FolderKanban,
  Link2,
  ListTodo,
  TriangleAlert,
  type LucideIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { ColdStartHint } from "./cold-start-hint";
import type {
  SyncAction,
  SyncCandidateDto,
  SyncChoiceDto,
  SyncDirection,
  SyncFieldDiffDto,
  SyncOutcome,
  SyncPreviewItemDto,
  SyncRecordType,
  SyncResultDto,
  SyncResultItemDto
} from "../proposed-types";

/** `sync`: a project or task, both ways (OQ-172); `push`: a day's logs to PMSPA; `import`: the connector page. */
export type SyncMode = "import" | "push" | "sync";

const VERB: Record<SyncMode, { verb: string; doing: string; done: string }> = {
  import: { verb: "Import", doing: "Importing", done: "imported" },
  push: { verb: "Push", doing: "Pushing", done: "pushed" },
  sync: { verb: "Sync", doing: "Syncing", done: "synced" }
};

const SIDE: Record<SyncDirection, string> = {
  "to-pm4": "PM4",
  "to-pmspa": "PMSPA"
};

const TYPE_ICON: Record<SyncRecordType, LucideIcon> = {
  project: FolderKanban,
  task: ListTodo,
  day: CalendarDays,
  event: Clock
};

const LINK_CLASS = "border-sky-500/40 text-sky-700 dark:text-sky-400";

const ACTION: Record<SyncAction, { label: string; className: string }> = {
  create: {
    label: "Create",
    className: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
  },
  update: {
    label: "Update",
    className: "border-sky-500/40 text-sky-700 dark:text-sky-400"
  },
  skip: { label: "Up to date", className: "text-muted-foreground" },
  differs: {
    label: "Differs",
    className: "border-amber-500/50 text-amber-700 dark:text-amber-400"
  }
};

const OUTCOME: Record<
  SyncOutcome,
  { label: string; icon: LucideIcon; className: string }
> = {
  created: {
    label: "Created",
    icon: CircleCheck,
    className: "text-emerald-600 dark:text-emerald-400"
  },
  updated: {
    label: "Updated",
    icon: CircleCheck,
    className: "text-emerald-600 dark:text-emerald-400"
  },
  linked: {
    label: "Linked",
    icon: Link2,
    className: "text-emerald-600 dark:text-emerald-400"
  },
  skipped: {
    label: "Skipped",
    icon: CircleMinus,
    className: "text-muted-foreground"
  },
  failed: { label: "Failed", icon: CircleX, className: "text-destructive" }
};

const OTHER_SIDE: Record<SyncMode, string> = {
  import: "PM4",
  push: "PMSPA",
  sync: "PMSPA"
};

type Choices = Record<string, SyncChoiceDto>;

/**
 * The row's choice: the user's, or for a linked record that differs, its suggested side to overwrite (Link only
 * when there's none, OQ-173). Undefined = the row's own action.
 */
function choiceOf(
  item: SyncPreviewItemDto,
  choices: Choices
): SyncChoiceDto | undefined {
  return (
    choices[item.key] ??
    (item.action === "differs" && item.linkedId
      ? {
          key: item.key,
          kind: "link",
          id: item.linkedId,
          overwrite: item.direction
        }
      : undefined)
  );
}

/** Whether the row writes anything: creates, updates, links two records, or overwrites a side. */
function writes(item: SyncPreviewItemDto, choice: SyncChoiceDto | undefined) {
  if (choice?.kind === "skip" || item.action === "skip") return false;
  if (item.action === "differs")
    return choice?.kind === "link" && choice.overwrite !== null;
  return true;
}

/** The row's badge: what will happen to it, with the user's choice applied (OQ-172, OQ-173). */
function rowBadge(
  item: SyncPreviewItemDto,
  choice: SyncChoiceDto | undefined
): { label: string; className: string } {
  const action = ACTION[item.action];
  if (choice?.kind === "skip" && item.optional)
    return { label: "Left out", className: ACTION.skip.className };
  if (item.action === "differs")
    return choice?.kind === "link" && choice.overwrite
      ? {
          label: `Overwrite ${SIDE[choice.overwrite]}`,
          className: ACTION.update.className
        }
      : action;
  if (choice?.kind === "link")
    return {
      label: choice.overwrite
        ? `Link, overwrite ${SIDE[choice.overwrite]}`
        : "Link",
      className: LINK_CLASS
    };
  if (item.direction && item.action === "create")
    return { ...action, label: `Create in ${SIDE[item.direction]}` };
  if (item.direction && item.action === "update")
    return { ...action, label: `Overwrite ${SIDE[item.direction]}` };
  return action;
}

/** Rows in tree order with their depth: parents first, each followed by its children. */
function inTreeOrder<T extends { key: string; parentKey: string | null }>(
  items: T[]
): { item: T; depth: number }[] {
  const keys = new Set(items.map((i) => i.key));
  const out: { item: T; depth: number }[] = [];
  const visit = (parentKey: string | null, depth: number) => {
    for (const item of items) {
      const isRoot = item.parentKey === null || !keys.has(item.parentKey);
      if (parentKey === null ? isRoot : item.parentKey === parentKey) {
        out.push({ item, depth });
        visit(item.key, depth + 1);
      }
    }
  };
  visit(null, 0);
  return out;
}

const plural = (n: number, one: string, many = one + "s") =>
  `${n} ${n === 1 ? one : many}`;

/**
 * FR-INT-008, FR-INT-011, FR-INT-012: the preview before an import, a sync or a push (design principle 6), then
 * the per-record outcome (design principle 9). Unlinked projects and tasks offer **Create new** or **Link to
 * existing**; a linked record that differs offers the same choice (OQ-172, OQ-173): **Link only**, **Overwrite
 * PMSPA** or **Overwrite PM4**. Optional rows can be left out.
 */
export function SyncPreviewDialog({
  open,
  onOpenChange,
  mode,
  title,
  description,
  items,
  isPending,
  isError,
  onRetry,
  onRun
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SyncMode;
  title: string;
  description: React.ReactNode;
  items: SyncPreviewItemDto[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onRun: (choices: SyncChoiceDto[]) => Promise<SyncResultDto>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* `!`: the theme's dialog rule sets grid, padding and `sm:max-w-sm` (as in day-charts.tsx). */}
      <DialogContent className="flex! max-h-[90vh] flex-col gap-0! rounded-md! p-0! sm:max-w-2xl!">
        {open ? (
          <PreviewBody
            mode={mode}
            title={title}
            description={description}
            items={items}
            isPending={isPending}
            isError={isError}
            onRetry={onRetry}
            onRun={onRun}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PreviewBody({
  mode,
  title,
  description,
  items,
  isPending,
  isError,
  onRetry,
  onRun
}: {
  mode: SyncMode;
  title: string;
  description: React.ReactNode;
  items: SyncPreviewItemDto[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onRun: (choices: SyncChoiceDto[]) => Promise<SyncResultDto>;
}) {
  const [choices, setChoices] = useState<Choices>({});
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<SyncResultDto | null>(null);
  const { verb, doing } = VERB[mode];

  if (result) return <ResultBody mode={mode} result={result} />;

  const setChoice = (key: string, choice: SyncChoiceDto | null) =>
    setChoices((c) => {
      const { [key]: _old, ...rest } = c;
      void _old;
      return choice ? { ...rest, [key]: choice } : rest;
    });

  let body: React.ReactNode;
  if (isPending) {
    body = (
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
        <ColdStartHint active />
      </div>
    );
  } else if (isError || !items) {
    body = (
      <div className="flex flex-col items-start gap-3 p-6 text-sm">
        <p>Couldn&apos;t prepare the preview. PMSPA may be unreachable.</p>
        <Button variant="outline" className="cursor-pointer" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <p className="p-6 text-sm text-muted-foreground">
        Nothing to {verb.toLowerCase()}.
      </p>
    );
  } else {
    body = (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="divide-y px-6">
          {inTreeOrder(items).map(({ item, depth }) => (
            <PreviewRow
              key={item.key}
              mode={mode}
              item={item}
              depth={depth}
              parent={items.find((i) => i.key === item.parentKey)}
              choices={choices}
              onChoice={setChoice}
            />
          ))}
        </div>
      </div>
    );
  }

  const all = (items ?? []).map((i) => ({ i, c: choiceOf(i, choices) }));
  const toWrite = all.filter(({ i, c }) => writes(i, c));
  const count = (test: (i: SyncPreviewItemDto, c?: SyncChoiceDto) => boolean) =>
    all.filter(({ i, c }) => test(i, c)).length;
  const created = count(
    (i, c) => i.action === "create" && c?.kind !== "link" && c?.kind !== "skip"
  );
  const linked = count((i, c) => i.action === "create" && c?.kind === "link");
  const overwritten = count(
    (i, c) =>
      (i.action === "differs" && writes(i, c)) ||
      (i.action === "update" && c?.kind !== "skip")
  );
  const kept = count((i, c) => i.action === "differs" && !writes(i, c));
  const upToDate = count((i) => i.action === "skip");
  const leftOut = count((i, c) => i.optional && c?.kind === "skip");
  const summary = [
    created && `${created} to create`,
    linked && `${linked} to link`,
    overwritten && `${overwritten} to overwrite`,
    kept && `${kept} kept as is`,
    upToDate && `${upToDate} up to date`,
    leftOut && `${leftOut} left out`
  ].filter(Boolean);

  async function run() {
    setRunning(true);
    setFailed(false);
    try {
      setResult(await onRun(Object.values(choices)));
    } catch {
      setFailed(true);
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <DialogHeader className="border-b p-6 pb-4">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {body}
      <DialogFooter className="mx-0 mb-0 items-center gap-3 rounded-b-md border-t p-4 sm:justify-between">
        <div className="text-xs text-muted-foreground">
          {failed ? (
            <span className="text-destructive">
              Couldn&apos;t {verb.toLowerCase()}. Nothing was changed. Try
              again.
            </span>
          ) : running ? (
            <ColdStartHint active />
          ) : (
            summary.join(" · ")
          )}
        </div>
        <div className="flex gap-2">
          <DialogClose
            render={<Button variant="outline" className="cursor-pointer" />}
          >
            Cancel
          </DialogClose>
          <Button
            className="cursor-pointer"
            disabled={
              isPending ||
              !items ||
              running ||
              toWrite.length === 0
            }
            onClick={() => void run()}
          >
            {running
              ? `${doing}…`
              : `${verb} ${plural(toWrite.length, "record")}`}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

function PreviewRow({
  mode,
  item,
  depth,
  parent,
  choices,
  onChoice
}: {
  mode: SyncMode;
  item: SyncPreviewItemDto;
  depth: number;
  parent: SyncPreviewItemDto | undefined;
  choices: Choices;
  onChoice: (key: string, choice: SyncChoiceDto | null) => void;
}) {
  const Icon = TYPE_ICON[item.type];
  const choose = (c: SyncChoiceDto) => onChoice(item.key, c);
  const choice = choiceOf(item, choices);
  const leftOut = item.optional && choice?.kind === "skip";
  const badge = rowBadge(item, choice);
  const canLink =
    item.action === "create" &&
    (item.type === "project" || item.type === "task");
  return (
    <div
      className={cn("flex flex-col gap-2 py-3", leftOut && "opacity-60")}
      style={{ paddingLeft: `${depth * 1.5}rem` }}
    >
      <div className="flex items-start gap-3">
        {item.optional ? (
          <Checkbox
            aria-label={`Include ${item.title}`}
            className="mt-0.5 cursor-pointer"
            checked={!leftOut}
            onCheckedChange={(checked) =>
              onChoice(
                item.key,
                checked ? null : { key: item.key, kind: "skip" }
              )
            }
          />
        ) : null}
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
            <span className="min-w-0 break-words">{item.title}</span>
            {item.parent ? (
              <Badge variant="secondary" className="font-normal">
                Parent
              </Badge>
            ) : null}
          </p>
          {item.detail || item.reason ? (
            <p className="text-xs text-muted-foreground">
              {[item.detail, item.reason].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0 font-normal", badge.className)}
        >
          {badge.label}
        </Badge>
      </div>
      <div className="flex flex-col gap-2 pl-7">
        {canLink && !leftOut ? (
          <LinkChoice
            mode={mode}
            item={item}
            candidates={candidatesFor(item, parent, choices)}
            choice={choice}
            onChoice={choose}
          />
        ) : null}
        {item.action === "differs" && item.linkedId ? (
          <PairCompare
            title={item.title}
            differences={item.differences}
            overwrite={choice?.kind === "link" ? choice.overwrite : null}
            onChange={(overwrite) =>
              choose({
                key: item.key,
                kind: "link",
                id: item.linkedId!,
                overwrite
              })
            }
          />
        ) : null}
        {item.warnings.map((w) => (
          <p
            key={w}
            className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
          >
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            {w}
          </p>
        ))}
      </div>
    </div>
  );
}

/** A task's candidates follow its project: linked, or linked to an existing record in this preview. */
function candidatesFor(
  item: SyncPreviewItemDto,
  parent: SyncPreviewItemDto | undefined,
  choices: Choices
): SyncCandidateDto[] {
  if (item.type !== "task") return item.candidates;
  if (!parent) return item.candidates;
  const parentChoice = choices[parent.key];
  const group =
    parent.linkedId ?? (parentChoice?.kind === "link" ? parentChoice.id : null);
  return group ? item.candidates.filter((c) => c.groupId === group) : [];
}

const CREATE: SyncCandidateDto = {
  id: "",
  title: "Create new",
  groupId: null,
  detail: null,
  differences: []
};

const LINK_OVERWRITE = [
  { value: "none", label: "Link only" },
  { value: "to-pmspa", label: "Overwrite PMSPA" },
  { value: "to-pm4", label: "Overwrite PM4" }
] as const;

/**
 * OQ-157: **Create new** (the default) or **Link to existing ▾**. OQ-172, OQ-173: a link writes nothing (**Link
 * only**, the default) unless the user picks a side to overwrite, comparing the two records first.
 */
function LinkChoice({
  mode,
  item,
  candidates,
  choice,
  onChoice
}: {
  mode: SyncMode;
  item: SyncPreviewItemDto;
  candidates: SyncCandidateDto[];
  choice: SyncChoiceDto | undefined;
  onChoice: (choice: SyncChoiceDto) => void;
}) {
  const linkedTo =
    choice?.kind === "link"
      ? (candidates.find((c) => c.id === choice.id) ?? null)
      : null;
  const value = linkedTo ?? CREATE;
  const options = [CREATE, ...candidates];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground">In {OTHER_SIDE[mode]}:</span>
      <Combobox<SyncCandidateDto>
        items={options}
        value={value}
        onValueChange={(next) =>
          onChoice(
            next && next.id !== ""
              ? { key: item.key, kind: "link", id: next.id, overwrite: null }
              : { key: item.key, kind: "create" }
          )
        }
        itemToStringLabel={(c) =>
          c.id === "" ? c.title : `Link to “${c.title}”`
        }
        isItemEqualToValue={(a, b) => a.id === b.id}
        autoHighlight
      >
        <ComboboxInput
          aria-label={`${item.title} in ${OTHER_SIDE[mode]}`}
          className="h-8 w-72 max-w-full rounded-md! text-xs [&_button]:cursor-pointer"
        />
        <ComboboxContent>
          <ComboboxEmpty>
            No unlinked {item.type}s in {OTHER_SIDE[mode]}
          </ComboboxEmpty>
          <ComboboxList>
            {(c: SyncCandidateDto) => (
              <ComboboxItem
                key={c.id || "create"}
                value={c}
                className="cursor-pointer"
              >
                {c.id === "" ? (
                  c.title
                ) : (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.title}</span>
                  </span>
                )}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {candidates.length === 0 ? (
        <span className="text-muted-foreground">
          No existing {item.type} to link to.
        </span>
      ) : null}
      {choice?.kind === "link" && linkedTo ? (
        <PairCompare
          title={item.title}
          differences={linkedTo.differences}
          overwrite={choice.overwrite}
          onChange={(overwrite) => onChoice({ ...choice, overwrite })}
        />
      ) : null}
    </div>
  );
}

/**
 * OQ-173: how two paired records differ, field by field, and what the sync does about it: **Link only** (write
 * nothing), **Overwrite PMSPA** or **Overwrite PM4**. No field-level merging (design principle 7).
 */
function PairCompare({
  title,
  differences,
  overwrite,
  onChange
}: {
  title: string;
  differences: SyncFieldDiffDto[];
  overwrite: SyncDirection | null;
  onChange: (overwrite: SyncDirection | null) => void;
}) {
  if (differences.length === 0)
    return (
      <p className="w-full text-xs text-muted-foreground">
        Same in PM4 and PMSPA: linking writes nothing.
      </p>
    );
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
      <table className="w-full table-fixed border-collapse text-left">
        <thead className="text-muted-foreground">
          <tr>
            <th className="w-24 pb-1 font-normal" scope="col">
              <span className="sr-only">Field</span>
            </th>
            <th className="pb-1 font-normal" scope="col">
              PM4
            </th>
            <th className="pb-1 pl-3 font-normal" scope="col">
              PMSPA
            </th>
          </tr>
        </thead>
        <tbody>
          {differences.map((d) => (
            <tr key={d.field} className="align-top">
              <th
                className="py-0.5 pr-3 font-normal text-muted-foreground"
                scope="row"
              >
                {d.field}
              </th>
              <td className="py-0.5 break-words">
                <DiffValue value={d.pm4} />
              </td>
              <td className="py-0.5 pl-3 break-words">
                <DiffValue value={d.pmspa} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        aria-label={`What syncing ${title} does`}
        value={[overwrite ?? "none"]}
        onValueChange={(value) => {
          const next = value[0] as (typeof LINK_OVERWRITE)[number]["value"];
          if (next) onChange(next === "none" ? null : next);
        }}
      >
        {LINK_OVERWRITE.map((o) => (
          <ToggleGroupItem
            key={o.value}
            value={o.value}
            className="cursor-pointer bg-background px-3"
          >
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

function DiffValue({ value }: { value: string | null }) {
  return value === null ? (
    <span className="text-muted-foreground">None</span>
  ) : (
    <span className="line-clamp-3">{value}</span>
  );
}

function ResultBody({
  mode,
  result
}: {
  mode: SyncMode;
  result: SyncResultDto;
}) {
  const failed = result.items.filter((i) => i.outcome === "failed").length;
  const done = result.items.filter(
    (i) => i.outcome !== "failed" && i.outcome !== "skipped"
  ).length;
  const { done: verb } = VERB[mode];
  const Verb = verb[0].toUpperCase() + verb.slice(1);
  return (
    <>
      <DialogHeader className="border-b p-6 pb-4">
        <DialogTitle>
          {failed
            ? `${Verb} with ${plural(failed, "failure")}`
            : `${Verb} ${mode === "sync" ? "with" : "to"} ${OTHER_SIDE[mode]}`}
        </DialogTitle>
        <DialogDescription>
          {plural(done, "record")} {verb}
          {failed
            ? `. The failed ${failed === 1 ? "record wasn't" : "records weren't"} written; the others were.`
            : "."}
        </DialogDescription>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="divide-y px-6">
          {inTreeOrder(result.items).map(({ item, depth }) => (
            <ResultRow key={item.key} item={item} depth={depth} />
          ))}
        </div>
      </div>
      <DialogFooter className="mx-0 mb-0 rounded-b-md border-t p-4">
        <DialogClose render={<Button className="cursor-pointer" />}>
          Done
        </DialogClose>
      </DialogFooter>
    </>
  );
}

function ResultRow({
  item,
  depth
}: {
  item: SyncResultItemDto;
  depth: number;
}) {
  const Icon = TYPE_ICON[item.type];
  const o = OUTCOME[item.outcome];
  return (
    <div
      className="flex items-start gap-3 py-2.5 text-sm"
      style={{ paddingLeft: `${depth * 1.5}rem` }}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="break-words">
          {item.newTitle ? (
            <>
              <span className="text-muted-foreground">{item.title}</span>
              <ArrowRight
                aria-label="renamed to"
                className="mx-1 inline size-3.5 align-[-2px] text-muted-foreground"
              />
              {item.newTitle}
            </>
          ) : (
            item.title
          )}
        </p>
        {item.reason ? (
          <p
            className={cn(
              "text-xs",
              item.outcome === "failed"
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {item.reason}
          </p>
        ) : null}
      </div>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 text-xs font-medium",
          o.className
        )}
      >
        <o.icon className="size-3.5" />
        {o.label}
      </span>
    </div>
  );
}
