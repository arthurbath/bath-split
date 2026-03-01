import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/platform/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import AuthPage from '@/platform/components/AuthPage';
import { GarageShell } from '@/modules/garage/components/GarageShell';

export default function GarageIndex() {
  const { user, loading: authLoading, isSigningOut, signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin(user?.id);
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const displayName = profileDisplayName ?? user?.email ?? 'You';

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setProfileDisplayName(null);
      return;
    }

    let cancelled = false;
    void supabase
      .from('bathos_profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return;
        setProfileDisplayName(data?.display_name?.trim() || null);
      })
      .catch(() => {
        // Fallback keeps email-based display name.
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (authLoading || roleLoading || isSigningOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return <AuthPage />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <GarageShell userId={user.id} displayName={displayName} onSignOut={signOut} />;
}
