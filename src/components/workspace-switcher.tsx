"use client";

import * as React from "react";
import { ChevronsUpDown, Plus, SquarePen, Building2, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingOverlay } from "@/components/loading-overlay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";

interface WorkspaceProps {
  id: string;
  name: string;
  type: "personal" | "organization";
  avatarUrl?: string | null;
}

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceProps[];
  activeWorkspaceId: string;
  onWorkspaceChange: (id: string) => Promise<void>;
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onWorkspaceChange,
}: WorkspaceSwitcherProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [isSwitching, setIsSwitching] = React.useState(false);
  
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const handleWorkspaceChange = async (id: string) => {
    try {
      setIsSwitching(true);
      await onWorkspaceChange(id);
      // Hard refresh of the current page to ensure everything (sidebar, content, etc.)
      // sees the new workspace cookie, without forcing a redirect to /forms.
      window.location.reload();
    } catch (err) {
      // Ignore errors that happen during navigation/unmount
      console.log("Workspace switch initiated...");
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-primary text-primary-foreground overflow-hidden">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={activeWorkspace?.avatarUrl || undefined} alt="Workspace Logo" />
                  <AvatarFallback className="rounded-full bg-primary text-primary-foreground">
                    {activeWorkspace?.type === "personal" ? (
                      <SquarePen className="size-4" />
                    ) : (
                      <Building2 className="size-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeWorkspace?.name || "GoForm"}
                </span>
                <span className="truncate text-xs text-muted-foreground capitalize">
                  {activeWorkspace?.type === "personal" ? "Personal Space" : "Organization"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Workspaces
            </DropdownMenuLabel>
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleWorkspaceChange(workspace.id)}
                className="gap-2 p-2 cursor-pointer"
              >
                <div className="flex size-6 items-center justify-center rounded-full border bg-background overflow-hidden">
                  <Avatar className="size-6 rounded-full">
                    <AvatarImage src={workspace.avatarUrl || undefined} />
                    <AvatarFallback className="rounded-full">
                      {workspace.type === "personal" ? (
                        <SquarePen className="size-3 shrink-0" />
                      ) : (
                        <Building2 className="size-3 shrink-0 text-primary" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="flex-1 truncate">{workspace.name}</span>
                {workspace.id === activeWorkspaceId && (
                  <Check className="size-4 opacity-50" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="gap-2 p-2 cursor-pointer"
              onClick={() => router.push("/organizations")}
            >
              <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Manage Orgs</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {isSwitching && <LoadingOverlay />}
    </SidebarMenu>
  );
}
