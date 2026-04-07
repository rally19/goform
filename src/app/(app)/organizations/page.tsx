import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Plus, Users, Settings } from "lucide-react";

export default function OrganizationsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Organizations</h2>
          <p className="text-muted-foreground mt-1">
            Manage your teams, workspaces, and members.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Personal Workspace */}
        <Card className="relative overflow-hidden cursor-pointer hover:border-primary transition-all shadow-sm">
          <div className="absolute top-0 right-0 p-4">
             <div className="px-2 py-1 text-xs bg-primary/10 text-primary font-medium rounded-full">
               Current
             </div>
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-2">
               <div className="bg-muted p-2 rounded-md">
                 <Users className="size-5 text-foreground" />
               </div>
            </div>
            <CardTitle>Personal Workspace</CardTitle>
            <CardDescription>Your private forms and submissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
               <div className="flex items-center gap-1">
                 <Users className="size-4" /> 1 Member
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Acme Corp */}
        <Card className="cursor-pointer hover:border-primary transition-all shadow-sm">
          <CardHeader className="pb-4">
             <div className="flex items-center gap-2 mb-2">
               <div className="bg-muted p-2 rounded-md border border-border">
                 <Building2 className="size-5 text-foreground" />
               </div>
            </div>
            <CardTitle>Acme Corp</CardTitle>
            <CardDescription>Company shared forms.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
               <div className="flex items-center gap-1">
                 <Users className="size-4" /> 12 Members
               </div>
               <div className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors">
                 <Settings className="size-4" /> Settings
               </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
