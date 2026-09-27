CREATE TABLE public.consents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  consent_given boolean NOT NULL,
  consent_version text,
  consent_timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consents_own" ON public.consents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX consents_user_idx ON public.consents (user_id, created_at DESC);

ALTER TABLE public.alerts ADD COLUMN keystroke_score double precision;
ALTER TABLE public.alerts ADD COLUMN sensor_score double precision;
ALTER TABLE public.alerts ALTER COLUMN user_response SET DEFAULT 'none';