"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Globe, PlugZap, Unplug } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/proto/features/users/api";
import { applyFieldErrors, isApiError } from "@/lib/api/problem";
import {
  useDisconnectPmspa,
  usePmspaConnection,
  useSavePmspaConnection,
  useTestPmspaConnection,
  type PmspaConnection
} from "../api";
import type { SavePmspaConnectionDto } from "../proposed-types";
import {
  PMSPA_CONNECTION_FIELD_MAP,
  pmspaConnectionDefaults,
  pmspaConnectionSchema,
  toSavePmspaConnection,
  type PmspaConnectionFormValues
} from "../schemas";
import { formatSyncedAt } from "../sync";
import { ColdStartHint } from "./cold-start-hint";
import { ConnectionStatusBadge } from "./connection-status-badge";
import { PmspaAccount } from "./pmspa-account";

/** After a save or a test: one toast per status (FR-INT-004). */
function toastStatus(connection: PmspaConnection, saved: boolean) {
  const prefix = saved ? "Saved, but " : "";
  if (connection.status === "connected")
    toast.success(saved ? "Connected to PMSPA" : "The connection works");
  else if (connection.status === "invalid-credentials")
    toast.error(`${prefix}PMSPA rejected the email or password.`);
  else if (connection.status === "unreachable")
    toast.error(`${prefix}PMSPA couldn't be reached.`);
}

/** FR-INT-001…005: the PMSPA entry of Settings → Integrations. */
export function PmspaConnectionCard() {
  const {
    data: connection,
    isPending,
    isError,
    refetch
  } = usePmspaConnection();
  const status = connection?.status ?? "not-configured";
  return (
    <Card className="border rounded-md!">
      {/* `!`: the theme's card header rule sets `gap-1`. */}
      <CardHeader className="flex flex-row items-center gap-4! pb-2">
        <div className="rounded-md border p-2.5 text-muted-foreground">
          <Globe className="size-5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <CardTitle className="flex flex-wrap items-center gap-3 text-base!">
            PMSPA
            {connection ? <ConnectionStatusBadge status={status} /> : null}
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Import your PMSPA projects, tasks and time into PM4, and push yours
            back.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isError && !connection ? (
          <div className="flex flex-col items-start gap-3 text-sm">
            <p>Couldn&apos;t load the PMSPA connection.</p>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </div>
        ) : isPending || !connection ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
        ) : (
          // Remounted per saved connection, so the form starts from the saved values.
          <ConnectionForm
            key={`${connection.url}|${connection.email}`}
            connection={connection}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ConnectionStatus({ connection }: { connection: PmspaConnection }) {
  const { data: me } = useMe();
  const tz = me?.timeZone;
  const when = (iso: string | null) =>
    iso && tz ? formatSyncedAt(iso, tz) : "never";
  return (
    <div className="flex flex-col gap-3">
      {connection.status === "connected" && connection.account ? (
        <PmspaAccount connection={connection} />
      ) : connection.status === "invalid-credentials" ? (
        <Alert variant="destructive" className="rounded-md!">
          <AlertTitle>PMSPA rejected the email or password</AlertTitle>
          <AlertDescription>
            Enter them again and save. Imports and pushes are paused until then.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="rounded-md! border-amber-500/50 text-amber-700 dark:text-amber-400">
          <AlertTitle>PMSPA couldn&apos;t be reached</AlertTitle>
          <AlertDescription>
            PM4 got no answer from {connection.url}. Check the URL, or test the
            connection again later.
          </AlertDescription>
        </Alert>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <dt>Last checked</dt>
        <dd>{when(connection.lastCheckedAt)}</dd>
        <dt>Last sync</dt>
        <dd>{when(connection.lastSyncAt)}</dd>
      </dl>
    </div>
  );
}

function ConnectionForm({ connection }: { connection: PmspaConnection }) {
  const configured = connection.status !== "not-configured";
  const save = useSavePmspaConnection();
  const test = useTestPmspaConnection();
  const [switchTo, setSwitchTo] = useState<{
    input: SavePmspaConnectionDto;
    linkCount: number;
    accountEmail: string;
  } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty }
  } = useForm<PmspaConnectionFormValues>({
    resolver: zodResolver(pmspaConnectionSchema(configured)),
    defaultValues: pmspaConnectionDefaults(connection)
  });

  function send(input: SavePmspaConnectionDto) {
    save.mutate(input, {
      onSuccess: (saved) => {
        setSwitchTo(null);
        reset(pmspaConnectionDefaults(saved));
        toastStatus(saved, true);
      },
      onError: (error) => {
        if (isApiError(error, 409, "pmspa-account-switch")) {
          setSwitchTo({
            input,
            linkCount: Number(error.problem?.linkCount ?? 0),
            accountEmail: String(error.problem?.accountEmail ?? "")
          });
          return;
        }
        if (!applyFieldErrors(error, setError, PMSPA_CONNECTION_FIELD_MAP))
          toast.error("Couldn't save the connection.");
      }
    });
  }

  const onSubmit = handleSubmit((values) =>
    send(toSavePmspaConnection(values))
  );

  return (
    <div className="flex flex-col gap-6">
      {configured ? <ConnectionStatus connection={connection} /> : null}
      {configured ? <Separator /> : null}
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup className="max-w-md">
          <Field data-invalid={!!errors.url}>
            <FieldLabel htmlFor="pmspa-url">PMSPA URL</FieldLabel>
            <Input
              id="pmspa-url"
              type="url"
              placeholder="https://pmspa.example.com"
              autoComplete="url"
              {...register("url")}
              aria-invalid={!!errors.url || undefined}
            />
            {errors.url ? (
              <FieldError errors={[errors.url]} />
            ) : (
              <FieldDescription>
                The address you open PMSPA at.
              </FieldDescription>
            )}
          </Field>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="pmspa-email">Email</FieldLabel>
            <Input
              id="pmspa-email"
              type="email"
              autoComplete="off"
              {...register("email")}
              aria-invalid={!!errors.email || undefined}
            />
            <FieldError errors={[errors.email]} />
          </Field>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="pmspa-password">Password</FieldLabel>
            <Input
              id="pmspa-password"
              type="password"
              autoComplete="new-password"
              placeholder={configured ? "••••••••" : undefined}
              {...register("password")}
              aria-invalid={!!errors.password || undefined}
            />
            {errors.password ? (
              <FieldError errors={[errors.password]} />
            ) : (
              <FieldDescription>
                {configured
                  ? "Saved. Leave it empty to keep it, or type a new one."
                  : "Stored encrypted. PM4's server uses it to sign in to PMSPA; it's never shown again."}
              </FieldDescription>
            )}
          </Field>
        </FieldGroup>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            className="cursor-pointer"
            disabled={save.isPending || (configured && !isDirty)}
          >
            {save.isPending
              ? configured
                ? "Saving…"
                : "Connecting…"
              : configured
                ? "Save changes"
                : "Connect"}
          </Button>
          {configured ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={test.isPending}
                onClick={() =>
                  test.mutate(undefined, {
                    onSuccess: (c) => toastStatus(c, false),
                    onError: () => toast.error("Couldn't test the connection.")
                  })
                }
              >
                <PlugZap data-icon="inline-start" />
                {test.isPending ? "Testing…" : "Test connection"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer text-destructive hover:text-destructive sm:ml-auto"
                onClick={() => setDisconnecting(true)}
              >
                <Unplug data-icon="inline-start" />
                Disconnect
              </Button>
            </>
          ) : null}
        </div>
        <ColdStartHint
          active={save.isPending || test.isPending}
          className="mt-3"
        />
      </form>

      <AccountSwitchDialog
        target={switchTo}
        pending={save.isPending}
        onCancel={() => setSwitchTo(null)}
        onConfirm={() =>
          switchTo && send({ ...switchTo.input, confirmAccountSwitch: true })
        }
      />
      <DisconnectDialog open={disconnecting} onOpenChange={setDisconnecting} />
    </div>
  );
}

/** FR-INT-002 / OQ-161: the credentials log in as another PMSPA account and links exist. */
function AccountSwitchDialog({
  target,
  pending,
  onCancel,
  onConfirm
}: {
  target: { linkCount: number; accountEmail: string } | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const n = target?.linkCount ?? 0;
  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => !open && onCancel()}
    >
      <AlertDialogContent className="rounded-md!">
        <AlertDialogHeader>
          <AlertDialogTitle>Different PMSPA account</AlertDialogTitle>
          <AlertDialogDescription>
            This is a different PMSPA account ({target?.accountEmail}). Your {n}{" "}
            {n === 1 ? "link" : "links"} to the previous account will be
            removed. Your PM4 records stay.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="rounded-b-md">
          <AlertDialogCancel className="cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
            className="cursor-pointer"
          >
            Remove links and connect
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** FR-INT-005. */
function DisconnectDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const disconnect = useDisconnectPmspa();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-md!">
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect PMSPA?</AlertDialogTitle>
          <AlertDialogDescription>
            PM4 deletes the saved URL, email and password. Everything you
            imported stays in PM4, and nothing changes in PMSPA. Your links are
            kept: connect to the same PMSPA account again to pick up where you
            left off.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="rounded-b-md">
          <AlertDialogCancel className="cursor-pointer">
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={disconnect.isPending}
            onClick={() =>
              disconnect.mutate(undefined, {
                onSuccess: () => {
                  onOpenChange(false);
                  toast("PMSPA disconnected");
                },
                onError: () => toast.error("Couldn't disconnect PMSPA.")
              })
            }
            className="cursor-pointer"
          >
            Disconnect
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
