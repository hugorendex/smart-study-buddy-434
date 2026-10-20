CREATE TABLE public.pix_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mp_payment_id BIGINT UNIQUE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 9.99,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.pix_payments TO authenticated;
GRANT ALL ON public.pix_payments TO service_role;
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own pix payments"
  ON public.pix_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pix payments"
  ON public.pix_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);