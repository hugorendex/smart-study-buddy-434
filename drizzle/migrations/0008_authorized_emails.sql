-- drizzle/migrations/0008_authorized_emails.sql
-- Tabela para controle de e-mails autorizados pelo administrador

CREATE TABLE IF NOT EXISTS public.authorized_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'approved',
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS authorized_emails_email_idx ON public.authorized_emails (lower(email));

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem verificar seu próprio e-mail ou admins podem ver todos
CREATE POLICY "Users read own authorization" ON public.authorized_emails
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email') OR public.has_role(auth.uid(), 'admin'));

-- Apenas administradores podem inserir, alterar e excluir
CREATE POLICY "Admins manage authorized emails" ON public.authorized_emails
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.authorized_emails TO authenticated;
GRANT ALL ON public.authorized_emails TO service_role;
