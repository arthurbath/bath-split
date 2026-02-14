import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface HouseholdData {
  householdId: string;
  householdName: string;
  inviteCode: string | null;
  partnerX: string;
  partnerY: string;
  myLabel: 'X' | 'Y';
  hasBothPartners: boolean;
}

export function useHouseholdData(user: User | null) {
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHousehold = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id, partner_label')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) { setLoading(false); return; }

    const { data: hh } = await supabase
      .from('households')
      .select('id, name, invite_code')
      .eq('id', membership.household_id)
      .single();

    if (!hh) { setLoading(false); return; }

    const { data: members } = await supabase
      .from('household_members')
      .select('partner_label, user_id')
      .eq('household_id', hh.id);

    let partnerX = 'Partner X';
    let partnerY = 'Partner Y';

    if (members) {
      for (const m of members) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', m.user_id)
          .single();
        const name = profile?.display_name ?? 'Partner';
        if (m.partner_label === 'X') partnerX = name;
        else partnerY = name;
      }
    }

    setHousehold({
      householdId: hh.id,
      householdName: hh.name,
      inviteCode: (hh as any).invite_code ?? null,
      partnerX,
      partnerY,
      myLabel: membership.partner_label as 'X' | 'Y',
      hasBothPartners: (members?.length ?? 0) >= 2,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchHousehold(); }, [fetchHousehold]);

  const createHousehold = async (displayName: string) => {
    if (!user) throw new Error('Not authenticated');

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id);
    if (profileErr) throw new Error(`Profile update failed: ${profileErr.message}`);

    const householdId = crypto.randomUUID();
    const { error: hhErr } = await supabase
      .from('households')
      .insert({ id: householdId, name: 'My Household' });
    if (hhErr) throw new Error(`Household creation failed: ${hhErr.message}`);

    const { error: memberErr } = await supabase.from('household_members').insert({
      household_id: householdId,
      user_id: user.id,
      partner_label: 'X',
    });
    if (memberErr) throw new Error(`Member insert failed: ${memberErr.message}`);

    await fetchHousehold();
  };

  const joinHousehold = async (displayName: string, inviteCode: string) => {
    if (!user) throw new Error('Not authenticated');

    // Update display name
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id);
    if (profileErr) throw new Error(`Profile update failed: ${profileErr.message}`);

    // Find household by invite code
    const { data: hh, error: findErr } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', inviteCode)
      .maybeSingle();

    if (findErr) throw new Error(`Lookup failed: ${findErr.message}`);
    if (!hh) throw new Error('Invalid invite code. Please check and try again.');

    // Check if household already has 2 members
    const { data: members } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', hh.id);

    if (members && members.length >= 2) {
      throw new Error('This household already has two partners.');
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', hh.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) throw new Error('You are already a member of this household.');

    // Join as partner Y
    const { error: memberErr } = await supabase.from('household_members').insert({
      household_id: hh.id,
      user_id: user.id,
      partner_label: 'Y',
    });
    if (memberErr) throw new Error(`Join failed: ${memberErr.message}`);

    await fetchHousehold();
  };

  return { household, loading, createHousehold, joinHousehold, refetch: fetchHousehold };
}
