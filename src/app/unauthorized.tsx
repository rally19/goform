import { Button } from "@/components/ui/button";
import { Lock, LogIn } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <div className="relative h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Lock className="h-10 w-10 text-primary" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Session Expired
          </h1>
          <p className="text-muted-foreground text-lg">
            Please log in to your account to continue accessing your forms and workspaces.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full text-base h-12 gap-2" asChild>
            <Link href="/login">
              <LogIn className="h-5 w-5" />
              Log In to Continue
            </Link>
          </Button>
          <Button variant="ghost" size="lg" className="w-full text-base h-12" asChild>
            <Link href="/">
              Go Back Home
            </Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground/60 italic">
          Your security is our priority. Inactive sessions are cleared automatically.
        </p>
      </div>
    </main>
  );
}
