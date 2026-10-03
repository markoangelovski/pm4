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
import { VersionBadge } from "@/features/system/components/version-badge";
import FullLogo from "../../shared/logo/full-logo";
import sidebaritems, { footerItems } from "./sidebaritems";
import NavCollapse from "./nav-collapse";
import { Skeleton } from "@/components/ui/skeleton";

function NavSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

function FooterSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      {...props}
      className="sidebar-box **:data-[slot=sidebar-inner]:bg-background **:data-[slot=sidebar-inner]:border **:data-[slot=sidebar-inner]:border-border group-data-[state=collapsed]:hover:shadow-xl"
      side="left"
    >
      <SidebarHeader className="p-3 group-data-[state=collapsed]:px-2.5 flex flex-row items-center justify-between border-b border-border">
        <FullLogo />
        <VersionBadge className="group-data-[state=collapsed]:hidden" />
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-full">
          <SidebarGroup className="flex items-center justify-center group-data-[state=collapsed]:px-2 px-3 py-4">
            <div className="px-0 group-data-[state=collapsed]:px-0 w-full flex flex-col gap-4">
              {/* usePathname suspends under Cache Components when dynamic params are unknown */}
              <Suspense fallback={<NavSkeleton />}>
                <NavCollapse menu={sidebaritems} className="text-sm" />
              </Suspense>
            </div>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3 group-data-[state=collapsed]:px-2">
        {/* usePathname suspends under Cache Components when dynamic params are unknown */}
        <Suspense fallback={<FooterSkeleton />}>
          <NavCollapse menu={footerItems} className="text-sm" />
        </Suspense>
      </SidebarFooter>
    </Sidebar>
  );
}
