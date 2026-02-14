
ALTER TABLE public.linked_accounts 
ADD COLUMN owner_partner text NOT NULL DEFAULT 'X';
