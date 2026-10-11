import { MockSession } from "@/proto/mock/session";
import { ProtoShell } from "@/proto/mock/shell/proto-shell";

/** UI prototype (ADR-0012): dev server only (`dev.tsx`), localhost only, mocked session and data. */
export default function ProtoLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <MockSession>
      <ProtoShell>{children}</ProtoShell>
    </MockSession>
  );
}
