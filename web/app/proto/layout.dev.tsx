import { MockSession } from "@/proto/mock/session";

/**
 * UI prototype (ADR-0012): dev server only (`dev.tsx`), localhost only, mocked session and data.
 * The app shell wraps `/proto/app/**` only (`app/layout.dev.tsx`), so `/proto` can hold the landing
 * page's twin, which has its own header like the real `/`.
 */
export default function ProtoLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <MockSession>{children}</MockSession>;
}
