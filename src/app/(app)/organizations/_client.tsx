"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Users, Settings, SquarePen, Loader2 } from "lucide-react";
import { createOrganization, setActiveWorkspace, PERSONAL_WORKSPACE_ID } from "@/lib/actions/organizations";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function OrganizationsClient({ organizations, activeWorkspaceId }: { organizations: any[], activeWorkspaceId: string }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    
    setIsCreating(true);
    const res = await createOrganization({ name: orgName });
    setIsCreating(false);

    if (res.success) {
      toast.success("Organization created");
      setOpen(false);
      setOrgName("");
      // Forces a full refresh to push new cookie to layout
      window.location.assign("/organizations");
    } else {
      toast.error(res.error || "Failed to create organization");
    }
  };

  const switchWorkspace = async (id: string) => {
    if (activeWorkspaceId === id) return;
    await setActiveWorkspace(id);
    window.location.assign("/dashboard");
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Organizations</h2>
          <p className="text-muted-foreground mt-1">
            Manage your teams, workspaces, and members.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create an Organization</DialogTitle>
                  <DialogDescription>
                    Collaborate with others by moving forms into a shared workspace.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Organization Name</Label>
                    <Input
                      id="name"
                      placeholder="Acme Corp"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || !orgName.trim()}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Personal Workspace */}
        <Card 
          className="relative overflow-hidden cursor-pointer hover:border-primary transition-all shadow-sm"
          onClick={() => switchWorkspace(PERSONAL_WORKSPACE_ID)}
        >
          {activeWorkspaceId === PERSONAL_WORKSPACE_ID && (
            <div className="absolute top-0 right-0 p-4">
               <div className="px-2 py-1 text-xs bg-primary/10 text-primary font-medium rounded-full">
                 Current
               </div>
            </div>
          )}
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
               <div className="bg-muted flex items-center justify-center h-10 w-10 rounded-md">
                 <SquarePen className="size-5 text-foreground" />
               </div>
            </div>
            <CardTitle>Personal Workspace</CardTitle>
            <CardDescription>Your private forms and submissions.</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>

        {/* Organizations */}
        {organizations.map((org) => (
          <Card 
            key={org.id} 
            className="relative cursor-pointer hover:border-primary transition-all shadow-sm flex flex-col"
            onClick={() => switchWorkspace(org.id)}
          >
            {activeWorkspaceId === org.id && (
              <div className="absolute top-0 right-0 p-4">
                 <div className="px-2 py-1 text-xs bg-primary/10 text-primary font-medium rounded-full">
                   Current
                 </div>
              </div>
            )}
            <CardHeader className="pb-4">
               <div className="flex items-center justify-between mb-2">
                 <div className="bg-muted flex items-center justify-center h-10 w-10 rounded-md border border-border">
                   <Building2 className="size-5 text-foreground" />
                 </div>
              </div>
              <CardTitle className="flex items-center gap-2">
                {org.name}
              </CardTitle>
              <CardDescription className="line-clamp-1">{org.description || "Shared collective workspace"}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
               <div className="flex items-center justify-between">
                 <Badge variant="secondary" className="capitalize">{org.role}</Badge>
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/organizations/${org.id}`);
                    }}
                  >
                   <Settings className="size-3.5" /> Manage
                 </Button>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
