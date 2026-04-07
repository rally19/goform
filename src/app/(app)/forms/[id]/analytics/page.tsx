import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Clock, Users } from "lucide-react";

export default function FormAnalyticsPage() {
  return (
    <div className="p-4 pt-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
        <h2 className="text-2xl font-bold tracking-tight">Analytics & Results</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245</div>
            <p className="text-xs text-muted-foreground">+12 since yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">84%</div>
            <p className="text-xs text-muted-foreground">High engagement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Complete</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2m 14s</div>
            <p className="text-xs text-muted-foreground">Optimal duration</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>
            The latest data submitted to your form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="hidden md:table-cell">Feedback</TableHead>
                  <TableHead className="text-right">Submitted At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  {
                     email: "alex@example.com",
                     rating: "5/5",
                     feedback: "Great service, very happy with the results.",
                     time: "10 mins ago"
                  },
                  {
                     email: "sam@example.com",
                     rating: "4/5",
                     feedback: "Good, but could be faster.",
                     time: "1 hour ago"
                  },
                   {
                     email: "jordan@example.com",
                     rating: "5/5",
                     feedback: "Absolutely love the new features!",
                     time: "2 hours ago"
                  },
                   {
                     email: "anonymous",
                     rating: "3/5",
                     feedback: "It does the job.",
                     time: "3 hours ago"
                  }
                ].map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.email}</TableCell>
                    <TableCell><Badge variant="secondary">{row.rating}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[250px]">
                      {row.feedback}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">{row.time}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
