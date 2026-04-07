import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, MoreHorizontal, Plus, Search, Settings, SquarePen, Trash, TrendingUp } from "lucide-react";
import Link from "next/link";

const forms = [
  {
    id: "f-1234",
    title: "Customer Feedback 2024",
    status: "Active",
    responses: 245,
    lastUpdated: "2024-03-24",
  },
  {
    id: "f-5678",
    title: "Event Registration",
    status: "Active",
    responses: 89,
    lastUpdated: "2024-03-22",
  },
  {
    id: "f-9012",
    title: "Employee Satisfaction Survey",
    status: "Draft",
    responses: 0,
    lastUpdated: "2024-03-15",
  },
  {
    id: "f-3456",
    title: "Product Feature Voting",
    status: "Closed",
    responses: 1205,
    lastUpdated: "2024-01-10",
  },
];

export default function FormsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Forms</h2>
          <p className="text-muted-foreground mt-1">
            Manage your forms, view analytics and edit schemas.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Form
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search forms..."
            className="pl-8 w-full"
          />
        </div>
        {/* Additional filters could go here */}
      </div>

      <div className="rounded-md border border-border mt-4 overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Responses</TableHead>
              <TableHead className="hidden md:table-cell">Last Updated</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map((form) => (
              <TableRow key={form.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                     <span>{form.title}</span>
                     <span className="text-xs text-muted-foreground font-normal md:hidden">
                       Updated {form.lastUpdated}
                     </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      form.status === "Active"
                        ? "default"
                        : form.status === "Closed"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {form.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{form.responses}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {form.lastUpdated}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                         <Link href={`/forms/${form.id}/edit`} className="cursor-pointer">
                           <SquarePen className="h-4 w-4 mr-2" />
                           Edit Form
                         </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                         <Link href={`/forms/${form.id}/analytics`} className="cursor-pointer">
                           <TrendingUp className="h-4 w-4 mr-2" />
                           View Analytics
                         </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                         <Link href={`/forms/${form.id}/settings`} className="cursor-pointer">
                           <Settings className="h-4 w-4 mr-2" />
                           Settings
                         </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
