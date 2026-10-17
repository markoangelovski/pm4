"use client";

import { PmspaConnectionCard } from "./pmspa-connection-card";

/**
 * FR-INT-001: Settings → Integrations. One entry per integration: adding one later means adding its card
 * here. Today the list holds only PMSPA.
 */
const INTEGRATIONS = [{ id: "pmspa", card: <PmspaConnectionCard /> }];

export function IntegrationsSettings() {
  return (
    <div className="flex flex-col gap-4">
      {INTEGRATIONS.map((i) => (
        <section key={i.id} aria-label={i.id}>
          {i.card}
        </section>
      ))}
    </div>
  );
}
