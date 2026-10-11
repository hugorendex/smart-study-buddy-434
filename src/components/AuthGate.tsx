import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function AuthGate({ children }: { children: (session: Session) => ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined)
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  if (!session) return <AuthCard />;
  return <>{children(session)}</>;
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
