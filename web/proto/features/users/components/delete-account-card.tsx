"use client";

import { useState } from "react";
import { toastError } from "@/proto/features/system/rate-limit";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDeleteAccount, type Me } from "@/proto/features/users/api";

/** What the account deletion removes, as listed in the dialog (FR-AUTH-008, *Deleting a user*). */
const DELETED = [
  "Every project and task",
  "Every workday, time log and booking",
  "Every note and to-do",
  "Your settings and integration connections"
];

/** Trimmed and case-insensitive, as the email is compared (OQ-278). */
function matchesEmail(typed: string, email: string): boolean {
  return typed.trim().toLowerCase() === email.trim().toLowerCase();
}

/**
 * SCR-051's **Delete account** card, below Sessions (FR-AUTH-008, OQ-278). The dialog lists what is deleted
 * and enables its delete button only once the user types their own email. Success → signed out on `/`;
 * failure → toast, the dialog stays open.
 */
export function DeleteAccountCard({
  me
}: {
  me: Me | undefined;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const { mutate, isPending } = useDeleteAccount();
  const confirmed = me !== undefined && matchesEmail(typed, me.email);

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold">Delete account</h2>
      <p className="text-sm text-muted-foreground">
        Permanently delete your PM4 account and everything in it. This
        can&apos;t be undone.
      </p>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (isPending) return;
          setOpen(next);
          if (!next) setTyped("");
        }}
      >
        <AlertDialogTrigger
          render={
            <Button
              variant="destructive"
              className="w-fit cursor-pointer"
              disabled={me === undefined}
            />
          }
        >
          Delete account
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-md!">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account and all of its data will be deleted permanently, and
              you&apos;ll be signed out on every device. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {DELETED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Projects of other users that named you as their lead will show no
            lead. Data in an external app such as PMSPA isn&apos;t affected.
          </p>
          <Field>
            <FieldLabel htmlFor="delete-account-email">
              Type your email, {me?.email}, to confirm
            </FieldLabel>
            <Input
              id="delete-account-email"
              type="email"
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={isPending}
            />
          </Field>
          <AlertDialogFooter className="rounded-b-md">
            <AlertDialogCancel className="cursor-pointer" disabled={isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!confirmed || isPending}
              onClick={() =>
                mutate(undefined, {
                  onError: (error) =>
                    toastError(error, "Couldn't delete your account.")
                })
              }
              className="cursor-pointer"
            >
              {isPending ? "Deleting…" : "Delete account"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
