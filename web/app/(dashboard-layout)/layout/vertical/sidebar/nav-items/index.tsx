"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { ChildItem } from "../sidebaritems";

interface NavItemProps {
  item: ChildItem;
  hasChildren: boolean;
  className?: string;
  isActive?: boolean;
}

export default function NavItem({
  item,
  hasChildren,
  className,
  isActive
}: NavItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 w-full group/item relative group-data-[state=collapsed]:px-2.5 px-3 py-2 my-0.5 rounded-md",
        isActive && "bg-primary text-background font-medium",
        className
      )}
    >
      {/* Hover highlight (template look without motion, OQ-053) */}
      <span
        aria-hidden="true"
        data-slot="nav-hover-bg"
        className="pointer-events-none absolute inset-0 rounded-lg bg-primary/5 opacity-0 transition-opacity duration-200 ease-out group-hover/item:opacity-100 motion-reduce:transition-none"
      />
      <span className="relative flex items-center gap-2 w-full rounded-md">
        {/* Icon */}
        {item.icon && <item.icon className={`h-4 w-4 ${item.color ?? ""}`} />}

        {/* Name */}
        <span className="font-medium hide-menu">{item.name}</span>

        {/* Chevron only if it has children */}
        {hasChildren && (
          <ChevronRight className="ms-auto h-4 w-4 transition-transform duration-200 group-open/nav:rotate-90 hide-menu" />
        )}
      </span>
    </div>
  );
}
