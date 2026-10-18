"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
  FieldGroup,
  FieldLabel
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe, useUpdateMe, type Me } from "@/proto/features/users/api";
import { routes } from "@/proto/lib/routes";

const ZONES = Intl.supportedValuesOf("timeZone").map((z) => ({
  value: z,
  label: z.replaceAll("_", " ")
}));
const MAX_HOURS = 24;

/** SCR-050: the User settings tab (daily target and time zone). */
export function UserSettings(): React.JSX.Element {
  const { data: me, isPending, isError, refetch } = useMe();

  if (isError && !me) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6">
        <p className="text-sm">Couldn&apos;t load your settings.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (isPending || !me) {
    return (
      <Card className="flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full max-w-32" />
        <Skeleton className="h-10 w-full max-w-sm" />
      </Card>
    );
  }

  // Mounted once the saved values are known, so the form starts from them.
  return <SettingsForm me={me} />;
}

function SettingsForm({ me }: { me: Me }): React.JSX.Element {
  const { mutateAsync, isPending: saving } = useUpdateMe();
  const savedHours = String(me.dailyTargetMinutes / 60);
  const [hours, setHours] = useState(savedHours);
  const [zone, setZone] = useState(me.timeZone);

  const parsed = Number(hours);
  const hoursValid =
    hours.trim() !== "" &&
    Number.isFinite(parsed) &&
    parsed >= 0.25 &&
    parsed <= MAX_HOURS &&
    Number.isInteger(parsed * 4);
  const targetChanged =
    hoursValid && Math.round(parsed * 60) !== me.dailyTargetMinutes;
  const zoneChanged = zone !== me.timeZone;
  const dirty =
    targetChanged || zoneChanged || (!hoursValid && hours !== savedHours);

  async function save() {
    if (!hoursValid || !dirty) return;
    const input: { timeZone?: string; dailyTargetMinutes?: number } = {};
    if (targetChanged) input.dailyTargetMinutes = Math.round(parsed * 60);
    if (zoneChanged) input.timeZone = zone;
    try {
      await mutateAsync(input);
      toast.success("Settings saved");
    } catch {
      toast.error("Couldn't save the settings.");
    }
  }

  return (
    <Card className="border rounded-md!">
      <CardHeader>
        <CardTitle>User settings</CardTitle>
        <CardDescription>
          Personal preferences that apply to your whole account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="daily-target">Daily target (hours)</FieldLabel>
            <Input
              id="daily-target"
              type="number"
              inputMode="decimal"
              min={0.25}
              max={MAX_HOURS}
              step={0.25}
              value={hours}
              aria-invalid={!hoursValid}
              onChange={(e) => setHours(e.target.value)}
              className="w-full max-w-32"
            />
            <FieldDescription>
              {hoursValid
                ? "Hours you aim to work each day. Used for “% billable”, overtime and the pie chart on Logs. Default is 7."
                : `Enter a value between 0.25 and ${MAX_HOURS}, in steps of 0.25.`}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="time-zone">Time zone</FieldLabel>
            <Select
              items={ZONES}
              value={zone}
              onValueChange={(v) => v !== null && setZone(v as string)}
            >
              <SelectTrigger
                id="time-zone"
                className="w-full max-w-sm cursor-pointer"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72" alignItemWithTrigger={false}>
                {ZONES.map((z) => (
                  <SelectItem
                    key={z.value}
                    value={z.value}
                    className="cursor-pointer"
                  >
                    {z.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Decides what “today” is and how dates are shown. It is also shown
              on your{" "}
              <Link
                href={routes.app.userProfile}
                className="text-primary hover:underline"
              >
                profile
              </Link>
              .
            </FieldDescription>
          </Field>
          <div className="flex gap-2">
            <Button
              className="cursor-pointer"
              disabled={!hoursValid || !dirty || saving}
              onClick={save}
            >
              Save changes
            </Button>
            <Button
              variant="ghost"
              className="cursor-pointer"
              disabled={!dirty || saving}
              onClick={() => {
                setHours(savedHours);
                setZone(me.timeZone);
              }}
            >
              Reset
            </Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
