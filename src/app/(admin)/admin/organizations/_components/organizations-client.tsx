"use client";

import { useState } from "react";
import { 
  AdminOrganization, 
  adminDeleteOrganization 
} from "@/lib/actions/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MoreHorizontal, 
  Search, 
  Building2, 
  Users, 
  FileText, 
  ExternalLink,
  Edit,
  Trash2,
  AlertTriangle,
  ArrowRight,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export function OrganizationsClient({ 
  initialOrganizations 
}: { 
  initialOrganizations: AdminOrganization[] 
}) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<AdminOrganization | null>(null);

  const filteredOrgs = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!orgToDelete) return;

    setIsDeleting(true);
    try {
      const result = await adminDeleteOrganization(orgToDelete.id);
      if (result.success) {
        setOrganizations(prev => prev.filter(o => o.id !== orgToDelete.id));
        toast.success("Organization deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete organization");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setOrgToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background shadow-sm border-border/50 focus-visible:ring-primary/20"
          />
        </div>
        <div className="text-xs font-medium text-muted-foreground bg-muted/30 px-2.5 py-1.5 rounded-md border border-border/50">
          Total: {filteredOrgs.length} organizations
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-[300px]">Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Building2 className="h-8 w-8 opacity-20" />
                    <p className="text-sm">No organizations found matching your search.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrgs.map((org) => (
                <TableRow key={org.id} className="hover:bg-muted/20 border-border/40 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-lg border border-border/50 shadow-sm shrink-0">
                        <AvatarImage src={org.avatarUrl || ""} />
                        <AvatarFallback className="bg-primary/5 text-primary rounded-lg">
                          <Building2 className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm truncate leading-none mb-1">
                          {org.name}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground truncate opacity-70">
                          {org.id}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {org.ownerDeletedAt ? (
                      <Badge variant="outline" className="bg-amber-500/5 text-amber-600 border-amber-500/20 text-[10px] py-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Owner Deleted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 text-[10px] py-0">
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5" title="Members">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium">{org.memberCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Forms">
                        <FileText className="h-3.5 w-3.5 text-violet-500" />
                        <span className="text-xs font-medium">{org.formCount}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Link href={`/admin/organizations/${org.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs font-medium opacity-50 uppercase tracking-wider">Options</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/organizations/${org.id}`} target="_blank" className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4" />
                              View as Owner
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2"
                            onClick={() => setOrgToDelete(org)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Organization
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!orgToDelete} onOpenChange={(open) => !open && setOrgToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the organization <strong>{orgToDelete?.name}</strong> and all associated 
              data including forms, members, and responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Organization"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
