"use client";

import { PanelLeft, Clock } from "lucide-react";
import FullLogo from "../../shared/logo/full-logo";
import Profile from "../../shared/header/profile";
import LightDark from "../../shared/header/light-dark";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const Header = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <header className={cn("sticky top-0 z-2 bg-background border-b border-border")}>
      <nav>
        <div className="mx-auto flex flex-wrap items-center justify-between p-2">
          <div className="flex gap-2 items-center">
            <div className="block lg:hidden">
              <FullLogo />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="p-2 hover:bg-primary/5 rounded-full transition cursor-pointer"
              onClick={toggleSidebar}
            >
              <PanelLeft size={21} />
            </Button>

            <Separator
              orientation="vertical"
              className="h-4 mr-4 ml-2 data-[orientation=vertical]:self-center max-lg:hidden"
            />
          </div>

          <div className="flex sm:gap-2 gap-1 items-center">
            {/* TODO(M4): wire up the real "log a time entry" flow (FR-TLOG-008) */}
            <Button variant="outline" size="sm" disabled className="gap-2">
              <Clock className="size-4" />
              <span className="hidden sm:inline">Log time</span>
            </Button>
            <LightDark />
            <Profile />
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
