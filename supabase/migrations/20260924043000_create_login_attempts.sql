-- Login attempts table for keystroke biometric authentication
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  similarity_score DOUBLE PRECISION NOT NULL,
  success BOOLEAN NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_attempts TO authenticated;
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_attempts_own" ON public.login_attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX login_attempts_user_idx ON public.login_attempts (user_id, timestamp DESC);

-- Add updated_at trigger for typing_baselines
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at column to typing_baselines if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'typing_baselines' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.typing_baselines ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

CREATE TRIGGER typing_baselines_updated_at
BEFORE UPDATE ON public.typing_baselines
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();