"use client";

import Link from "next/link";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe, useSignOutEverywhere } from "@/features/users/api";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { formatDate } from "@/lib/time";
import { routes } from "@/lib/routes";

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

export function UserProfile(): React.JSX.Element {
  const { data: me, isPending, isError, refetch } = useMe();
  const {
    mutate,
    reset,
    isPending: signingOut,
    isError: signOutFailed
  } = useSignOutEverywhere();

  if (isError && !me) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6">
        <p className="text-sm">Couldn&apos;t load your profile.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <UserAvatar user={me} className="h-20 w-20" />
          {isPending || !me ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold">{me.displayName}</h1>
              <p className="text-sm text-muted-foreground">{me.email}</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold">Account</h2>
        {isPending || !me ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name">{me.displayName}</Field>
            <Field label="Email">{me.email}</Field>
            <Field label="Signed in with">Google</Field>
            <Field label="Member since">
              {formatDate(me.createdAt, me.timeZone)}
            </Field>
            <Field label="Time zone">
              <span className="flex flex-col gap-1">
                <span>{me.timeZone}</span>
                <Link
                  href={routes.app.settings}
                  className="text-sm text-primary hover:underline"
                >
                  Change in Settings
                </Link>
              </span>
            </Field>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold">Sessions</h2>
        <p className="text-sm text-muted-foreground">
          Sign out of PM4 on every device, including this one.
        </p>
        <AlertDialog
          onOpenChange={(open) => {
            if (!open && !signingOut) reset();
          }}
        >
          <AlertDialogTrigger
            render={<Button variant="outline" className="w-fit" />}
          >
            Sign out of all devices
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of all devices?</AlertDialogTitle>
              <AlertDialogDescription>
                You&apos;ll be signed out here and on every other device within
                15 minutes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {signOutFailed ? (
              <p role="alert" className="text-sm text-destructive">
                Couldn&apos;t sign out of all devices. Please try again.
              </p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={signingOut}
                onClick={() => mutate()}
              >
                Sign out everywhere
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
