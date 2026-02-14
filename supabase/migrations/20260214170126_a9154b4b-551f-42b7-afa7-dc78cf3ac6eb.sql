
-- Add invite_code to households for partner invitation
ALTER TABLE public.households ADD COLUMN invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');

-- Allow members to update their household (for generating new invite codes)
CREATE POLICY "Members can update their household" ON public.households
  FOR UPDATE TO authenticated USING (public.is_household_member(auth.uid(), id));

-- Allow anon/authenticated to read households by invite code (for joining)
CREATE POLICY "Anyone can find household by invite code" ON public.households
  FOR SELECT TO authenticated USING (true);
