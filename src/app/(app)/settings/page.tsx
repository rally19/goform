import { createClient } from '@/lib/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { SettingsClient } from './client';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export const unstable_instant = { 
  prefetch: 'static',
  samples: [
    {
      cookies: [
        { name: 'goform_workspace', value: null },
        { name: 'sb-access-token', value: null },
        { name: 'sb-refresh-token', value: null }
      ]
    }
  ]
};

export default async function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsData />
    </Suspense>
  );
}

async function SettingsData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id)
  });

  const identities = user.identities || [];

  const initialUser = dbUser || { 
    id: user.id, 
    email: user.email!, 
    name: user.user_metadata?.name || null, 
    avatarUrl: user.user_metadata?.avatar_url || null 
  };

  const hasPassword = (user.app_metadata?.providers || []).includes('email') || 
                    identities.some(identity => identity.provider === 'email');

  return <SettingsClient user={initialUser} identities={identities} hasPassword={hasPassword} />;
}

function SettingsSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8 animate-pulse">
      <div className="flex items-center justify-between space-y-2">
        <div className="h-9 w-48 bg-primary/5 rounded-md" />
      </div>

      <div className="w-full max-w-4xl space-y-6">
        {/* Tabs Skeleton */}
        <div className="flex gap-2 p-1 bg-muted/50 w-fit rounded-lg border border-border/50">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 bg-primary/5 rounded-md" />
          ))}
        </div>

        {/* Card Skeleton */}
        <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-primary/5 rounded-md" />
              <div className="h-4 w-64 bg-primary/5 rounded-md" />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center pt-2">
              <div className="h-24 w-24 rounded-full bg-primary/5 border-2 border-border" />
              <div className="space-y-2">
                <div className="h-5 w-32 bg-primary/5 rounded-md" />
                <div className="h-4 w-48 bg-primary/5 rounded-md" />
                <div className="flex gap-2 pt-1">
                  <div className="h-8 w-28 bg-primary/5 rounded-md" />
                  <div className="h-8 w-20 bg-primary/5 rounded-md" />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <div className="h-4 w-16 bg-primary/5 rounded-md" />
              <div className="h-10 w-full bg-primary/5 rounded-md border border-border" />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border/50 bg-muted/10">
            <div className="h-10 w-32 bg-primary/5 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
