import { AccessibilityBar } from "@/components/AccessibilityBar";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Bell,
  BellRing,
  BellOff,
  X,
  Loader2,
  SlidersHorizontal,
  Volume2,
  Sparkles,
  Calendar,
  Award,
  BarChart3,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Target,
  TrendingUp,
  Zap,
  Play,
  Settings,
  Flame,
  Clock,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Simulado } from "@/components/Simulado";
import { PopoloMascot } from "@/components/PopoloMascot";
import { useServerFn } from "@tanstack/react-start";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { getQuestions, refillBank, type BankQuestion } from "@/lib/bank.functions";
import {
  generateSchedule,
  generateExplanationAudio,
  type ScheduleDay,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Portal do Concurseiro — Preparatório Inteligente PC-AP" },
      {
        name: "description",
        content: "Estudo direcionado para concursos com questões comentadas, simulados oficiais, cronograma e caderno de erros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Portal do Concurseiro" },
      {
        property: "og:description",
        content: "Questões, simulados e cronograma de estudos para concursos públicos.",
      },
    ],
  }),
  component: Index,
});

export const MATERIAS = [
  "Língua Portuguesa",
  "Raciocínio Lógico",
  "Estatística e Análise de Dados",
  "Contabilidade e Análise Financeira",
  "Informática",
  "Direito Constitucional",
  "Direito Administrativo",
  "Direito Penal",
  "Direito Processual Penal",
  "Legislação Penal Especial",
  "Direitos Humanos",
  "Criminologia",
  "História e Geografia do Amapá",
  "Legislação Estadual (PC-AP)",
  "Direito Civil/Empresarial e Legislação Complementar",
  "Direito Tributário e Legislação Complementar",
  "Direito Ambiental e Legislação Complementar",
  "Medicina Legal",
];

export type Stats = Record<string, { certas: number; total: number }>;

export type QuestaoErro = {
  id: string;
  materia: string;
  topico: string;
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
  dataErro: number;
  resolvida?: boolean;
};

export type LembretesConfig = {
  estudoHojeAtivo: boolean;
  estudoHojeHorario: string; // formato "HH:mm"
  revisaoErrosAtivo: boolean;
  revisaoErrosHorario: string; // formato "HH:mm"
  notificacaoNavegador: boolean;
};

export const DEFAULT_LEMBRETES: LembretesConfig = {
  estudoHojeAtivo: true,
  estudoHojeHorario: "09:00",
  revisaoErrosAtivo: true,
  revisaoErrosHorario: "19:30",
  notificacaoNavegador: false,
};

export type PerfilAluno = {
  cargo: string;
  horasDia: number;
  metaSemanal: number;
  dataProva: string;
  onboarded: boolean;
};

const DEFAULT_PERFIL: PerfilAluno = {
  cargo: "Investigador de Polícia",
  horasDia: 3,
  metaSemanal: 50,
  dataProva: "2026-11-29",
  onboarded: false,
};

export function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        setV(JSON.parse(raw));
      } catch {
        /* Ignore invalid saved data. */
      }
    }
  }, [key]);
  const set = (n: T | ((prev: T) => T)) => {
    setV((curr) => {
      const next = typeof n === "function" ? (n as (prev: T) => T)(curr) : n;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };
  return [v, set] as const;
}

export function salvarErroGlobal(q: BankQuestion) {
  try {
    const raw = localStorage.getItem("pcap-erros");
    const lista: QuestaoErro[] = raw ? JSON.parse(raw) : [];
    if (!lista.some((e) => e.materia === q.materia && e.enunciado === q.enunciado)) {
      lista.unshift({
        id: q.id,
        materia: q.materia,
        topico: q.topico,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        correta: q.correta,
        explicacao: q.explicacao,
        dataErro: Date.now(),
      });
      localStorage.setItem("pcap-erros", JSON.stringify(lista.slice(0, 200)));
    }
  } catch {}
}


function dispararNotificacaoNativa(titulo: string, corpo: string) {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        new Notification(titulo, {
          body: corpo,
          icon: "/favicon.ico",
        });
      } catch {}
    }
  }
}

type TabType = "hoje" | "questoes" | "erros" | "cronograma" | "simulado" | "desempenho";

function Index() {
  const [tab, setTab] = useState<TabType>("hoje");
  const [studyTopic, setStudyTopic] = useState<{ materia: string; topico: string; id: number }>();
  const [perfil, setPerfil] = useLocal<PerfilAluno>("pcap-perfil", DEFAULT_PERFIL);
  const [erros, setErros] = useLocal<QuestaoErro[]>("pcap-erros", []);
  const [stats] = useLocal<Stats>("pcap-stats", {});
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [acertosSeguidos, setAcertosSeguidos] = useState(0);
  const [modalLembretesAberto, setModalLembretesAberto] = useState(false);
  const [lembretes, setLembretes] = useLocal<LembretesConfig>("pcap-lembretes", DEFAULT_LEMBRETES);
  const [alertaLembrete, setAlertaLembrete] = useState<{
    tipo: "estudo" | "revisao";
    titulo: string;
    mensagem: string;
  } | null>(null);

  // Monitoramento periódico dos horários de lembrete
  useEffect(() => {
    function checarHorarios() {
      const now = new Date();
      const horaAtual = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const dataHoje = now.toISOString().split("T")[0];

      // Checa lembrete de estudo do dia
      if (lembretes.estudoHojeAtivo && lembretes.estudoHojeHorario === horaAtual) {
        const chaveDisparo = `pcap-lembrete-estudo-${dataHoje}-${horaAtual}`;
        if (!sessionStorage.getItem(chaveDisparo)) {
          sessionStorage.setItem(chaveDisparo, "1");
          setAlertaLembrete({
            tipo: "estudo",
            titulo: "⏰ Hora de Estudar!",
            mensagem: "Chegou o momento do seu estudo diário. Vamos resolver um bloco de questões?",
          });
          if (lembretes.notificacaoNavegador) {
            dispararNotificacaoNativa(
              "Portal do Concurseiro - Hora de Estudar",
              "Chegou seu horário de estudo diário! Mantenha a constância para a aprovação."
            );
          }
        }
      }

      // Checa lembrete de revisões pendentes
      if (lembretes.revisaoErrosAtivo && lembretes.revisaoErrosHorario === horaAtual && erros.length > 0) {
        const chaveDisparo = `pcap-lembrete-revisao-${dataHoje}-${horaAtual}`;
        if (!sessionStorage.getItem(chaveDisparo)) {
          sessionStorage.setItem(chaveDisparo, "1");
          setAlertaLembrete({
            tipo: "revisao",
            titulo: "🚨 Hora de Revisar Erros!",
            mensagem: `Você tem ${errosPendentes} questão(ões) no Caderno de Erros aguardando revisão.`,
          });
          if (lembretes.notificacaoNavegador) {
            dispararNotificacaoNativa(
              "Portal do Concurseiro - Revisões Pendentes",
              `Você tem ${errosPendentes} questão(ões) no Caderno de Erros para fixar hoje.`
            );
          }
        }
      }
    }

    checarHorarios();
    const interval = setInterval(checarHorarios, 30000); // verifica a cada 30 segundos
    return () => clearInterval(interval);
  }, [lembretes, erros.length]);

  function estudar(materia: string, topico: string) {
    setStudyTopic({ materia, topico, id: Date.now() });
    setTab("questoes");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Contagem regressiva para a prova
  const diasRestantes = useMemo(() => {
    if (!perfil.dataProva) return null;
    const target = new Date(perfil.dataProva + "T00:00:00");
    const now = new Date();
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }, [perfil.dataProva]);

  // Contagem de erros pendentes
  const errosPendentes = useMemo(() => erros.filter((e) => !e.resolvida).length, [erros]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors pb-20 sm:pb-8">
      <AccessibilityBar />

      <header className="bg-hero text-white border-b border-white/10 shadow-md">
        <div className="mx-auto max-w-5xl px-4 pb-6 pt-6 sm:pb-8 sm:pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-accent border border-accent/30">
                  <Flame className="h-3.5 w-3.5" /> Preparatório PC-AP
                </span>
                {diasRestantes != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/90">
                    <Clock className="h-3 w-3" /> Faltam {diasRestantes} dias
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                Portal do Concurseiro
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-white/80 max-w-xl">
                {perfil.cargo} · Foco total em questões inéditas, simulados e revisão de erros.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalPerfilAberto(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white text-xs"
              >
                <Settings className="mr-1.5 h-3.5 w-3.5" /> Metas & Perfil
              </Button>
            </div>
          </div>

          {/* Abas no Desktop */}
          <nav className="mt-6 hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1">
            {(
              [
                ["hoje", "Hoje", Sparkles],
                ["questoes", "Questões", BookOpen],
                ["erros", `Caderno de Erros ${errosPendentes > 0 ? `(${errosPendentes})` : ""}`, AlertCircle],
                ["cronograma", "Cronograma", Calendar],
                ["simulado", "Simulado Oficial", Award],
                ["desempenho", "Progresso", BarChart3],
              ] as const
            ).map(([k, l, Icon]) => (
              <Button
                key={k}
                onClick={() => setTab(k as TabType)}
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                  tab === k
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Icon className="h-4 w-4" />
                {l}
              </Button>
            ))}
          </nav>

        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <AuthGate>
          {(session) => (
            <>
              {/* Barra superior de status do usuário */}
              <div className="mb-6 flex items-center justify-between gap-3 text-xs text-muted-foreground border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="truncate max-w-[200px] sm:max-w-none font-medium text-foreground">
                    {session.user.email}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => supabase.auth.signOut()}>
                  Sair
                </Button>
              </div>

              {/* Onboarding Banner se nunca configurou */}
              {!perfil.onboarded && (
                <div className="mb-6 rounded-xl border border-accent/40 bg-accent/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-sm sm:text-base flex items-center gap-2 text-foreground">
                      <Sparkles className="h-4 w-4 text-accent" /> Configure suas metas para personalizar seu estudo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Defina o cargo desejado ({perfil.cargo}), sua meta semanal e data prevista para ver recomendações sob medida.
                    </p>
                  </div>
                  <Button size="sm" className="bg-accent text-accent-foreground font-semibold shrink-0" onClick={() => setModalPerfilAberto(true)}>
                    Personalizar Agora
                  </Button>
                </div>
              )}

              {/* Conteúdo das Abas */}
              {tab === "hoje" && (
                <HojeDashboard
                  perfil={perfil}
                  stats={stats}
                  errosPendentes={errosPendentes}
                  onEstudar={estudar}
                  onIrPara={setTab}
                  onAbrirPerfil={() => setModalPerfilAberto(true)}
                />
              )}

              <div hidden={tab !== "questoes"}>
                <Questoes studyTopic={studyTopic} stats={stats} onIrPara={setTab} />
              </div>

              {tab === "erros" && <CadernoErros erros={erros} setErros={setErros} onEstudar={estudar} />}

              <div hidden={tab !== "cronograma"}>
                <Cronograma onEstudar={estudar} cargoPadrao={perfil.cargo} horasPadrao={perfil.horasDia} />
              </div>

              {tab === "simulado" && <Simulado />}

              {tab === "desempenho" && <Desempenho stats={stats} onEstudar={estudar} />}
            </>
          )}
        </AuthGate>
      </main>

      {/* Menu Inferior Fixo no Celular */}
      <nav
        aria-label="Navegação mobile"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-2 py-1.5 flex items-center justify-around shadow-lg"
      >
        {(
          [
            ["hoje", "Hoje", Sparkles],
            ["questoes", "Questões", BookOpen],
            ["erros", "Erros", AlertCircle],
            ["cronograma", "Plano", Calendar],
            ["simulado", "Simulado", Award],
            ["desempenho", "Progresso", BarChart3],
          ] as const
        ).map(([k, l, Icon]) => {
          const ativo = tab === k;
          return (
            <button
              type="button"
              key={k}
              onClick={() => {
                setTab(k as TabType);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                ativo ? "text-accent font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 mb-0.5 ${ativo ? "scale-110" : ""}`} />
              <span>{l}</span>
              {k === "erros" && errosPendentes > 0 && (
                <span className="absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {errosPendentes}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mascote Popólo Interativo (estilo Clippy do Windows) */}
      <PopoloMascot
        acertosSeguidos={acertosSeguidos}
        errosPendentes={errosPendentes}
        modoSimulado={tab === "simulado"}
        onEstudarMateria={(m) => estudar(m, "")}
        onAbrirErros={() => {
          setTab("erros");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* Modal de Configuração de Metas / Perfil */}
      {modalPerfilAberto && (
        <ModalPerfil
          perfil={perfil}
          onSalvar={(novo) => {
            setPerfil(novo);
            setModalPerfilAberto(false);
          }}
          onAbrirLembretes={() => {
            setModalPerfilAberto(false);
            setModalLembretesAberto(true);
          }}
          onFechar={() => setModalPerfilAberto(false)}
        />
      )}

      {modalLembretesAberto && (
        <ModalLembretes
          lembretes={lembretes}
          errosPendentes={errosPendentes}
          onSalvar={(novos) => {
            setLembretes(novos);
            setModalLembretesAberto(false);
          }}
          onFechar={() => setModalLembretesAberto(false)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// TELA "HOJE" — DASHBOARD ORIENTADO À AÇÃO
// ----------------------------------------------------
function HojeDashboard({
  perfil,
  stats,
  lembretes,
  errosPendentes,
  onEstudar,
  onIrPara,
  onAbrirPerfil,
  onAbrirLembretes,
  onToggleLembreteEstudo,
  onToggleLembreteRevisao,
}: {
  perfil: PerfilAluno;
  stats: Stats;
  lembretes: LembretesConfig;
  errosPendentes: number;
  onEstudar: (m: string, t: string) => void;
  onIrPara: (t: TabType) => void;
  onAbrirPerfil: () => void;
  onAbrirLembretes: () => void;
  onToggleLembreteEstudo: (ativo: boolean) => void;
  onToggleLembreteRevisao: (ativo: boolean) => void;
}) {
  const [ultimoEstudo] = useLocal<{ materia: string; timestamp: number }>("pcap-ultimo-estudo", {
    materia: "Língua Portuguesa",
    timestamp: Date.now(),
  });
  const [hist] = useLocal<Record<string, string[]>>("pcap-hist", {});
  const [plano] = useLocal<ScheduleDay[]>("pcap-plano", []);
  const [feitos] = useLocal<Record<string, boolean>>("pcap-feitos", {});

  // Total de questões feitas no portal
  const totalQuestoesFeitas = useMemo(() => {
    return Object.values(hist).reduce((acc, curr) => acc + curr.length, 0);
  }, [hist]);

  // Taxa global de acertos
  const taxaGlobal = useMemo(() => {
    let certas = 0;
    let total = 0;
    for (const s of Object.values(stats)) {
      certas += s.certas;
      total += s.total;
    }
    return total > 0 ? Math.round((certas / total) * 100) : 0;
  }, [stats]);

  // Matéria mais fraca (com menor % de acertos e pelo menos 1 questão respondida)
  const materiaMaisFraca = useMemo(() => {
    const arr = Object.entries(stats).filter(([, s]) => s.total >= 2);
    if (!arr.length) return MATERIAS[0];
    arr.sort((a, b) => a[1].certas / a[1].total - b[1].certas / b[1].total);
    return arr[0][0];
  }, [stats]);

  // Próxima tarefa do cronograma
  const proximaTarefaCronograma = useMemo(() => {
    if (!plano.length) return null;
    for (let d = 0; d < plano.length; d++) {
      const dia = plano[d];
      for (let b = 0; b < dia.blocos.length; b++) {
        const k = `${d}-${b}`;
        if (!feitos[k]) {
          return {
            dia: dia.dia,
            bloco: dia.blocos[b],
          };
        }
      }
    }
    return null;
  }, [plano, feitos]);

  // Progresso da meta semanal
  const progressoMeta = Math.min(Math.round((totalQuestoesFeitas / perfil.metaSemanal) * 100), 100);

  const card = "rounded-xl border bg-card p-4 sm:p-5 shadow-sm";

  return (
    <div className="space-y-6">
      {/* Hero Card: Continue de onde parou */}
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wide">
              <Zap className="h-3.5 w-3.5" /> Continue de onde parou
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              {ultimoEstudo.materia}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg">
              Pronto para bater sua meta de hoje? Resolva um bloco rápido no padrão Cesgranrio e mantenha a consistência.
            </p>
          </div>

          <div className="flex w-full sm:w-auto items-center gap-3">
            <Button
              size="lg"
              className="w-full sm:w-auto font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground gap-2 py-6 px-6 text-base"
              onClick={() => onEstudar(ultimoEstudo.materia, "")}
            >
              <Play className="h-5 w-5 fill-current" /> Continuar Praticando
            </Button>
          </div>
        </div>
      </section>

      {/* Grid com Metas Semanais e Métricas */}
      <section className="grid gap-4 sm:grid-cols-3">
        {/* Card Meta Semanal */}
        <div className={`${card} sm:col-span-2 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                <h3 className="font-bold text-sm">Meta Semanal de Questões</h3>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {totalQuestoesFeitas} de {perfil.metaSemanal} feitas
              </span>
            </div>
            <div className="mt-3 h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${progressoMeta}%` }}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
            <span>
              {progressoMeta >= 100
                ? "🎉 Meta semanal batida! Parabéns pela disciplina."
                : `Faltam ${Math.max(perfil.metaSemanal - totalQuestoesFeitas, 0)} questões para fechar a meta.`}
            </span>
            <button
              type="button"
              onClick={onAbrirPerfil}
              className="text-primary hover:underline font-semibold"
            >
              Ajustar meta
            </button>
          </div>
        </div>

        {/* Card Desempenho Global */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h3 className="font-bold text-sm">Taxa de Acertos</h3>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">{taxaGlobal}%</span>
            <span className="text-xs text-muted-foreground">global</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {taxaGlobal >= 70
              ? "Excelente! Você está na zona de pontuação competitiva."
              : "Continue resolvendo questões para elevar sua média."}
          </p>
        </div>
      </section>

      {/* Trilhas de Ação Rápida */}
      <section className="space-y-3">
        <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" /> Escolha sua sessão de estudos de agora
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Ação 1: Matéria do Cronograma */}
          {proximaTarefaCronograma ? (
            <button
              type="button"
              onClick={() => onEstudar(proximaTarefaCronograma.bloco.materia, proximaTarefaCronograma.bloco.topico)}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-muted/50 cursor-pointer shadow-sm group"
            >
              <div className="space-y-1">
                <span className="inline-block rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {proximaTarefaCronograma.dia} · Cronograma
                </span>
                <p className="font-bold text-foreground text-sm group-hover:text-primary transition">
                  {proximaTarefaCronograma.bloco.materia}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {proximaTarefaCronograma.bloco.topico}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onIrPara("cronograma")}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-muted/50 cursor-pointer shadow-sm group"
            >
              <div className="space-y-1">
                <span className="inline-block rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  Cronograma
                </span>
                <p className="font-bold text-foreground text-sm group-hover:text-primary transition">
                  Gerar novo cronograma semanal
                </p>
                <p className="text-xs text-muted-foreground">
                  Monte um plano sob medida para suas horas e cargo.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0 mt-1" />
            </button>
          )}

          {/* Ação 2: Treinar Matéria Mais Fraca */}
          <button
            type="button"
            onClick={() => onEstudar(materiaMaisFraca, "")}
            className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left transition hover:border-amber-500 hover:bg-amber-500/10 cursor-pointer shadow-sm group"
          >
            <div className="space-y-1">
              <span className="inline-block rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                🎯 Reforço Recomendado
              </span>
              <p className="font-bold text-foreground text-sm group-hover:text-amber-600 transition">
                Treinar {materiaMaisFraca}
              </p>
              <p className="text-xs text-muted-foreground">
                Eleve sua taxa nessa disciplina para não perder pontos decisivos.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 shrink-0 mt-1" />
          </button>

          {/* Ação 3: Caderno de Erros */}
          <button
            type="button"
            onClick={() => onIrPara("erros")}
            className="flex items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-left transition hover:border-destructive hover:bg-destructive/10 cursor-pointer shadow-sm group"
          >
            <div className="space-y-1">
              <span className="inline-block rounded-md bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive">
                🚨 Caderno de Erros
              </span>
              <p className="font-bold text-foreground text-sm group-hover:text-destructive transition">
                Revisar {errosPendentes} {errosPendentes === 1 ? "questão errada" : "questões erradas"}
              </p>
              <p className="text-xs text-muted-foreground">
                Refaça até acertar e garanta que não errará de novo.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-destructive shrink-0 mt-1" />
          </button>

          {/* Ação 4: Simulado Oficial */}
          <button
            type="button"
            onClick={() => onIrPara("simulado")}
            className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-500/10 cursor-pointer shadow-sm group"
          >
            <div className="space-y-1">
              <span className="inline-block rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                🏆 Simulado da Prova
              </span>
              <p className="font-bold text-foreground text-sm group-hover:text-emerald-600 transition">
                Simulado de 80 Questões
              </p>
              <p className="text-xs text-muted-foreground">
                Treine com cronômetro de 5h30 e cartão-resposta oficial.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 shrink-0 mt-1" />
          </button>
        </div>
      </section>
    </div>
  );
}

// ----------------------------------------------------
// CADERNO DE ERROS — REVISÃO INTELIGENTE
// ----------------------------------------------------
function CadernoErros({
  erros,
  setErros,
  onEstudar,
}: {
  erros: QuestaoErro[];
  setErros: (n: QuestaoErro[] | ((prev: QuestaoErro[]) => QuestaoErro[])) => void;
  onEstudar: (m: string, t: string) => void;
}) {
  const [filtroMateria, setFiltroMateria] = useState<string>("todas");
  const [tentativas, setTentativas] = useState<Record<string, number>>({});

  const materiasComErros = useMemo(() => {
    const s = new Set<string>();
    erros.forEach((e) => s.add(e.materia));
    return Array.from(s);
  }, [erros]);

  const errosFiltrados = useMemo(() => {
    if (filtroMateria === "todas") return erros;
    return erros.filter((e) => e.materia === filtroMateria);
  }, [erros, filtroMateria]);

  function responder(q: QuestaoErro, altIdx: number) {
    const key = q.id || q.enunciado;
    setTentativas((prev) => ({ ...prev, [key]: altIdx }));
  }

  function marcarComoResolvido(q: QuestaoErro) {
    setErros((prev) => prev.filter((e) => e.enunciado !== q.enunciado || e.materia !== q.materia));
  }

  const card = "rounded-xl border bg-card p-4 sm:p-5 shadow-sm";

  return (
    <div className="space-y-6">
      <div className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <h2 className="text-xl font-bold">Caderno de Erros</h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Revisar as questões erradas é a forma mais rápida de subir sua nota de corte.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
            {erros.length} {erros.length === 1 ? "questão salva" : "questões salvas"}
          </span>
        </div>

        {materiasComErros.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
            <Button
              size="sm"
              variant={filtroMateria === "todas" ? "default" : "outline"}
              onClick={() => setFiltroMateria("todas")}
              className="text-xs"
            >
              Todas ({erros.length})
            </Button>
            {materiasComErros.map((m) => {
              const qtd = erros.filter((e) => e.materia === m).length;
              return (
                <Button
                  key={m}
                  size="sm"
                  variant={filtroMateria === m ? "default" : "outline"}
                  onClick={() => setFiltroMateria(m)}
                  className="text-xs"
                >
                  {m} ({qtd})
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {errosFiltrados.length === 0 ? (
        <div className={`${card} text-center py-12`}>
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500/80 mb-3" />
          <h3 className="text-lg font-bold">Seu caderno de erros está limpo!</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-1">
            Parabéns! Você não tem erros pendentes para revisar. Continue resolvendo novos blocos ou simulados para testar seus conhecimentos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {errosFiltrados.map((q, idx) => {
            const key = q.id || q.enunciado;
            const resp = tentativas[key];
            const acertou = resp != null && resp === q.correta;

            return (
              <div key={idx} className={card}>
                <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b">
                  <span className="font-semibold uppercase tracking-wider">{q.materia} · {q.topico || "Geral"}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => marcarComoResolvido(q)}
                  >
                    Remover do caderno
                  </Button>
                </div>

                <p className="mt-3 font-medium text-foreground leading-relaxed whitespace-pre-line text-sm sm:text-base">
                  {q.enunciado}
                </p>

                <div className="mt-4 space-y-2">
                  {q.alternativas.map((alt, a) => {
                    let cls = "border bg-background hover:bg-muted/80 text-foreground";
                    if (resp != null) {
                      if (a === q.correta) {
                        cls = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold";
                      } else if (a === resp) {
                        cls = "border-destructive bg-destructive/15 text-destructive font-semibold";
                      } else {
                        cls = "border opacity-50";
                      }
                    }
                    return (
                      <button
                        type="button"
                        key={a}
                        disabled={resp != null}
                        onClick={() => responder(q, a)}
                        className={`flex w-full items-start gap-3 rounded-lg p-3 text-left text-xs sm:text-sm transition cursor-pointer ${cls}`}
                      >
                        <span className="font-bold">{"ABCDE"[a] + ")"}</span>
                        <span className="leading-relaxed">{alt}</span>
                      </button>
                    );
                  })}
                </div>

                {resp != null && (
                  <div className="mt-4 rounded-lg bg-muted p-3.5 text-xs sm:text-sm space-y-2">
                    <p className="font-bold flex items-center gap-2">
                      {acertou ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Excelente! Você superou esse erro.
                        </span>
                      ) : (
                        <span className="text-destructive flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" /> Ainda não é essa. A alternativa correta é a {"ABCDE"[q.correta]}.
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground leading-relaxed border-t pt-2">{q.explicacao}</p>
                    <div className="flex items-center justify-between pt-2">
                      <AudioExplicacao
                        texto={`${q.enunciado} A alternativa correta é a ${"ABCDE"[q.correta]}. ${q.explicacao}`}
                      />
                      {acertou && (
                        <Button size="sm" onClick={() => marcarComoResolvido(q)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                          Marcar como Dominada ✓
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// AUDIO EXPLICAÇÃO
// ----------------------------------------------------
function AudioExplicacao({ texto }: { texto: string }) {
  const gen = useServerFn(generateExplanationAudio);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [url, setUrl] = useState("");

  async function ouvir() {
    if (url) {
      new Audio(url).play();
      return;
    }
    setLoading(true);
    setErr("");
    const isHtml = (m?: string) => !m || /<html|<script|<!doctype/i.test(m);
    try {
      let res;
      try {
        res = await gen({ data: { texto: texto.slice(0, 2000) } });
      } catch (e: any) {
        if (!isHtml(e?.message) && !/fetch|network/i.test(e?.message ?? "")) throw e;
        await new Promise((r) => setTimeout(r, 1500));
        res = await gen({ data: { texto: texto.slice(0, 2000) } });
      }
      const u = `data:${res.mime};base64,${res.audio}`;
      setUrl(u);
      new Audio(u).play();
    } catch (e: any) {
      const m = e?.message;
      setErr(isHtml(m) || !m ? "Não foi possível gerar o áudio agora. Toque novamente para tentar." : m);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <Button variant="outline" size="sm" onClick={ouvir} disabled={loading} className="text-xs">
        {loading ? <Loader2 className="animate-spin mr-1 h-3.5 w-3.5" /> : <Volume2 className="mr-1 h-3.5 w-3.5" />}
        {loading ? "Gerando áudio..." : url ? "Ouvir novamente" : "Ouvir explicação em áudio"}
      </Button>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

// ----------------------------------------------------
// ABA DE QUESTÕES COM ATALHOS RÁPIDOS E FEEDBACK
// ----------------------------------------------------
function Questoes({
  studyTopic,
  stats,
  onIrPara,
}: {
  studyTopic: { materia: string; topico: string; id: number } | undefined;
  stats: Stats;
  onIrPara: (t: TabType) => void;
}) {
  const take = useServerFn(getQuestions);
  const refill = useServerFn(refillBank);
  const [materia, setMateria] = useState<string>(MATERIAS[0] ?? "Língua Portuguesa");
  const [topico, setTopico] = useState("");
  const [dif, setDif] = useState("média");
  const [qtd, setQtd] = useState(5);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [qs, setQs] = useState<BankQuestion[]>([]);
  const [resp, setResp] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sessionMateria, setSessionMateria] = useState("");

  const [, setUltimoEstudo] = useLocal<{ materia: string; timestamp: number }>("pcap-ultimo-estudo", {
    materia: MATERIAS[0],
    timestamp: Date.now(),
  });
  const [hist, setHist] = useLocal<Record<string, string[]>>("pcap-hist", {});
  const [, setStatsLocal] = useLocal<Stats>("pcap-stats", {});

  useEffect(() => {
    if (!studyTopic) return;
    setMateria(studyTopic.materia);
    setTopico(studyTopic.topico);
    setOptionsOpen(true);
  }, [studyTopic]);

  async function gerar(materiaEscolhida?: string) {
    const mat = materiaEscolhida || materia;
    setLoading(true);
    setErr("");
    try {
      const res = await take({ data: { materia: mat, topico: topico || undefined, quantidade: qtd } });
      if (!res.questions.length) {
        setErr(res.error ?? "Nenhuma questão nova agora. Tente novamente.");
        return;
      }
      setQs(res.questions);
      setSessionMateria(mat);
      setUltimoEstudo({ materia: mat, timestamp: Date.now() });
      setCurrent(0);
      setFinished(false);
      setResp({});
      setHist((prev) => ({
        ...prev,
        [mat]: [...(prev[mat] ?? []), ...res.questions.map((q) => q.id)],
      }));
      refill({ data: { materia: mat } }).catch((e) => console.error("Falha ao reabastecer o banco:", e));
    } catch (e: any) {
      setErr(e?.message && !/<html|<script/i.test(e.message) ? e.message : "Erro ao buscar questões. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function responder(i: number, a: number) {
    const question = qs[i];
    if (!question || resp[i] !== undefined) return;
    setResp((prev) => ({ ...prev, [i]: a }));

    const acertou = a === question.correta;
    onResposta?.(acertou);

    // Se errou, salva automaticamente no caderno de erros
    if (!acertou) {
      salvarErroGlobal(question);
    }

    setStatsLocal((prev) => {
      const s = prev[sessionMateria] ?? { certas: 0, total: 0 };
      return {
        ...prev,
        [sessionMateria]: {
          certas: s.certas + (a === question.correta ? 1 : 0),
          total: s.total + 1,
        },
      };
    });
  }

  function refazerErrosBloco() {
    const erradas = qs.filter((q, i) => resp[i] !== q.correta);
    if (!erradas.length) return;
    setQs(erradas);
    setResp({});
    setCurrent(0);
    setFinished(false);
  }

  const card = "rounded-xl border bg-card p-4 sm:p-5 shadow-sm";
  const input = "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground";
  const btn =
    "rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";

  const totalAcertosBloco = qs.filter((q, i) => resp[i] === q.correta).length;
  const taxaBloco = qs.length > 0 ? Math.round((totalAcertosBloco / qs.length) * 100) : 0;
  const errosDoBloco = qs.filter((q, i) => resp[i] != null && resp[i] !== q.correta);

  return (
    <div className="space-y-6">
      {/* Barra de Seleção Rápida */}
      <section className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold">Praticar Questões</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Estilo Cesgranrio · Questões comentadas e áudio com IA
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 w-fit">
            CESGRANRIO · PC-AP
          </span>
        </div>

        {/* Atalhos Rápidos */}
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Atalho rápido de início:
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => {
                setMateria("Língua Portuguesa");
                gerar("Língua Portuguesa");
              }}
              className="text-xs gap-1.5"
            >
              <Zap className="h-3.5 w-3.5 text-accent" /> Língua Portuguesa
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => {
                setMateria("Direito Penal");
                gerar("Direito Penal");
              }}
              className="text-xs gap-1.5"
            >
              <Zap className="h-3.5 w-3.5 text-accent" /> Direito Penal
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => {
                setMateria("Direito Constitucional");
                gerar("Direito Constitucional");
              }}
              className="text-xs gap-1.5"
            >
              <Zap className="h-3.5 w-3.5 text-accent" /> Direito Constitucional
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOptionsOpen(!optionsOpen)}
              className="text-xs gap-1 text-primary font-semibold"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {optionsOpen ? "Fechar filtros" : "Personalizar matéria e filtros"}
            </Button>
          </div>
        </div>

        {/* Seletores manuais quando abertos */}
        {optionsOpen && (
          <div className="mt-4 pt-4 border-t grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matéria</span>
              <select className={input} value={materia} onChange={(e) => setMateria(e.target.value)}>
                {MATERIAS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tópico (opcional)</span>
              <input
                className={input}
                placeholder="Ex: crimes contra a pessoa, concordância verbal, crase..."
                value={topico}
                onChange={(e) => setTopico(e.target.value)}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dificuldade</span>
              <select className={input} value={dif} onChange={(e) => setDif(e.target.value)}>
                <option>fácil</option>
                <option>média</option>
                <option>difícil</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tamanho do Bloco</span>
              <select className={input} value={qtd} onChange={(e) => setQtd(+e.target.value)}>
                {[3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} questões
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <span className="text-xs text-muted-foreground">
            {(hist[materia] ?? []).length} questões já resolvidas em {materia}
          </span>
          <Button className={btn} onClick={() => gerar()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-1 h-4 w-4" /> : <BookOpen className="mr-1 h-4 w-4" />}
            {loading ? "Buscando questões..." : qs.length ? "Novo Bloco de Questões" : "Iniciar Bloco de Estudos"}
          </Button>
        </div>

        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      </section>

      {loading && (
        <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Preparando {qtd} questões inéditas no padrão Cesgranrio…</span>
        </div>
      )}

      {/* Indicador de progresso no bloco */}
      {qs.length > 0 && !finished && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm bg-muted/60 px-4 py-2.5 rounded-lg border">
          <span className="font-bold text-foreground">{sessionMateria}</span>
          <span className="text-muted-foreground">
            Questão {current + 1} de {qs.length} · {Object.keys(resp).length} respondidas
          </span>
        </div>
      )}

      {/* FEEDBACK MOTIVADOR PÓS-BLOCO */}
      {finished && (
        <section className="space-y-4 rounded-xl border border-primary/20 bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-accent">Resultado do Bloco</span>
              <h2 className="text-xl sm:text-2xl font-black mt-0.5">
                {taxaBloco >= 80 ? "🔥 Excelente rendimento!" : taxaBloco >= 60 ? "👍 Bom desempenho!" : "💪 Hora de reforçar os pontos fracos!"}
              </h2>
            </div>
            <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-center">
              <p className="text-2xl font-black text-primary">{totalAcertosBloco} / {qs.length}</p>
              <p className="text-xs font-semibold text-muted-foreground">{taxaBloco}% de acerto</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {taxaBloco >= 80
              ? `Você dominou este bloco em ${sessionMateria}. Mantenha esse padrão para garantir sua vaga!`
              : `Você acertou ${totalAcertosBloco} questões de ${qs.length} em ${sessionMateria}. Suas dúvidas foram salvas no Caderno de Erros para revisão imediata.`}
          </p>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {errosDoBloco.length > 0 && (
              <Button onClick={refazerErrosBloco} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs sm:text-sm font-semibold">
                <RotateCcw className="h-4 w-4" /> Refazer os {errosDoBloco.length} erros deste bloco
              </Button>
            )}
            <Button onClick={() => gerar()} disabled={loading} className="gap-1.5 text-xs sm:text-sm font-semibold">
              <BookOpen className="h-4 w-4" /> Próximo bloco ({qtd} questões)
            </Button>
            <Button variant="outline" onClick={() => { setFinished(false); setCurrent(0); }} className="text-xs sm:text-sm">
              Revisar explicações
            </Button>
            <Button variant="ghost" onClick={() => onIrPara("desempenho")} className="text-xs sm:text-sm text-primary">
              Ver meu progresso completo →
            </Button>
          </div>
        </section>
      )}

      {/* Renderização da Questão Ativa */}
      {qs.map((q, i) => {
        if (i !== current || finished) return null;
        const r = resp[i];
        return (
          <div key={i} className={card}>
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b">
              <span className="font-semibold uppercase tracking-wider text-primary">
                Questão {i + 1} de {qs.length} · {q.topico || "Cesgranrio"}
              </span>
              <span className="text-[11px] font-mono">{sessionMateria}</span>
            </div>

            <p className="mt-3 text-sm sm:text-base font-medium leading-relaxed whitespace-pre-line text-foreground">
              {q.enunciado}
            </p>

            <div className="mt-4 space-y-2.5">
              {q.alternativas.map((alt, a) => {
                let cls = "border bg-background hover:bg-muted/80 text-foreground";
                if (r !== undefined) {
                  if (a === q.correta) {
                    cls = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold";
                  } else if (a === r) {
                    cls = "border-destructive bg-destructive/15 text-destructive font-semibold";
                  } else {
                    cls = "border opacity-50";
                  }
                }
                return (
                  <button
                    type="button"
                    disabled={r !== undefined}
                    key={a}
                    onClick={() => responder(i, a)}
                    className={`flex w-full items-start gap-3 rounded-lg p-3.5 text-left text-xs sm:text-sm transition cursor-pointer ${cls}`}
                  >
                    <span className="font-bold shrink-0">{"ABCDE"[a] + ")"}</span>
                    <span className="leading-relaxed">{alt}</span>
                  </button>
                );
              })}
            </div>

            {/* Comentário e Gabarito */}
            {r !== undefined && (
              <div className="mt-5 rounded-lg bg-muted/70 p-4 text-xs sm:text-sm space-y-2 border">
                <p className="font-bold flex items-center gap-1.5">
                  {r === q.correta ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Parabéns, resposta correta!
                    </span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Gabarito correto: alternativa {"ABCDE"[q.correta]}
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground leading-relaxed border-t pt-2">{q.explicacao}</p>
                <AudioExplicacao
                  texto={`${q.enunciado} A resposta correta é a alternativa ${"ABCDE"[q.correta]}. ${q.explicacao}`}
                />
              </div>
            )}

            {/* Navegação entre questões do bloco */}
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <Button variant="ghost" onClick={() => setCurrent(current - 1)} disabled={current === 0} className="gap-1 text-xs sm:text-sm">
                <ArrowLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button
                disabled={r === undefined}
                onClick={() => (current < qs.length - 1 ? setCurrent(current + 1) : setFinished(true))}
                className="gap-1 text-xs sm:text-sm font-semibold"
              >
                {current < qs.length - 1 ? "Próxima Questão" : "Finalizar Bloco"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------
// CRONOGRAMA VISUAL COM OPÇÃO "NÃO CONSEGUI ESTUDAR HOJE"
// ----------------------------------------------------
function Cronograma({
  onEstudar,
  cargoPadrao,
  horasPadrao,
}: {
  onEstudar: (materia: string, topico: string) => void;
  cargoPadrao?: string;
  horasPadrao?: number;
}) {
  const gen = useServerFn(generateSchedule);
  const [cargo, setCargo] = useState(cargoPadrao || "Agente de Polícia");
  const [horas, setHoras] = useState(horasPadrao || 3);
  const [dias, setDias] = useState(5);
  const [semanas, setSemanas] = useState(2);
  const [fracas, setFracas] = useState<string[]>([]);
  const [plano, setPlano] = useLocal<ScheduleDay[]>("pcap-plano", []);
  const [feitos, setFeitos] = useLocal<Record<string, boolean>>("pcap-feitos", {});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msgRedistribuido, setMsgRedistribuido] = useState("");

  async function gerar() {
    setLoading(true);
    setErr("");
    setMsgRedistribuido("");
    try {
      const p = await gen({ data: { cargo, horasDia: horas, diasSemana: dias, semanas, fracas, materias: MATERIAS } });
      setPlano(p);
      setFeitos({});
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao gerar cronograma.");
    } finally {
      setLoading(false);
    }
  }

  // Redistribui as tarefas não feitas de um dia para os próximos dias
  function naoConseguiEstudarHoje(diaIdx: number) {
    if (!plano[diaIdx]) return;
    const diaAtual = plano[diaIdx];
    const blocosPendentes = diaAtual.blocos.filter((_, bIdx) => !feitos[`${diaIdx}-${bIdx}`]);

    if (!blocosPendentes.length) {
      alert("Todas as tarefas deste dia já foram concluídas!");
      return;
    }

    if (diaIdx >= plano.length - 1) {
      // Cria um dia extra
      const novoDia: ScheduleDay = {
        dia: `Dia Extra (Reposição)`,
        blocos: blocosPendentes,
      };
      setPlano((prev) => [...prev, novoDia]);
    } else {
      // Redistribui nos dias seguintes
      const novoPlano = [...plano];
      let alvoIdx = diaIdx + 1;
      for (const bloco of blocosPendentes) {
        if (!novoPlano[alvoIdx]) alvoIdx = diaIdx + 1;
        novoPlano[alvoIdx] = {
          ...novoPlano[alvoIdx],
          blocos: [...novoPlano[alvoIdx].blocos, bloco],
        };
        alvoIdx = (alvoIdx + 1) % novoPlano.length;
      }
      setPlano(novoPlano);
    }

    setMsgRedistribuido(`As tarefas pendentes do ${diaAtual.dia} foram redistribuídas para os próximos dias sem sobrecarregar seu plano!`);
    setTimeout(() => setMsgRedistribuido(""), 6000);
  }

  const card = "rounded-xl border bg-card p-4 sm:p-5 shadow-sm";
  const input = "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground";
  const btn =
    "rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";

  return (
    <div className="space-y-6">
      <div className={`${card} space-y-4`}>
        <div className="border-b pb-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Cronograma Inteligente de Estudos
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Organizado em blocos diários de alta retenção. Flexível para quando imprevistos acontecerem.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cargo</span>
            <select className={input} value={cargo} onChange={(e) => setCargo(e.target.value)}>
              {["Investigador de Polícia", "Agente de Polícia", "Escrivão de Polícia", "Delegado de Polícia", "Perito Criminal"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horas por dia</span>
            <input
              type="number"
              min={1}
              max={12}
              className={input}
              value={horas}
              onChange={(e) => setHoras(+e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dias por semana</span>
            <input
              type="number"
              min={1}
              max={7}
              className={input}
              value={dias}
              onChange={(e) => setDias(+e.target.value)}
            />
          </label>

          <div className="space-y-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Disciplinas com maior dificuldade (receberão mais horas)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MATERIAS.map((m) => {
                const on = fracas.includes(m);
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setFracas(on ? fracas.filter((f) => f !== m) : [...fracas, m])}
                    className={`rounded-full border px-3 py-1 text-xs transition cursor-pointer ${
                      on ? "border-accent bg-accent text-accent-foreground font-bold shadow-sm" : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end sm:col-span-2 pt-2">
            <Button className={btn} onClick={gerar} disabled={loading}>
              {loading ? "Montando plano com IA..." : plano.length ? "Regerar Cronograma" : "Gerar Meu Cronograma"}
            </Button>
          </div>
        </div>

        {err && <p className="text-sm text-destructive">{err}</p>}
        {msgRedistribuido && (
          <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{msgRedistribuido}</span>
          </div>
        )}
      </div>

      {/* Visualização dos Dias do Plano */}
      {plano.map((d, i) => {
        const totalTarefas = d.blocos.length;
        const concluidas = d.blocos.filter((_, j) => feitos[`${i}-${j}`]).length;
        const pctDia = totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0;

        return (
          <section key={i} className={`${card} space-y-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> {d.dia}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {concluidas} de {totalTarefas} tarefas feitas ({pctDia}%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {concluidas < totalTarefas && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => naoConseguiEstudarHoje(i)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    title="Move as tarefas não concluídas para os próximos dias"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Não consegui estudar hoje
                  </Button>
                )}
              </div>
            </div>

            {/* Barra de progresso do dia */}
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${pctDia === 100 ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${pctDia}%` }}
              />
            </div>

            {/* Lista de Blocos do Dia */}
            <ul className="space-y-2 pt-1">
              {d.blocos.map((b, j) => {
                const k = `${i}-${j}`;
                const feito = !!feitos[k];
                return (
                  <li key={k} className="rounded-lg border bg-background/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <label className="flex items-start gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded accent-primary"
                        checked={feito}
                        onChange={() => setFeitos((prev) => ({ ...prev, [k]: !feito }))}
                      />
                      <div>
                        <p className={`text-xs sm:text-sm font-bold ${feito ? "line-through opacity-50" : "text-foreground"}`}>
                          {b.materia}
                        </p>
                        <p className={`text-xs text-muted-foreground ${feito ? "opacity-50" : ""}`}>
                          {b.topico}
                        </p>
                      </div>
                    </label>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="rounded bg-accent/20 border border-accent/30 px-2 py-0.5 text-[11px] font-semibold text-accent">
                        {b.minutos} min
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEstudar(b.materia, b.topico)}
                        className="text-xs font-semibold text-primary hover:text-primary gap-1 h-7"
                      >
                        <BookOpen className="h-3 w-3" /> Praticar Questões
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------
// DASHBOARD DE PROGRESSO VISUAL
// ----------------------------------------------------
function Desempenho({ stats, onEstudar }: { stats: Stats; onEstudar: (m: string, t: string) => void }) {
  const entries = Object.entries(stats);

  const totalQuestoes = entries.reduce((acc, [, s]) => acc + s.total, 0);
  const totalCertas = entries.reduce((acc, [, s]) => acc + s.certas, 0);
  const taxaMedia = totalQuestoes > 0 ? Math.round((totalCertas / totalQuestoes) * 100) : 0;

  // Matérias ordenadas por menor percentual (precisam de reforço)
  const materiasOrdenadas = useMemo(() => {
    return [...entries].sort((a, b) => a[1].certas / a[1].total - b[1].certas / b[1].total);
  }, [entries]);

  const materiasFracas = materiasOrdenadas.filter(([, s]) => s.total >= 1 && Math.round((s.certas / s.total) * 100) < 60);

  const card = "rounded-xl border bg-card p-4 sm:p-5 shadow-sm";

  if (!entries.length) {
    return (
      <div className={`${card} text-center py-12`}>
        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
        <h3 className="text-lg font-bold">Nenhum dado de desempenho registrado ainda</h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mt-1">
          Resolva questões em qualquer matéria para gerar seu Raio-X de aproveitamento com gráficos e recomendações.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Geral em Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={card}>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Questões Resolvidas</span>
          <p className="text-3xl font-black mt-1 text-foreground">{totalQuestoes}</p>
          <span className="text-xs text-muted-foreground">banco acumulado</span>
        </div>

        <div className={card}>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acertos Totais</span>
          <p className="text-3xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{totalCertas}</p>
          <span className="text-xs text-muted-foreground">questões gabaritadas</span>
        </div>

        <div className={card}>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taxa Geral de Precisão</span>
          <p className="text-3xl font-black mt-1 text-primary">{taxaMedia}%</p>
          <span className="text-xs text-muted-foreground">{taxaMedia >= 70 ? "Competitivo para aprovação" : "Em fase de evolução"}</span>
        </div>
      </div>

      {/* Matérias que precisam de reforço */}
      {materiasFracas.length > 0 && (
        <div className={`${card} border-amber-500/30 bg-amber-500/5`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base">Disciplinas que Mais Precisam de Reforço (&lt; 60% de acerto)</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Priorize estas matérias em seus próximos blocos de estudo para equilibrar sua pontuação geral.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {materiasFracas.map(([m, s]) => {
              const pct = Math.round((s.certas / s.total) * 100);
              return (
                <div key={m} className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-card p-3">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-foreground">{m}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{s.certas}/{s.total} acertos ({pct}%)</p>
                  </div>
                  <Button size="sm" onClick={() => onEstudar(m, "")} className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                    Treinar agora
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Raio-X Completo por Matéria */}
      <div className={card}>
        <h3 className="font-bold text-base sm:text-lg mb-4">Raio-X de Desempenho por Disciplina</h3>
        <div className="space-y-4">
          {entries.map(([m, s]) => {
            const pct = Math.round((s.certas / s.total) * 100);
            const statusColor = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-destructive";
            const textStatusColor = pct >= 75 ? "text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-destructive";

            return (
              <div key={m} className="space-y-1.5 border-b pb-3.5 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-foreground">{m}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{s.certas} de {s.total}</span>
                    <span className={`font-bold font-mono text-xs sm:text-sm ${textStatusColor}`}>{pct}%</span>
                    <button
                      type="button"
                      onClick={() => onEstudar(m, "")}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      Treinar
                    </button>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${statusColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// MODAL DE CONFIGURAÇÃO DE METAS / PERFIL
// ----------------------------------------------------

function ModalLembretes({
  lembretes,
  errosPendentes,
  onSalvar,
  onFechar,
}: {
  lembretes: LembretesConfig;
  errosPendentes: number;
  onSalvar: (novos: LembretesConfig) => void;
  onFechar: () => void;
}) {
  const [estudoAtivo, setEstudoAtivo] = useState(lembretes.estudoHojeAtivo);
  const [estudoHorario, setEstudoHorario] = useState(lembretes.estudoHojeHorario);
  const [revisaoAtivo, setRevisaoAtivo] = useState(lembretes.revisaoErrosAtivo);
  const [revisaoHorario, setRevisaoHorario] = useState(lembretes.revisaoErrosHorario);
  const [notificacaoNavegador, setNotificacaoNavegador] = useState(lembretes.notificacaoNavegador);
  const [statusPermissao, setStatusPermissao] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });
  const [testeDisparado, setTesteDisparado] = useState(false);

  async function pedirPermissao() {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setStatusPermissao(perm);
        if (perm === "granted") {
          setNotificacaoNavegador(true);
        }
      } catch {}
    }
  }

  function testarNotificacao() {
    setTesteDisparado(true);
    dispararNotificacaoNativa(
      "🎯 Teste de Lembrete - Portal do Concurseiro",
      "Seus lembretes estão funcionando perfeitamente! Bons estudos rumo à aprovação."
    );
    setTimeout(() => setTesteDisparado(false), 3000);
  }

  const inputClass = "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="border-b pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" /> Configurar Lembretes de Estudo
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Defina os melhores horários para estudar e revisar sem esquecer sua meta diária.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onFechar} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Lembrete 1: Estudo do Dia */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">1. Estudo de Hoje</span>
                <h4 className="text-sm font-semibold text-foreground">Horário do Bloco Diário</h4>
              </div>
              <button
                type="button"
                onClick={() => setEstudoAtivo(!estudoAtivo)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${estudoAtivo ? "bg-primary" : "bg-muted"}`}
                role="switch"
                aria-checked={estudoAtivo}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${estudoAtivo ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Avisa o momento de cumprir sua meta de questões e avançar nas disciplinas do cronograma.
            </p>
            {estudoAtivo && (
              <div className="flex items-center gap-3 pt-1">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="time"
                  className={inputClass}
                  value={estudoHorario}
                  onChange={(e) => setEstudoHorario(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Lembrete 2: Revisões Pendentes */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">2. Revisão de Erros</span>
                <h4 className="text-sm font-semibold text-foreground">Horário do Caderno de Erros</h4>
              </div>
              <button
                type="button"
                onClick={() => setRevisaoAtivo(!revisaoAtivo)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${revisaoAtivo ? "bg-amber-500" : "bg-muted"}`}
                role="switch"
                aria-checked={revisaoAtivo}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${revisaoAtivo ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Lembra você de refazer questões com erros anteriores ({errosPendentes} pendentes) para fixação definitiva.
            </p>
            {revisaoAtivo && (
              <div className="flex items-center gap-3 pt-1">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="time"
                  className={inputClass}
                  value={revisaoHorario}
                  onChange={(e) => setRevisaoHorario(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Notificações do Navegador */}
          <div className="rounded-xl border border-border/80 bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <BellRing className="h-4 w-4 text-primary" /> Notificações do Navegador
                </h4>
                <p className="text-xs text-muted-foreground">
                  Receba alertas na tela mesmo quando estiver em outra aba ou aplicativo.
                </p>
              </div>
              {statusPermissao === "granted" ? (
                <button
                  type="button"
                  onClick={() => setNotificacaoNavegador(!notificacaoNavegador)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${notificacaoNavegador ? "bg-primary" : "bg-muted"}`}
                  role="switch"
                  aria-checked={notificacaoNavegador}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${notificacaoNavegador ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={pedirPermissao}
                  className="text-xs font-semibold shrink-0"
                >
                  Ativar Permissão
                </Button>
              )}
            </div>

            {statusPermissao === "granted" && (
              <div className="pt-2 flex items-center justify-between border-t border-border/60">
                <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Permissão autorizada no navegador
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={testarNotificacao}
                  disabled={testeDisparado}
                  className="text-xs h-7 text-primary hover:text-primary/90 font-medium"
                >
                  {testeDisparado ? "Disparado!" : "Testar Alerta Agora"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button variant="ghost" onClick={onFechar} className="text-xs sm:text-sm">
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onSalvar({
                estudoHojeAtivo: estudoAtivo,
                estudoHojeHorario: estudoHorario,
                revisaoErrosAtivo: revisaoAtivo,
                revisaoErrosHorario: revisaoHorario,
                notificacaoNavegador,
              })
            }
            className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm"
          >
            Salvar Lembretes
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModalPerfil({
  perfil,
  onSalvar,
  onAbrirLembretes,
  onFechar,
}: {
  perfil: PerfilAluno;
  onSalvar: (p: PerfilAluno) => void;
  onAbrirLembretes?: () => void;
  onFechar: () => void;
}) {
  const [cargo, setCargo] = useState(perfil.cargo);
  const [horasDia, setHorasDia] = useState(perfil.horasDia);
  const [metaSemanal, setMetaSemanal] = useState(perfil.metaSemanal);
  const [dataProva, setDataProva] = useState(perfil.dataProva);

  const input = "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="border-b pb-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" /> Metas de Estudo & Perfil
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personalize seu plano para adequar ao seu ritmo e ao concurso da PC-AP.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cargo Pretendido</span>
            <select className={input} value={cargo} onChange={(e) => setCargo(e.target.value)}>
              {["Investigador de Polícia", "Agente de Polícia", "Escrivão de Polícia", "Delegado de Polícia", "Perito Criminal"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horas Disponíveis por Dia</span>
            <input
              type="number"
              min={1}
              max={12}
              className={input}
              value={horasDia}
              onChange={(e) => setHorasDia(+e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta Semanal de Questões</span>
            <input
              type="number"
              min={10}
              max={500}
              step={10}
              className={input}
              value={metaSemanal}
              onChange={(e) => setMetaSemanal(+e.target.value)}
            />
          </label>

          {onAbrirLembretes && (
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onAbrirLembretes}
                className="w-full text-xs font-semibold justify-between border-dashed border-amber-500/40 hover:bg-amber-500/10 text-foreground"
              >
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" /> Configurar Lembretes de Estudo &amp; Revisão
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Estimada da Prova</span>
            <input
              type="date"
              className={input}
              value={dataProva}
              onChange={(e) => setDataProva(e.target.value)}
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button variant="ghost" onClick={onFechar} className="text-xs sm:text-sm">
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onSalvar({
                cargo,
                horasDia,
                metaSemanal,
                dataProva,
                onboarded: true,
              })
            }
            className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm"
          >
            Salvar Metas
          </Button>
        </div>
      </div>
    </div>
  );
}
