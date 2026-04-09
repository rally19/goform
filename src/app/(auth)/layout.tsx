import { ThemeToggle } from "@/components/theme-toggle";
import { SquarePen } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Visual / Brand Side */}
      <div className="relative hidden flex-col bg-muted p-10 text-zinc-950 dark:text-zinc-50 lg:flex dark:border-r border-border">
        {/* Decorative background gradients */}
        <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-900" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.08)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
        
        <div className="relative z-20 flex items-center gap-2 text-lg font-medium">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
            <SquarePen className="size-4" />
          </div>
          GoForm
        </div>
        
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg/relaxed">
              "GoForm has completely revolutionized how we capture user data. The dynamic builder is an absolute joy to use and saves us countless hours."
            </p>
            <footer className="text-sm/snug text-zinc-600 dark:text-zinc-400">Sofia Davis, Product Manager at Acme Corp</footer>
          </blockquote>
        </div>
      </div>
      
      {/* Form Side */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
