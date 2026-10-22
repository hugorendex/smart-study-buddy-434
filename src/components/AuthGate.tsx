import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, LogOut, RefreshCw, Lock } from "lucide-react";
import { checkUserAccess } from "@/lib/admin.functions";

export function AuthGate({ children }: { children: (session: Session) => ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [access, setAccess] = useState<{ authorized: boolean; isAdmin: boolean; checking: boolean } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setAccess(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const verificarAcesso = async () => {
    if (!session) return;
    setAccess((prev) => ({ authorized: prev?.authorized ?? false, isAdmin: prev?.isAdmin ?? false, checking: true }));
    try {
      const res = await checkUserAccess({ data: {} as any });
      setAccess({ authorized: res.authorized, isAdmin: res.isAdmin, checking: false });
    } catch (e) {
      console.error("Erro ao verificar acesso:", e);
      setAccess({ authorized: false, isAdmin: false, checking: false });
    }
  };

  useEffect(() => {
    if (session) {
      verificarAcesso();
    }
  }, [session?.user?.id]);

  if (session === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return <AuthCard />;

  if (access?.checking || access === null) {
    return (
      <div className="mx-auto my-12 max-w-sm rounded-lg border bg-card p-8 text-center shadow-sm">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm font-medium">Verificando permissões de acesso...</p>
        <p className="text-xs text-muted-foreground mt-1">Conferindo liberação com o administrador</p>
      </div>
    );
  }

  if (!access.authorized && !access.isAdmin) {
    return (
      <BlockedAccountCard
        email={session.user.email ?? ""}
        onRetry={verificarAcesso}
        onSignOut={() => supabase.auth.signOut()}
      />
    );
  }

  return <>{children(session)}</>;
}

function BlockedAccountCard({
  email,
  onRetry,
  onSignOut,
}: {
  email: string;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const [reloading, setReloading] = useState(false);

  const handleRetry = async () => {
    setReloading(true);
    await onRetry();
    setReloading(false);
  };

  return (
    <div className="mx-auto my-8 max-w-md rounded-xl border border-amber-500/30 bg-card p-6 shadow-sm text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
        <ShieldAlert className="h-8 w-8" />
      </div>

      <div>
        <h2 className="text-xl font-bold">Acesso Pendente de Liberação</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O Portal do Concurseiro é restrito a alunos autorizados.
        </p>
      </div>

      <div className="rounded-lg bg-muted/70 p-3 text-sm border">
        <p className="text-xs text-muted-foreground">E-mail conectado:</p>
        <p className="font-semibold text-foreground truncate mt-0.5">{email}</p>
        <span className="inline-block mt-2 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          Aguardando aprovação
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Sua conta foi registrada no portal, mas seu e-mail ainda não foi aprovado pelo administrador no módulo de gestão.
        Solicite a liberação informando o e-mail acima.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={handleRetry} disabled={reloading}>
          {reloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Verificar liberação
        </Button>
        <Button variant="ghost" className="flex-1 text-destructive hover:bg-destructive/10" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair da conta
        </Button>
      </div>
    </div>
  );
}

function AuthCard() {
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const input = "w-full rounded-md border bg-background px-3 py-2";

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    setMsg("");
    if (mode === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setErr("E-mail ou senha incorretos, ou e-mail ainda não confirmado.");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setErr(error.message);
      else if (!data.session) setMsg("Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.");
    }
    setLoading(false);
  }

  async function google() {
    setErr("");
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setErr("Não foi possível entrar com o Google.");
  }

  return (
    <div className="mx-auto max-w-sm rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="text-xl">{mode === "entrar" ? "Entre para estudar" : "Crie sua conta"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sua conta guarda as questões que você já fez, para nunca repetir.</p>

      <div className="mt-3 rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground border flex items-start gap-2">
        <Lock className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <span>
          <strong>Acesso Restrito:</strong> O acesso ao portal requer aprovação prévia do seu e-mail pelo administrador.
        </span>
      </div>

      <Button variant="outline" className="mt-4 w-full" onClick={google}>Continuar com Google</Button>
      <div className="my-4 text-center text-xs text-muted-foreground">ou com e-mail</div>
      <form onSubmit={enviar} className="space-y-3">
        <input className={input} type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" required minLength={6} placeholder="Senha (mín. 6 caracteres)" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}{mode === "entrar" ? "Entrar" : "Criar conta"}
        </Button>
      </form>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      {msg && <p className="mt-3 text-sm text-success">{msg}</p>}
      <Button variant="link" className="mt-2 w-full" onClick={() => setMode(mode === "entrar" ? "criar" : "entrar")}>
        {mode === "entrar" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
      </Button>
    </div>
  );
}
