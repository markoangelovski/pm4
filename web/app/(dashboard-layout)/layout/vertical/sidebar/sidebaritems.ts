import {
  House,
  Clock,
  FolderKanban,
  ListTodo,
  Trash2,
  Settings,
  type LucideIcon,
} from "lucide-react";

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
        url: "/",
      },
      {
        id: "time",
        name: "Time",
        icon: Clock,
        url: "/time/",
      },
      {
        id: "projects",
        name: "Projects",
        icon: FolderKanban,
        url: "/projects/",
      },
      {
        id: "tasks",
        name: "Tasks",
        icon: ListTodo,
        url: "/tasks/",
      },
      {
        id: "trash",
        name: "Trash",
        icon: Trash2,
        url: "/trash/",
      },
      {
        id: "settings",
        name: "Settings",
        icon: Settings,
        url: "/settings/",
      },
    ],
  },
];

export default SidebarContent;
