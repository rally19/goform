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

    const membershipChannel = supabase
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
            toast.error("Your organization access has been removed");
            router.refresh();

            setTimeout(async () => {
              const currentPath = window.location.pathname;
              const isOrgPath = currentPath.startsWith("/organizations/");
              const isFormPath = currentPath.startsWith("/forms/");
              
              if (isOrgPath || isFormPath) {
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
      );

    const userChannel = supabase
      .channel(`user-profile-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${currentUserId}`,
        },
        (payload: any) => {
          console.log("User profile update detected:", payload);
          const oldRole = (payload.old as any)?.role;
          const newRole = (payload.new as any).role;
          
          if (oldRole && oldRole !== newRole) {
            toast.success(`Your account permissions have been updated to ${newRole}`);
          } else {
            toast.info("Your profile information has been updated");
          }
          
          router.refresh();
        }
      );

    membershipChannel.subscribe();
    userChannel.subscribe();

    return () => {
      supabase.removeChannel(membershipChannel);
      supabase.removeChannel(userChannel);
    };
  }, [currentUserId, activeWorkspaceId, router, pathname]);

  return null;
}
