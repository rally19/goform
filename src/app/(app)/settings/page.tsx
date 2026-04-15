import { createClient } from '@/lib/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { SettingsClient } from './client';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export const unstable_instant = { prefetch: 'static' };

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
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading settings...</p>
    </div>
  );
}
