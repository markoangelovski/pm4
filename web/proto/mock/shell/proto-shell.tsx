"use client";

import React from "react";
import RouteErrorBoundary from "@/app/components/shared/route-error-boundary";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Footer from "./footer";
import Header from "./header";
import { ProtoSidebar } from "./proto-sidebar";

/** The `/proto/app` shell: twins of the real header and footer around the prototype sidebar. */
export function ProtoShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ "--sidebar-width-icon": "52px" } as React.CSSProperties}
    >
      <ProtoSidebar />
      <SidebarInset className="outline outline-border m-2 rounded-none! overflow-hidden">
        <Header />
        <div className="px-4 py-1 text-center text-xs dark:text-amber-400">
          UI prototype: mock data in memory, reset on every reload.
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="w-full mx-auto container">
            <div className="min-h-[calc(100vh-140px)]">
              <RouteErrorBoundary title="Page error">
                {children}
              </RouteErrorBoundary>
            </div>
            <div className="pt-6">
              <Footer />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
