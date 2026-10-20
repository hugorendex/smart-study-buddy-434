import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthGate } from "@/components/AuthGate";
import { getAdminOverview, setUserPremium, type AdminOverview } from "@/lib/admin.functions";
import { Loader2, Users, Crown, Clock, Activity } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel Admin — Portal do Concurseiro" },
      { name: "description", content: "Gestão de usuários e planos do Portal do Concurseiro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="min-h-screen">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <h1 className="text-2xl sm:text-3xl">Painel do Administrador</h1>
          <p className="mt-1 text-sm opacity-80">Portal do Concurseiro · gestão de usuários e planos</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <AuthGate>{() => <AdminContent />}</AuthGate>
      </main>
    </div>
  );
}

function AdminContent() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState("");

  async function carregar() {
    setErro("");
    try {
      setData(await getAdminOverview({ data: {} }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }

  useEffect(() => { carregar(); }, []);

  async function darPremium(userId: string, dias: number) {
    setSalvando(userId);
    try {
      await setUserPremium({ data: { userId, dias } });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    }
    setSalvando("");
  }

  if (erro)
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-destructive">{erro}</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/">Voltar ao início</Link></Button>
      </div>
    );
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  const cards = [
    { icon: Users, label: "Usuários cadastrados", valor: data.total },
    { icon: Activity, label: "Ativos nos últimos 7 dias", valor: data.ativos7dias },
    { icon: Clock, label: "Em período de teste", valor: data.emTrial },
    { icon: Crown, label: "Assinantes Premium", valor: data.premium },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-4">
            <c.icon className="h-5 w-5 text-accent" />
            <p className="mt-2 text-2xl font-bold">{c.valor}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-3">Usuário</th>
              <th className="p-3">Situação</th>
              <th className="p-3">Teste até</th>
              <th className="p-3">Questões</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.usuarios.map((u) => {
              const trialAtivo = u.trial_ends_at && new Date(u.trial_ends_at) > new Date();
              const premiumAtivo = u.sub_status || (u.premium_until && new Date(u.premium_until) > new Date());
              return (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-3">
                    <p className="font-medium">{u.email}</p>
                    <p className="text-xs text-muted-foreground">desde {new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                  </td>
                  <td className="p-3">
                    {premiumAtivo ? (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">Premium</span>
                    ) : trialAtivo ? (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">Teste grátis</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Free expirado</span>
                    )}
                  </td>
                  <td className="p-3 text-xs">{u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="p-3 text-xs">{u.questoes_respondidas}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={salvando === u.id} onClick={() => darPremium(u.id, 30)}>
                        +30 dias
                      </Button>
                      <Button size="sm" variant="ghost" disabled={salvando === u.id} onClick={() => darPremium(u.id, 0)}>
                        Remover
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button asChild variant="outline"><Link to="/">Voltar ao início</Link></Button>
    </div>
  );
}
