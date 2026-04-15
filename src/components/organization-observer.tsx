"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/client";
import { toast } from "sonner";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";
import { setActiveWorkspace } from "@/lib/actions/organizations";

interface OrganizationObserverProps {
  currentUserId: string;
  activeWorkspaceId: string;
}

export function OrganizationObserver({ currentUserId, activeWorkspaceId }: OrganizationObserverProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isInitialMount = useRef(true);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`personal-memberships-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organization_members",
          filter: `user_id=eq.${currentUserId}`,
        },
        async (payload: any) => {
          console.log("Membership change detected:", payload.eventType, payload);

          if (payload.eventType === "UPDATE") {
            const newRole = (payload.new as any).role;
            toast.info(`Your role has been updated to ${newRole}`);
            router.refresh();
          }

          if (payload.eventType === "DELETE") {
            // If the user was kicked, we need to ensure they aren't on a page they no longer have access to.
            toast.error("Your organization access has been removed");
            
            // 1. Force a server-side refresh to update permissions/session
            router.refresh();

            // 2. Pro-actively check if we are in restricted territory
            // If we are in an organization-specific route or a form, we might need a push.
            setTimeout(async () => {
              const currentPath = window.location.pathname;
              const isOrgPath = currentPath.startsWith("/organizations/");
              const isFormPath = currentPath.startsWith("/forms/");
              
              if (isOrgPath || isFormPath) {
                 // We don't know exactly which org was deleted (payload.old might be partial),
                 // but a refresh + push to /forms is the safest "kick" behavior.
                 // We only do this if the active workspace was an organization.
                 if (activeWorkspaceId !== PERSONAL_WORKSPACE_ID) {
                    await setActiveWorkspace(PERSONAL_WORKSPACE_ID);
                    router.push("/forms");
                    router.refresh();
                 }
              }
            }, 1000);
          }

          if (payload.eventType === "INSERT") {
            toast.success("You have been added to a new organization");
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activeWorkspaceId, router, pathname]);

  return null;
}
