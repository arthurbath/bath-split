import { useEffect, useState } from 'react';
import { HouseholdSetup } from '@/components/HouseholdSetup';
import { AppShell } from '@/components/AppShell';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/useAuth';
import { useHouseholdData } from '@/hooks/useHouseholdData';
import { supabase } from '@/integrations/supabase/client';
import AuthPage from '@/platform/components/AuthPage';

const Index = () => {
  const { user, loading: authLoading, isSigningOut, signOut } = useAuth();
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null);
  const {
    household,
    loading: hhLoading,
    createHousehold,
    joinHousehold,
    updatePartnerSettings,
    householdMembers,
    householdMembersLoading,
    householdMembersError,
    pendingHouseholdMemberId,
    rotatingHouseholdInviteCode,
    leavingHousehold,
    deletingHousehold,
    rotateHouseholdInviteCode,
    removeHouseholdMember,
    leaveHousehold,
    deleteHousehold,
  } = useHouseholdData(user);
  const setupDisplayName = profileDisplayName ?? user?.email ?? 'You';

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

  if (authLoading || hhLoading || isSigningOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <>
      {!household ? (
        <HouseholdSetup
          userId={user.id}
          displayName={setupDisplayName}
          onSignOut={signOut}
          onComplete={createHousehold}
          onJoin={joinHousehold}
        />
      ) : (
        <AppShell
          household={household}
          userId={user.id}
          userEmail={user.email ?? ''}
          onSignOut={signOut}
          onUpdatePartnerSettings={updatePartnerSettings}
          householdMembers={householdMembers}
          householdMembersLoading={householdMembersLoading}
          householdMembersError={householdMembersError}
          pendingHouseholdMemberId={pendingHouseholdMemberId}
          rotatingHouseholdInviteCode={rotatingHouseholdInviteCode}
          leavingHousehold={leavingHousehold}
          deletingHousehold={deletingHousehold}
          onRotateHouseholdInviteCode={rotateHouseholdInviteCode}
          onRemoveHouseholdMember={removeHouseholdMember}
          onLeaveHousehold={leaveHousehold}
          onDeleteHousehold={deleteHousehold}
        />
      )}
    </>
  );
};

export default Index;
