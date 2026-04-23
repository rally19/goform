import { redirect } from "next/navigation";
import { createClient } from "@/lib/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "./_components/admin-sidebar";
import { AdminHeader } from "./_components/admin-header";
import { Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false }, // Admins pages shouldn't be followed either
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminLayoutStaticShell>{children}</AdminLayoutStaticShell>}>
      <AdminLayoutPersistence>{children}</AdminLayoutPersistence>
    </Suspense>
  );
}

async function AdminLayoutPersistence({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SidebarProvider>
  );
}

function AdminLayoutStaticShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SidebarProvider>
  );
}

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <Suspense fallback={<AdminSidebarGhost />}>
        <AdminSidebarDataWrapper />
      </Suspense>
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

async function AdminSidebarDataWrapper() {
  // Auth check — reads role from DB (never user_metadata)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true, name: true, email: true, avatarUrl: true },
  });

  if (!dbUser || (dbUser.role !== "admin" && dbUser.role !== "superadmin")) {
    redirect("/forbidden");
  }

  return (
    <AdminSidebar
      userRole={dbUser.role}
      userName={dbUser.name ?? user.email ?? "Admin"}
      userEmail={dbUser.email}
      userAvatarUrl={dbUser.avatarUrl}
    />
  );
}

function AdminSidebarGhost() {
  return (
    <aside className="w-64 shrink-0 hidden md:flex flex-col h-full border-r border-border bg-sidebar animate-pulse">
      <div className="h-14 border-b border-sidebar-border" />
      <div className="flex-1 p-3 space-y-4">
        <div className="h-4 bg-sidebar-accent/50 rounded w-1/3" />
        <div className="h-8 bg-sidebar-accent/50 rounded" />
        <div className="h-8 bg-sidebar-accent/50 rounded" />
      </div>
    </aside>
  );
}

