"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { History, Tag, type LucideIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChangelogDoc } from "./changelog-doc";
import { VersioningDoc } from "./versioning-doc";

/** One entry per documentation topic. Add a topic here and it gets its own tab. */
const TOPICS = [
  {
    id: "versioning",
    label: "Versioning",
    icon: Tag,
    content: <VersioningDoc />
  },
  {
    id: "changelog",
    label: "Changelog",
    icon: History,
    content: <ChangelogDoc />
  }
] satisfies {
  id: string;
  label: string;
  icon: LucideIcon;
  content: React.ReactNode;
}[];

const IDS = TOPICS.map((t) => t.id) as [string, ...string[]];

/** Documentation: a column of topic tabs on the left, the selected topic on the right. */
export function DocumentationView() {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(IDS)
      .withDefault(IDS[0])
      .withOptions({ history: "replace", clearOnDefault: true })
  );
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Documentation</h1>
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
          {TOPICS.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="flex-none cursor-pointer justify-start px-3 py-2 md:w-full"
            >
              <t.icon /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TOPICS.map((t) => (
          <TabsContent key={t.id} value={t.id} className="min-w-0 flex-1">
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
