import React from "react";
import type { Metadata } from "next";
import { Geist } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/Themeprovider";
import { QueryProvider } from "@/lib/query-client";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist"
});

export const metadata: Metadata = {
  title: {
    template: "%s | PM4",
    default: "PM4"
  },
  description: "PM4: projects, tasks and time tracking.",
  robots: {
    index: false,
    follow: false
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-color-theme="CUSTOM_THEME"
      data-layout="vertical"
      data-boxed-layout="boxed"
      data-sidebar-type="true"
      data-card-shadow="false"
      className="style-lyra"
    >
      <body className={`${geist.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
