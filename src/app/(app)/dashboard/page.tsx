import { getActiveWorkspace, getOrganization } from "@/lib/actions/organizations";
import { PERSONAL_WORKSPACE_ID } from "@/lib/constants";
import { getDashboardStats, getForms } from "@/lib/actions/forms";
import { getCurrentUserProfile } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowUpRight, BarChart3, Plus, SquarePen, Users,
  CheckCircle2, Clock, TrendingUp, FileText, Building2,
} from "lucide-react";
import { formatDistanceToNow } from "../forms/_components/date-utils";
import Link from "next/link";

export default async function DashboardPage() {
  const [statsResult, formsResult, workspaceId, userResult] = await Promise.all([
    getDashboardStats(),
    getForms(),
    getActiveWorkspace(),
    getCurrentUserProfile(),
  ]);

  const user = userResult.success ? userResult.data : null;
  const firstName = user?.name?.split(" ")[0] || "there";

  const isPersonal = workspaceId === PERSONAL_WORKSPACE_ID;
  const workspaceResult = !isPersonal ? await getOrganization(workspaceId) : null;
  const workspace = workspaceResult?.success ? workspaceResult.data : null;

  const stats = statsResult.success && statsResult.data
    ? statsResult.data
    : { totalForms: 0, totalResponses: 0, activeForms: 0 };

  const recentForms = formsResult.success && formsResult.data
    ? formsResult.data.slice(0, 5)
    : [];

  const statCards = [
    {
      title: "Total Forms",
      value: (stats.totalForms ?? 0).toLocaleString(),
      icon: SquarePen,
      description: `${stats.activeForms ?? 0} active`,
    },
    {
      title: "Total Responses",
      value: (stats.totalResponses ?? 0).toLocaleString(),
      icon: Users,
      description: "All time",
    },
    {
      title: "Active Forms",
      value: (stats.activeForms ?? 0).toLocaleString(),
      icon: CheckCircle2,
      description: "Currently accepting responses",
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8 overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome back to GoForm, {user?.name || "User"}!
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isPersonal ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    <SquarePen className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span>Personal Workspace</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={workspace?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    <Building2 className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-foreground">{workspace?.name}</span>
                <span className="text-muted-foreground/60">•</span>
                <Badge variant="secondary" className="h-4 px-1 text-[9px] uppercase font-bold">
                  {workspace?.currentUserRole}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4">
        {/* Recent Forms */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Recent Forms</CardTitle>
            <CardDescription>
              Your most recently opened forms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentForms.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No forms yet</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/forms">Create your first form</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentForms.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: form.accentColor }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{form.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant={form.status === "active" ? "default" : "secondary"}
                            className="text-[10px] h-4"
                          >
                            {form.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {form.responseCount} responses
                          </span>
                          <span className="text-muted-foreground/40 text-[10px]">•</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Opened {formatDistanceToNow(new Date(form.updatedAt))}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                      <Link href={`/forms/${form.id}/analytics`}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
