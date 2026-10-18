"use client";

import { PopoverDescription } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/time";
import { useMe } from "@/features/users/api";
import { usePmspaConnection, usePmspaLinkDetail, usePmspaLinks } from "../api";
import type { PmspaLinkType, PmspaRecordDetail } from "../types";
import { STATUS_LABEL } from "../sync";
import { PmspaProblemLine } from "./pmspa-problem-line";
import { ColdStartHint } from "./cold-start-hint";

const NOUN: Record<PmspaLinkType, string> = {
  project: "project",
  task: "task",
  "time-log": "log"
};

const PUSH_HINT: Record<PmspaLinkType, string> = {
  project: "Changes on either side reach the other when you sync the project.",
  task: "Changes on either side reach the other when you sync the task.",
  "time-log": "Changes to this log reach PMSPA when you push the day."
};

function Quoted({ children }: { children: string }) {
  return <span className="text-foreground">“{children}”</span>;
}

/**
 * The PMSPA record in one line. `created` (OQ-207, from the link list) follows the lead, the column or the
 * event: ", created in PMSPA on 6 October 2023, 13:25".
 */
function Detail({
  record,
  created
}: {
  record: PmspaRecordDetail;
  created: string | null;
}) {
  const createdPart = created ? `, created in PMSPA on ${created}` : null;
  switch (record.type) {
    case "project":
      return (
        <>
          PMSPA project: <Quoted>{record.title}</Quoted>
          {record.lead ? `, lead ${record.lead}` : null}
          {createdPart}
          {record.done ? ", done" : null}
        </>
      );
    case "task":
      return (
        <>
          PMSPA task: <Quoted>{record.title}</Quoted> in the project{" "}
          <Quoted>{record.projectTitle ?? ""}</Quoted>, {record.column}
          {createdPart}
        </>
      );
    case "time-log":
      return (
        <>
          PMSPA log: <Quoted>{record.title}</Quoted> in the event{" "}
          <Quoted>{record.eventTitle ?? ""}</Quoted>
          {createdPart}
        </>
      );
  }
}

/**
 * OQ-164, OQ-170: in the sync flag's popover, the record's PMSPA counterpart. It's read live from PMSPA (never
 * stored) while the popover is open, which is when it mounts.
 */
export function PmspaRecordNote({
  type,
  id
}: {
  type: PmspaLinkType;
  id: string;
}) {
  const { data: connection } = usePmspaConnection();
  const connected = connection?.status === "connected";
  const detail = usePmspaLinkDetail(type, id, connected);
  const { data: links } = usePmspaLinks(type);
  const { data: me } = useMe();
  const createdAt = links?.get(id)?.pmspaCreatedAt;
  const created =
    createdAt && me ? formatDateTime(createdAt, me.timeZone) : null;
  if (!connection) return null;

  let body: React.ReactNode;
  if (!connected) {
    body = `PMSPA: ${STATUS_LABEL[connection.status]}. Its data can't be read now.`;
  } else if (detail.isPending) {
    body = null;
  } else if (detail.isError) {
    body = (
      <PmspaProblemLine
        error={detail.error}
        fallback={`Couldn't read the PMSPA ${NOUN[type]} right now.`}
      />
    );
  } else if (!detail.data.pmspa) {
    body = `The PMSPA ${NOUN[type]} no longer exists.`;
  } else {
    body = <Detail record={detail.data.pmspa} created={created} />;
  }

  return (
    <>
      {body === null ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-4/5" />
          <ColdStartHint active />
        </div>
      ) : (
        <PopoverDescription>{body}</PopoverDescription>
      )}
      <PopoverDescription>{PUSH_HINT[type]}</PopoverDescription>
    </>
  );
}
