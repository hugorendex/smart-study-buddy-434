import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Timer,
  Flag,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Award,
  ArrowRight,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { getSimulado, type BankQuestion as Question } from "@/lib/bank.functions";

type Cargo = "investigador" | "delegado";

// Distribuição oficial do edital PC-AP (Prova Objetiva, 80 questões).
const PROVAS: Record<Cargo, { nome: string; materias: [string, number][] }> = {
  investigador: {
    nome: "Oficial Investigador",
    materias: [
      ["Língua Portuguesa", 8],
      ["Raciocínio Lógico-Matemático", 8],
      ["Noções de Estatística e Análise de Dados", 8],
      ["Noções de Contabilidade e Análise Financeira", 8],
      ["Noções de Informática", 12],
      ["Direito Penal e Legislação Penal Especial", 8],
      ["Direito Processual Penal e Legislação Processual Penal Especial", 8],
      ["Direito Constitucional", 5],
      ["Direito Administrativo", 5],
      ["Direitos Humanos", 4],
      ["História do Amapá, Geografia do Amapá e Legislação Institucional", 6],
    ],
  },
  delegado: {
    nome: "Delegado de Polícia",
    materias: [
      ["Direito Administrativo e Legislação Complementar", 10],
      ["Direito Constitucional e Legislação Complementar", 10],
      ["Direito Penal e Legislação Complementar", 17],
      ["Direito Processual Penal e Legislação Complementar", 17],
      ["Direito Civil/Empresarial e Legislação Complementar", 4],
      ["Direito Tributário e Legislação Complementar", 4],
      ["Direito Ambiental e Legislação Complementar", 4],
      ["Medicina Legal", 4],
      ["Criminologia", 4],
      ["História do Amapá, Geografia do Amapá e Legislação Institucional", 6],
    ],
  },
};

const DURACAO = 5.5 * 3600;
type Item = Question & { materia: string };

function fmt(s: number) {
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    x = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
}

function salvarErrosNoCaderno(erradas: Item[]) {
  try {
    const raw = localStorage.getItem("pcap-erros");
    const lista = raw ? JSON.parse(raw) : [];
    for (const q of erradas) {
      if (!lista.some((e: any) => e.materia === q.materia && e.enunciado === q.enunciado)) {
        lista.unshift({
          id: q.id,
          materia: q.materia,
          topico: q.topico,
          enunciado: q.enunciado,
          alternativas: q.alternativas,
          correta: q.correta,
          explicacao: q.explicacao,
          origem: "simulado",
          dataErro: Date.now(),
        });
      }
    }
    localStorage.setItem("pcap-erros", JSON.stringify(lista.slice(0, 200)));
  } catch {}
}

export function Simulado() {
  const gen = useServerFn(getSimulado);
  const [cargo, setCargo] = useState<Cargo>("investigador");
  const [fase, setFase] = useState<"inicio" | "gerando" | "prova" | "resultado">("inicio");
  const [itens, setItens] = useState<Item[]>([]);
  const [resp, setResp] = useState<Record<number, number>>({});
  const [marcadas, setMarcadas] = useState<Record<number, boolean>>({});
  const [idx, setIdx] = useState(0);
  const [err, setErr] = useState("");
  const [restante, setRestante] = useState(DURACAO);
  const [modoApenasErradas, setModoApenasErradas] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const prova = PROVAS[cargo];
  const total = prova.materias.reduce((a, [, n]) => a + n, 0);

  useEffect(() => {
    if (fase !== "prova") return;
    timer.current = setInterval(() => setRestante((r) => r - 1), 1000);
    return () => clearInterval(timer.current);
  }, [fase]);

  useEffect(() => {
    if (fase === "prova" && restante <= 0) {
      finalizarProva();
    }
  }, [restante, fase]);

  function finalizarProva() {
    setFase("resultado");
    // Salvar erradas no caderno de erros automaticamente
    const erradas = itens.filter((q, i) => resp[i] !== q.correta);
    salvarErrosNoCaderno(erradas);
  }

  async function iniciar() {
    setFase("gerando");
    setErr("");
    setModoApenasErradas(false);
    try {
      const result = await gen({ data: { cargo } });
      if (result.questions.length !== total) {
        setErr(
          result.error ||
            "Ainda não há questões inéditas suficientes para um simulado completo de 80 questões. Você pode continuar praticando nas matérias individuais."
        );
        setFase("inicio");
        return;
      }
      setItens(result.questions);
      setResp({});
      setMarcadas({});
      setIdx(0);
      setRestante(DURACAO);
      setFase("prova");
    } catch {
      setErr("Não foi possível buscar o simulado agora. Tente novamente.");
      setFase("inicio");
    }
  }

  function refazerApenasErradas() {
    const erradas = itens.filter((q, i) => resp[i] !== q.correta);
    if (!erradas.length) return;
    setItens(erradas);
    setResp({});
    setMarcadas({});
    setIdx(0);
    setModoApenasErradas(true);
    setRestante(Math.min(erradas.length * 2.5 * 60, DURACAO));
    setFase("prova");
  }

  function toggleMarcar(i: number) {
    setMarcadas((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  const card = "rounded-xl border bg-card p-4 sm:p-6 shadow-sm";

  if (fase === "inicio" || fase === "gerando") {
    return (
      <div className={card}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Simulado da Prova Objetiva</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Experiência realista no padrão do concurso da Polícia Civil do Amapá
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border bg-muted/40 p-3.5 text-xs sm:text-sm space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Formato Oficial do Edital
          </p>
          <p className="text-muted-foreground">
            80 questões com 5 alternativas (A a E), tempo cronometrado de 5h30, aviso de reta final e cartão-resposta com marcação de revisão.
          </p>
        </div>

        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecione o Cargo:</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(PROVAS) as Cargo[]).map((c) => (
              <Button
                key={c}
                variant={cargo === c ? "default" : "outline"}
                disabled={fase === "gerando"}
                onClick={() => setCargo(c)}
                className={cargo === c ? "shadow-sm font-semibold" : ""}
              >
                {PROVAS[c].nome}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <span>Distribuição de Disciplinas</span>
            <span>{total} questões</span>
          </div>
          <ul className="divide-y rounded-lg border bg-background/50 text-xs sm:text-sm">
            {prova.materias.map(([m, n]) => (
              <li key={m} className="flex justify-between gap-3 px-3.5 py-2">
                <span>{m}</span>
                <span className="font-semibold text-foreground">{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Regra eliminatória do edital: Nota zero em qualquer disciplina elimina o candidato.</span>
        </div>

        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}

        {fase === "gerando" ? (
          <div className="mt-5 flex items-center justify-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm font-medium text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Organizando as {total} questões da prova oficial...</span>
          </div>
        ) : (
          <Button className="mt-5 w-full text-base font-semibold py-6" size="lg" onClick={iniciar}>
            <Award className="mr-2 h-5 w-5" /> Iniciar Simulado Completo
          </Button>
        )}
      </div>
    );
  }

  if (fase === "resultado") {
    const porMat = prova.materias.map(([m]) => {
      const qs = itens.map((q, i) => ({ q, i })).filter((x) => x.q.materia === m);
      const certas = qs.filter((x) => resp[x.i] === x.q.correta).length;
      return { m, certas, total: qs.length };
    });
    const acertos = porMat.reduce((a, x) => a + x.certas, 0);
    const zerou = porMat.filter((x) => x.total > 0 && x.certas === 0);
    const taxaGlobal = Math.round((acertos / itens.length) * 100);
    const metaAprovacao = 60; // 60% nota de corte de referência
    const aprovado = taxaGlobal >= metaAprovacao && zerou.length === 0;
    const totalErradas = itens.length - acertos;

    return (
      <div className="space-y-6">
        <div className={card}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {modoApenasErradas ? "Treino de Revisão" : "Relatório Oficial"}
              </span>
              <h2 className="text-2xl font-bold mt-0.5">{prova.nome}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tempo utilizado: {fmt(DURACAO - Math.max(restante, 0))}
              </p>
            </div>
            <div className={`rounded-xl px-4 py-2 text-center border ${aprovado ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"}`}>
              <p className="text-xs font-semibold uppercase">{aprovado ? "Status: Competitivo" : "Abaixo da Nota de Corte"}</p>
              <p className="text-2xl font-black">{acertos} / {itens.length}</p>
              <p className="text-xs font-medium">{taxaGlobal}% de acerto (Meta: {metaAprovacao}%)</p>
            </div>
          </div>

          {zerou.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3.5 text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Atenção ao edital: você zerou {zerou.length} disciplina(s):</p>
                <p className="text-xs mt-0.5">{zerou.map((x) => x.m).join(", ")}. No concurso real, isso causaria desclassificação direta.</p>
              </div>
            </div>
          )}

          <div className="mt-5">
            <h3 className="text-sm font-semibold mb-2">Desempenho por Matéria</h3>
            <ul className="divide-y rounded-lg border text-xs sm:text-sm bg-background/50">
              {porMat.map((x) => {
                const pct = x.total > 0 ? Math.round((x.certas / x.total) * 100) : 0;
                return (
                  <li key={x.m} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <span className="truncate">{x.m}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold ${x.certas === 0 ? "text-destructive" : pct >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {x.certas}/{x.total} ({pct}%)
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {totalErradas > 0 && (
              <Button onClick={refazerApenasErradas} className="flex-1 sm:flex-none">
                <RotateCcw className="mr-2 h-4 w-4" /> Refazer apenas as erradas ({totalErradas})
              </Button>
            )}
            <Button variant="outline" onClick={() => setFase("inicio")} className="flex-1 sm:flex-none">
              Novo Simulado
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Gabarito Comentado e Correção
          </h3>
          {itens.map((q, i) => {
            const acertou = resp[i] === q.correta;
            return (
              <div key={i} className={`rounded-xl border p-4 sm:p-5 shadow-sm bg-card transition ${acertou ? "border-emerald-500/30" : "border-destructive/30"}`}>
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase">
                  <span>{i + 1}. {q.materia}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${acertou ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-destructive/15 text-destructive"}`}>
                    {acertou ? "✓ Acertou" : "✗ Errou"}
                  </span>
                </div>
                <p className="mt-2 font-medium text-foreground leading-relaxed">{q.enunciado}</p>
                <div className="mt-3 text-xs sm:text-sm rounded-lg bg-muted/60 p-3 space-y-1">
                  <p>
                    Sua marcação: <b className={acertou ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>{resp[i] != null ? "ABCDE"[resp[i]] : "Não respondeu"}</b>
                    {" · "}Gabarito: <b className="text-emerald-600 dark:text-emerald-400">{"ABCDE"[q.correta]}</b>
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed pt-1 border-t">{q.explicacao}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const q = itens[idx];
  if (!q) return null;
  const respondidas = Object.keys(resp).length;
  const totalMarcadas = Object.values(marcadas).filter(Boolean).length;
  const isPoucoTempo = restante <= 1800;
  const isRetaFinal = restante <= 600;

  return (
    <div className="space-y-4">
      {/* Barra de Status e Cronômetro */}
      <div className={`${card} flex flex-wrap items-center justify-between gap-3 sticky top-2 z-10 backdrop-blur-md bg-card/95 border`}>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 font-mono text-sm sm:text-base font-bold px-3 py-1 rounded-full border ${isRetaFinal ? "bg-destructive/15 text-destructive border-destructive/40 animate-pulse" : isPoucoTempo ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" : "bg-muted text-foreground border-border"}`}>
            <Timer className="h-4 w-4" />
            <span>{fmt(Math.max(restante, 0))}</span>
          </div>
          {isRetaFinal && (
            <span className="hidden sm:inline text-xs font-semibold text-destructive">
              ⚠️ Reta final da prova!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <span>{respondidas}/{itens.length} feitas</span>
          {totalMarcadas > 0 && (
            <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
              <Flag className="h-3.5 w-3.5 fill-current" /> {totalMarcadas}
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="text-xs sm:text-sm font-semibold border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={() => {
            if (confirm("Deseja realmente entregar e finalizar o simulado agora?")) {
              finalizarProva();
            }
          }}
        >
          Entregar Simulado
        </Button>
      </div>

      {/* Questão Atual */}
      <div className={card}>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wider">{q.materia}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">Questão {idx + 1} de {itens.length}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toggleMarcar(idx)}
              className={`h-7 px-2 text-xs flex items-center gap-1 transition ${marcadas[idx] ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold" : "text-muted-foreground hover:text-foreground"}`}
              title="Marcar questão para revisar depois"
            >
              <Flag className={`h-3.5 w-3.5 ${marcadas[idx] ? "fill-amber-500 text-amber-500" : ""}`} />
              <span className="hidden sm:inline">{marcadas[idx] ? "Marcada para revisão" : "Revisar"}</span>
            </Button>
          </div>
        </div>

        <p className="mt-3 text-base sm:text-lg font-medium leading-relaxed whitespace-pre-line text-foreground">
          {q.enunciado}
        </p>

        {/* Alternativas */}
        <div className="mt-5 space-y-2.5">
          {q.alternativas.map((alt, k) => {
            const selecionada = resp[idx] === k;
            return (
              <button
                type="button"
                key={k}
                onClick={() => setResp({ ...resp, [idx]: k })}
                className={`flex w-full items-start gap-3 rounded-lg border p-3.5 text-left text-sm transition cursor-pointer ${
                  selecionada
                    ? "border-primary bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "border-border bg-background hover:bg-muted/80 text-foreground"
                }`}
              >
                <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  selecionada ? "bg-white/20 text-white" : "bg-muted text-foreground"
                }`}>
                  {"ABCDE"[k]}
                </span>
                <span className="mt-0.5 leading-relaxed">{alt}</span>
              </button>
            );
          })}
        </div>

        {/* Navegação entre questões */}
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <Button variant="ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Anterior
          </Button>

          {idx < itens.length - 1 ? (
            <Button onClick={() => setIdx(idx + 1)} className="gap-1">
              Próxima <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                if (confirm("Esta é a última questão. Deseja entregar o simulado agora?")) {
                  finalizarProva();
                }
              }}
            >
              Entregar Prova <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Cartão-Resposta Interativo */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cartão-Resposta da Prova</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Feitas</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Revisar</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted border" /> Em branco</span>
          </div>
        </div>

        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 md:grid-cols-16">
          {itens.map((_, i) => {
            const marcada = marcadas[i];
            const respondida = resp[i] != null;
            const ativa = i === idx;
            let corClasses = "bg-background text-foreground border-border hover:bg-muted";

            if (marcada) {
              corClasses = "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500 font-bold";
            } else if (respondida) {
              corClasses = "bg-primary text-primary-foreground font-semibold border-primary";
            }

            return (
              <button
                type="button"
                key={i}
                onClick={() => setIdx(i)}
                className={`relative flex h-8 items-center justify-center rounded-md border text-xs transition cursor-pointer ${
                  ativa ? "ring-2 ring-primary ring-offset-2 ring-offset-background font-bold scale-105 z-10" : ""
                } ${corClasses}`}
                title={`Questão ${i + 1}${respondida ? " (Respondida)" : ""}${marcada ? " (Marcada para revisão)" : ""}`}
              >
                {marcada && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
                )}
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
