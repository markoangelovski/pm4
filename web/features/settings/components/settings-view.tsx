"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { UserRound, type LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSettings } from "./user-settings";

/** One entry per settings section. Add a section here and it gets its own tab. */
const SECTIONS = [
  {
    id: "user",
    label: "User settings",
    icon: UserRound,
    content: <UserSettings />
  }
] satisfies {
  id: string;
  label: string;
  icon: LucideIcon;
  content: React.ReactNode;
}[];

const IDS = SECTIONS.map((s) => s.id) as [string, ...string[]];

/** Settings: a column of tabs on the left, the selected section on the right. */
export function SettingsView() {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(IDS)
      .withDefault(IDS[0])
      .withOptions({ history: "replace", clearOnDefault: true })
  );
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <Tabs
        orientation="vertical"
        value={tab}
        onValueChange={(v) => setTab(v as string)}
        className="flex-col gap-4 md:flex-row md:items-start md:gap-6"
      >
        <TabsList
          variant="line"
          className="w-full flex-row overflow-x-auto md:w-56 md:shrink-0 md:flex-col md:items-stretch"
        >
          {SECTIONS.map((s) => (
            <TabsTrigger
              key={s.id}
              value={s.id}
              className="flex-none cursor-pointer justify-start px-3 py-2 md:w-full"
            >
              <s.icon /> {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {SECTIONS.map((s) => (
          <TabsContent key={s.id} value={s.id} className="min-w-0 flex-1">
            {s.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
