"use client";

import { useState } from "react";
import Link from "next/link";
import { House, LogOut, Mail, User, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignOut } from "@/features/auth/use-sign-out";
import { useMe } from "@/features/users/api";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { routes } from "@/lib/routes";

const menu = [
  { title: "Home", href: routes.app.dashboard, icon: House },
  { title: "Profile", href: routes.app.userProfile, icon: User }
];

/** User drawer: avatar, name, email, Home / Profile links and Sign out. */
export default function ProfileSheet() {
  const [open, setOpen] = useState(false);
  const { data: me, isPending, isError } = useMe();
  const signOut = useSignOut();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open user menu"
        className="cursor-pointer hover:bg-primary/5 flex items-center justify-center rounded-full h-10 w-10"
      >
        <UserAvatar user={me} className="h-8 w-8" />
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="border-s-0 w-full sm:max-w-80 max-w-60"
      >
        <SheetTitle className="sr-only">User menu</SheetTitle>
        <SheetClose
          aria-label="Close"
          className="absolute top-5 end-5 p-2 hover:bg-primary/5 hover:text-primary rounded-full"
        >
          <X width={20} height={20} />
        </SheetClose>

        <div className="p-6 py-6">
          <div className="flex flex-col gap-4 justify-center items-center pt-10">
            <UserAvatar user={me} className="h-16 w-16" />
            {isError && !me ? (
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t load your profile.
              </p>
            ) : isPending || !me ? (
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              <div className="text-center">
                <h6 className="text-lg font-semibold">{me.displayName}</h6>
                <div className="flex items-center gap-2 justify-center">
                  <Mail size={18} className="text-muted-foreground" />
                  <span className="text-sm font-normal text-muted-foreground">
                    {me.email}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-dashed border-border">
          <ul className="flex flex-col gap-2 p-6">
            {menu.map((item) => (
              <li key={item.title} className="group">
                <Link
                  href={item.href}
                  className="flex justify-between gap-3 py-2 px-3 rounded-md group-hover:bg-primary/5 text-muted-foreground"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      width={20}
                      height={20}
                      className="group-hover:text-primary"
                    />
                    <h6 className="text-sm group-hover:text-primary">
                      {item.title}
                    </h6>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <SheetFooter className="px-0 pb-6">
          <div className="border-t border-dashed border-border w-full">
            <div className="pt-6 flex justify-center">
              <Button
                variant="secondary"
                className="text-primary"
                onClick={() => void signOut()}
              >
                <LogOut /> Sign out
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
