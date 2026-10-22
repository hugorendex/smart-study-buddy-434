import { AccessibilityBar } from "@/components/AccessibilityBar";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthGate } from "@/components/AuthGate";
import {
  getAdminOverview,
  authorizeEmail,
  revokeEmailAccess,
  toggleUserAccess,
  type AdminOverview,
} from "@/lib/admin.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  Loader2,
  Users,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Mail,
  Plus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel Admin — Portal do Concurseiro" },
      { name: "description", content: "Controle de acesso e liberação de e-mails do Portal do Concurseiro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-hero text-white border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Painel do Administrador</h1>
              <p className="mt-1 text-sm text-white/80">
                Controle de acesso exclusivo por e-mail · Portal do Concurseiro
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link to="/">Ir para o Portal</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <AuthGate>{() => <AdminContent />}</AuthGate>
      </main>
    </div>
  );
}

function AdminContent() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [filtro, setFiltro] = useState("");
  const [msgSucesso, setMsgSucesso] = useState("");
  const [msgErro, setMsgErro] = useState("");

  async function carregar() {
    setErro("");
    try {
      let environment: "sandbox" | "live" = "sandbox";
      try {
        environment = getStripeEnvironment();
      } catch {
        /* sem pagamentos */
      }
      setData(await getAdminOverview({ data: { environment } }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleAutorizarEmail(e: React.FormEvent) {
    e.preventDefault();
    setMsgSucesso("");
    setMsgErro("");
    setSalvando("autorizar_email");
    try {
      await authorizeEmail({ data: { email: novoEmail } });
      setMsgSucesso(`E-mail ${novoEmail.trim().toLowerCase()} autorizado com sucesso!`);
      setNovoEmail("");
      await carregar();
    } catch (err) {
      setMsgErro(err instanceof Error ? err.message : "Erro ao autorizar e-mail");
    }
    setSalvando("");
  }

  async function handleToggleAcesso(userId: string, email: string, approved: boolean) {
    setSalvando(userId);
    setMsgSucesso("");
    setMsgErro("");
    try {
      await toggleUserAccess({ data: { userId, email, approved } });
      setMsgSucesso(`Acesso do usuário ${email} ${approved ? "liberado" : "bloqueado"} com sucesso!`);
      await carregar();
    } catch (err) {
      setMsgErro(err instanceof Error ? err.message : "Erro ao alterar permissão");
    }
    setSalvando("");
  }

  async function handleRevogarEmail(email: string) {
    if (!confirm(`Deseja revogar a autorização do e-mail ${email}?`)) return;
    setSalvando(`revogar_${email}`);
    setMsgSucesso("");
    setMsgErro("");
    try {
      await revokeEmailAccess({ data: { email } });
      setMsgSucesso(`Autorização de ${email} revogada.`);
      await carregar();
    } catch (err) {
      setMsgErro(err instanceof Error ? err.message : "Erro ao revogar");
    }
    setSalvando("");
  }

  if (erro) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center space-y-4">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium">{erro}</p>
        <p className="text-xs text-muted-foreground">
          Certifique-se de que sua conta possui a função de administrador atribuída.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando painel administrativo...</p>
      </div>
    );
  }

  const usuariosFiltrados = data.usuarios.filter((u) =>
    u.email.toLowerCase().includes(filtro.toLowerCase().trim())
  );

  return (
    <div className="space-y-6">
      {/* Mensagens de feedback */}
      {msgSucesso && (
        <div className="rounded-lg bg-success/15 border border-success/30 p-3 text-sm text-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{msgSucesso}</span>
        </div>
      )}
      {msgErro && (
        <div className="rounded-lg bg-destructive/15 border border-destructive/30 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{msgErro}</span>
        </div>
      )}

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total de Usuários</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{data.total}</p>
          <p className="text-xs text-muted-foreground">Contas cadastradas</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Acesso Liberado</span>
            <UserCheck className="h-4 w-4 text-success" />
          </div>
          <p className="mt-2 text-2xl font-bold text-success">{data.autorizados}</p>
          <p className="text-xs text-muted-foreground">Aprovados para estudar</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Acesso Bloqueado</span>
            <UserX className="h-4 w-4 text-destructive" />
          </div>
          <p className="mt-2 text-2xl font-bold text-destructive">{data.bloqueados}</p>
          <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">E-mails Pré-autorizados</span>
            <Mail className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-2 text-2xl font-bold">{data.authorizedEmails.length}</p>
          <p className="text-xs text-muted-foreground">Na lista de permissão</p>
        </div>
      </div>

      {/* Formulário para liberar e-mail */}
      <div className="rounded-lg border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base sm:text-lg">Liberar Novo E-mail para o Portal</h2>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Digite o e-mail do aluno para liberar permissão de acesso. O e-mail pode ser autorizado antes mesmo do aluno
          criar a conta — ao entrar, o acesso já estará liberado.
        </p>

        <form onSubmit={handleAutorizarEmail} className="flex flex-col sm:flex-row gap-2 pt-1">
          <Input
            type="email"
            required
            placeholder="aluno@email.com"
            value={novoEmail}
            onChange={(e) => setNovoEmail(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={salvando === "autorizar_email"}>
            {salvando === "autorizar_email" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Autorizar Acesso
          </Button>
        </form>
      </div>

      {/* Seção de E-mails Pré-autorizados (se houver) */}
      {data.authorizedEmails.length > 0 && (
        <div className="rounded-lg border bg-card p-5 shadow-sm space-y-3">
          <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            E-mails Cadastrados na Lista de Permissão ({data.authorizedEmails.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="p-2.5">E-mail</th>
                  <th className="p-2.5">Situação</th>
                  <th className="p-2.5">Data de Autorização</th>
                  <th className="p-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {data.authorizedEmails.map((item) => (
                  <tr key={item.email} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-2.5 font-medium">{item.email}</td>
                    <td className="p-2.5">
                      {item.status === "approved" ? (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                          Autorizado
                        </span>
                      ) : (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                          Bloqueado
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={salvando === `revogar_${item.email}`}
                        onClick={() => handleRevogarEmail(item.email)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Revogar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabela de Usuários Cadastrados */}
      <div className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Usuários Registrados ({data.usuarios.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Apenas usuários com status "Autorizado" conseguem entrar e praticar questões.
            </p>
          </div>
          <Input
            type="search"
            placeholder="Filtrar por e-mail..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="sm:w-64"
          />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="p-3">Usuário</th>
                <th className="p-3">Permissão de Acesso</th>
                <th className="p-3">Perfil</th>
                <th className="p-3">Questões Feitas</th>
                <th className="p-3 text-right">Controle de Acesso</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => {
                  const isSalvando = salvando === u.id;
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{u.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Cadastrado em {new Date(u.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </td>

                      <td className="p-3">
                        {u.isAdmin ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            <ShieldCheck className="h-3 w-3" /> Acesso Total (Admin)
                          </span>
                        ) : u.authorized ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                            <Unlock className="h-3 w-3" /> Autorizado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                            <Lock className="h-3 w-3" /> Bloqueado / Pendente
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-xs">
                        {u.isAdmin ? (
                          <span className="font-semibold text-primary">Administrador</span>
                        ) : (
                          <span className="text-muted-foreground">Aluno</span>
                        )}
                      </td>

                      <td className="p-3 text-xs font-medium">{u.questoes_respondidas}</td>

                      <td className="p-3 text-right">
                        {u.isAdmin ? (
                          <span className="text-xs text-muted-foreground italic">Admin principal</span>
                        ) : u.authorized ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 border-destructive/30"
                            disabled={isSalvando}
                            onClick={() => handleToggleAcesso(u.id, u.email, false)}
                          >
                            {isSalvando ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Lock className="h-4 w-4 mr-1" />
                            )}
                            Bloquear
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-success text-success-foreground hover:bg-success/90"
                            disabled={isSalvando}
                            onClick={() => handleToggleAcesso(u.id, u.email, true)}
                          >
                            {isSalvando ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Unlock className="h-4 w-4 mr-1" />
                            )}
                            Liberar Acesso
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-2">
        <Button asChild variant="outline">
          <Link to="/">Voltar ao início do Portal</Link>
        </Button>
      </div>
    </div>
  );
}
