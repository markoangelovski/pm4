import type { ComponentProps, ReactNode } from "react";
import type { Button } from "@/components/ui/button";

type ButtonProps = ComponentProps<typeof Button>;

/** Renders the header's "Go to app" / "Login" call to action (FR-LAND-002) in the given style. */
export type LandingCtaSlot = (props: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) => ReactNode;

export function LandingPage(_props: {
  cta: LandingCtaSlot;
}): React.JSX.Element {
  throw new Error("not implemented (feat-land-redesign)");
}
