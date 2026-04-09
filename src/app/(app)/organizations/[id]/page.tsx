import { getOrganization, getOrganizationMembers } from "@/lib/actions/organizations";
import { redirect } from "next/navigation";
import { OrganizationManageClient } from "./_client";

export default async function OrganizationManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [orgRes, membersRes] = await Promise.all([
    getOrganization(id),
    getOrganizationMembers(id)
  ]);

  if (!orgRes.success || !orgRes.data) {
    redirect("/organizations");
  }

  return (
    <OrganizationManageClient 
      organization={orgRes.data}
      initialMembers={membersRes.data?.members || []}
      initialInvites={membersRes.data?.invites || []}
    />
  );
}
