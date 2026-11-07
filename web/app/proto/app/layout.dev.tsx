import { ProtoShell } from "@/proto/mock/shell/proto-shell";

/** The prototype's app shell (sidebar, header, footer) around every `/proto/app/**` screen. */
export default function ProtoAppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <ProtoShell>{children}</ProtoShell>;
}
