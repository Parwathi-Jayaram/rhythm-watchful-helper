ALTER TABLE public.emergency_contacts
  ADD COLUMN verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified')),
  ADD COLUMN verification_code text,
  ADD COLUMN verification_sent_at timestamptz,
  ADD COLUMN verified_at timestamptz;