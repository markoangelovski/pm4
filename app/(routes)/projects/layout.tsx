import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Overview of all projects"
};

export default function Layout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
