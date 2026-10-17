"use client";

import type { JSX } from "react";
import { usePmspaConnection } from "@/features/integrations/api";
import NavCollapse from "./nav-collapse";
import { connectorItems } from "./sidebaritems";

/** FR-INT-006 (D4): the Connectors section, shown once a PMSPA connection is saved, whatever its status. */
export function ConnectorsNav(): JSX.Element | null {
  const { data } = usePmspaConnection();
  if (!data || data.status === "not-configured") return null;
  return <NavCollapse menu={[connectorItems]} className="text-sm" />;
}
