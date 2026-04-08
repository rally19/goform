import { createClient } from '@/lib/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { SettingsClient } from './client';

export default async function SettingsPage() {
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

  const hasPassword = identities.some(identity => identity.provider === 'email');

  return <SettingsClient user={initialUser} identities={identities} hasPassword={hasPassword} />;
}
