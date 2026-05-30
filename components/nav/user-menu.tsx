"use client";

import { LogOut, Settings as SettingsIcon, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function UserMenu({ user }: { user: SessionUser }) {
  const initials = (user.name ?? user.email)
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus:outline-none focus:ring-2 focus:ring-foreground/20">
        <Avatar>
          {user.image && <AvatarImage src={user.image} alt={user.name ?? user.email} />}
          <AvatarFallback>{initials || <UserIcon className="size-3.5" />}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="text-foreground">
          <div className="flex flex-col">
            <span className="text-sm font-medium normal-case tracking-normal">{user.name ?? "Job seeker"}</span>
            <span className="truncate text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings"><SettingsIcon className="mr-2 size-4" /> Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut className="mr-2 size-4" /> Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
