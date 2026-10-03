import {
  House,
  Clock,
  FolderKanban,
  ListTodo,
  Trash2,
  Settings,
  type LucideIcon
} from "lucide-react";
import { routes } from "@/lib/routes";

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

/**
 * PM4 navigation (routing.md: Dashboard, Time, Projects, Tasks, Trash, Settings).
 */
const SidebarContent: MenuItem[] = [
  {
    items: [
      {
        id: "dashboard",
        name: "Dashboard",
        icon: House,
        url: routes.app.dashboard
      },
      {
        id: "time",
        name: "Time",
        icon: Clock,
        url: routes.app.time
      },
      {
        id: "projects",
        name: "Projects",
        icon: FolderKanban,
        url: routes.app.projects
      },
      {
        id: "tasks",
        name: "Tasks",
        icon: ListTodo,
        url: routes.app.tasks
      },
      {
        id: "trash",
        name: "Trash",
        icon: Trash2,
        url: routes.app.trash
      },
      {
        id: "settings",
        name: "Settings",
        icon: Settings,
        url: routes.app.settings
      }
    ]
  }
];

export default SidebarContent;

/** The fixed sidebar footer (OQ-054): no heading. */
export const footerItems: MenuItem[] = [];
