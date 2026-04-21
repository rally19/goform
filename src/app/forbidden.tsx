import { Button } from "@/components/ui/button";
import { ShieldAlert, Home, LifeBuoy } from "lucide-react";
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex-1 flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-destructive/10 via-background to-background">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
            <div className="relative h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Access Denied
          </h1>
          <p className="text-muted-foreground text-lg">
            You don't have permission to access this resource. This may be because your membership was revoked or the resource was moved.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full text-base h-12 gap-2" asChild>
            <Link href="/dashboard">
              <Home className="h-5 w-5" />
              Return to Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="w-full text-base h-12 gap-2">
            <LifeBuoy className="h-5 w-5" />
            Contact Support
          </Button>
        </div>

        <p className="text-sm text-muted-foreground/60">
          Error Code: 403_FORBIDDEN
        </p>
      </div>
    </main>
  );
}
