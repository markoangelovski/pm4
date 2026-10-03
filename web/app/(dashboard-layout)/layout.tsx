"use client";
import React from "react";
import Header from "./layout/vertical/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Footer from "./layout/footer";
import { AppSidebar } from "./layout/vertical/sidebar/app-sidebar";
import { AuthGuard } from "@/features/auth/components/auth-guard";
import { cn } from "@/lib/utils";
import RouteErrorBoundary from "@/app/components/shared/route-error-boundary";

export default function Layout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <SidebarProvider
        defaultOpen={true}
        style={{ "--sidebar-width-icon": "52px" } as React.CSSProperties}
      >
        <AppSidebar />
        <SidebarInset className="outline outline-border m-2 rounded-none! overflow-hidden">
          <Header />
          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className={cn("w-full mx-auto", "container")}>
              <div className=" min-h-[calc(100vh-140px)]">
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
    </AuthGuard>
  );
}
