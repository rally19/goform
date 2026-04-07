import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowUpRight, BarChart3, Plus, SquarePen, Users } from "lucide-react";
import Link from "next/link";

const stats = [
  {
    title: "Total Forms",
    value: "12",
    icon: SquarePen,
    trend: "+2 from last month",
  },
  {
    title: "Total Responses",
    value: "1,204",
    icon: Users,
    trend: "+14% from last month",
  },
  {
    title: "Completion Rate",
    value: "68%",
    icon: BarChart3,
    trend: "+2.4% from last month",
  },
];

const recentForms = [
  {
    id: "1",
    title: "Customer Feedback 2024",
    responses: 245,
    status: "Active",
    lastUpdated: "2 days ago",
  },
  {
    id: "2",
    title: "Event Registration",
    responses: 89,
    status: "Active",
    lastUpdated: "5 days ago",
  },
  {
    id: "3",
    title: "Employee Satisfaction Survey",
    responses: 14,
    status: "Draft",
    lastUpdated: "1 week ago",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/forms">
              <Plus data-icon="inline-start" className="mr-2 h-4 w-4" />
              New Form
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Forms</CardTitle>
            <CardDescription>
              A list of forms you have activity on recently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium hover:underline cursor-pointer">
                      {form.title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {form.lastUpdated}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <span className="text-sm font-medium">{form.responses} responses</span>
                      <span className="text-xs text-muted-foreground">{form.status}</span>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/forms/${form.id}/analytics`}>
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="sr-only">View Form</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-full lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Useful links and documentation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="#" className="flex items-center text-primary hover:underline">
                How to create a multi-page form
              </Link>
              <Link href="#" className="flex items-center text-primary hover:underline">
                Setting up webhook integrations
              </Link>
              <Link href="#" className="flex items-center text-primary hover:underline">
                Understanding form analytics
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
