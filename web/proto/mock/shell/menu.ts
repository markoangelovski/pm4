// Twin of the menu types in app/(dashboard-layout)/layout/vertical/sidebar/sidebaritems.ts.
import type { LucideIcon } from "lucide-react";

export interface ChildItem {
  id?: string;
  name: string;
  icon?: LucideIcon;
  items?: ChildItem[];
  url?: string;
  color?: string;
  disabled?: boolean;
  external?: boolean;
  isActive?: boolean;
}

export interface MenuItem {
  heading?: string;
  items?: ChildItem[];
}
