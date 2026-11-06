"use client";

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
  FieldContent,
  FieldDescription,
  FieldLabel
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
  showDesktopNotification,
  turnOffDesktopNotifications,
  turnOnDesktopNotifications,
  useDesktopNotifications,
  type DesktopNotificationsState
} from "@/proto/features/system/desktop-notifications";

const HELP: Record<DesktopNotificationsState, string> = {
  unsupported: "This browser doesn't support desktop notifications.",
  denied:
    "Notifications are blocked for PM4 in this browser. Allow them in the browser's site settings, then turn this on.",
  off: "Your browser will ask for permission the first time.",
  on: "On in this browser. The sound follows your system's notification settings."
};

/** SCR-050: the Desktop notifications card on the User settings tab. A setting of this browser, applied at once. */
export function DesktopNotificationsSettings(): React.JSX.Element {
  const state = useDesktopNotifications();
  return (
    <Card className="border rounded-md!">
      <CardHeader>
        <CardTitle>Desktop notifications</CardTitle>
        <CardDescription>
          A notification from your system when it&apos;s time to log your time,
          while PM4 is open in another tab or window.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <Field orientation="horizontal">
          <Switch
            id="desktop-notifications"
            className="cursor-pointer"
            checked={state === "on"}
            disabled={state === "unsupported" || state === "denied"}
            onCheckedChange={(checked) => {
              if (checked) void turnOnDesktopNotifications();
              else turnOffDesktopNotifications();
            }}
          />
          <FieldContent>
            <FieldLabel htmlFor="desktop-notifications">
              Remind me to log time
            </FieldLabel>
            <FieldDescription>{HELP[state]}</FieldDescription>
          </FieldContent>
        </Field>
        {state === "on" ? (
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() =>
              void showDesktopNotification({
                title: "PM4",
                body: "Desktop notifications are on.",
                tag: "pm4-test"
              })
            }
          >
            Send a test notification
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
