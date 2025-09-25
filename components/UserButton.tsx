"use client";

import { CircleUserRoundIcon } from "lucide-react"
import { useSession } from "next-auth/react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { userSignOut } from "@/actions/auth.actions"

export default function UserButton() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="outline" aria-label="Open account menu" className="rounded-full overflow-hidden p-0! h-8 w-8 absolute top-2 right-2 z-50">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              width={500}
              height={500}
              className="rounded-full w-full h-full"
            />
          ) : (
            <CircleUserRoundIcon size={16} aria-hidden="true" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-64">
        <DropdownMenuLabel className="flex flex-col">
          <span>Signed in as</span>
          <span className="text-foreground text-xs font-normal">
            {session.user.name || session.user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => userSignOut()}>
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
