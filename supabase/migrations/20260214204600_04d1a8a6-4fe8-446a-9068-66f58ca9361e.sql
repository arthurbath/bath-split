
-- Add partner name columns to households (decoupled from user profiles)
ALTER TABLE public.households
  ADD COLUMN partner_x_name text NOT NULL DEFAULT 'Partner X',
  ADD COLUMN partner_y_name text NOT NULL DEFAULT 'Partner Y';
