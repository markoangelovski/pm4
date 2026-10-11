"use client";

import { useSyncExternalStore } from "react";
import NotFound from "@/app/not-found";

const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const noop = () => () => {};

/**
 * The prototype's session gate: always signed in as `MOCK_USER` (seed.ts), no real auth code. Renders
 * the not-found page on any host other than localhost (specs/04-web/prototype.md), and nothing on the
 * server render, where the host isn't known.
 */
export function MockSession({ children }: { children: React.ReactNode }) {
  const host = useSyncExternalStore(
    noop,
    () => window.location.hostname,
    () => null
  );
  if (host === null) return null;
  return LOCAL_HOSTS.includes(host) ? children : <NotFound />;
}
