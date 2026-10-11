import * as React from "react";
import { Suspense } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import FullLogo from "./full-logo";
import NavCollapse from "./nav-collapse";
import { protoFooterItems, protoSidebarItems } from "./proto-sidebar-items";

export function ProtoSidebar() {
  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="sidebar-box **:data-[slot=sidebar-inner]:bg-background **:data-[slot=sidebar-inner]:border **:data-[slot=sidebar-inner]:border-border group-data-[state=collapsed]:hover:shadow-xl"
      side="left"
    >
      <SidebarHeader className="p-3 group-data-[state=collapsed]:px-2.5 flex flex-row items-center justify-between border-b border-border">
        <FullLogo />
        <span className="px-1.5 py-0.5 text-xs font-medium text-amber-600 group-data-[state=collapsed]:hidden">
          Prototype
        </span>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarGroup className="flex items-center justify-center group-data-[state=collapsed]:px-2 px-3 py-4">
            <div className="w-full flex flex-col gap-4">
              <Suspense fallback={<Skeleton className="h-8 w-full" />}>
                <NavCollapse menu={protoSidebarItems} className="text-sm" />
              </Suspense>
            </div>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3 group-data-[state=collapsed]:px-2">
        <Suspense fallback={<Skeleton className="h-8 w-full" />}>
          <NavCollapse menu={protoFooterItems} className="text-sm" />
        </Suspense>
      </SidebarFooter>
    </Sidebar>
  );
}
