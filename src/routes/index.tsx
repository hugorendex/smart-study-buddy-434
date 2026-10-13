import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Loader2, SlidersHorizontal, Volume2 } from "lucide-react";
import { Simulado } from "@/components/Simulado";
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
      { title: "Aprova PC-AP — Questões com IA e cronograma" },
      {
        name: "description",
        content: "Estude para a Polícia Civil do Amapá com questões inéditas geradas por IA e cronograma personalizado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Aprova PC-AP — Questões com IA" },
      {
        property: "og:description",
        content: "Questões inéditas e cronograma de estudos para o concurso da PC-AP.",
      },
    ],
  }),
  component: Index,
});

const MATERIAS = [
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

type Stats = Record<string, { certas: number; total: number }>;

function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { setV(JSON.parse(raw)); } catch { /* Ignore invalid saved data. */ }
    }
  }, [key]);
  const set = (n: T) => {
    setV(n);
    localStorage.setItem(key, JSON.stringify(n));
  };
  return [v, set] as const;
}

function Index() {
  const [tab, setTab] = useState<"questoes" | "cronograma" | "desempenho" | "simulado">("questoes");
  const [studyTopic, setStudyTopic] = useState<{ materia: string; topico: string; id: number }>();
  function estudar(materia: string, topico: string) {
    setStudyTopic({ materia, topico, id: Date.now() });
    setTab("questoes");
  }
  return (
    <div className="min-h-screen">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 pb-8 pt-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Polícia Civil do Amapá</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Aprova PC-AP</h1>
          <p className="mt-2 max-w-lg opacity-80">Preparação PC-AP · Padrão Fundação Cesgranrio</p>
          <nav className="mt-6 flex gap-2 overflow-x-auto">
            {(
              [
                ["questoes", "Questões"],
                ["cronograma", "Cronograma"],
                ["desempenho", "Desempenho"],
                ["simulado", "Simulado"],
              ] as const
            ).map(([k, l]) => (
              <Button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab === k ? "bg-accent text-accent-foreground" : "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                }`}
              >
                {l}
              </Button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <AuthGate>
          {(session) => (
            <>
              <div className="mb-4 flex items-center justify-end gap-3 text-xs text-muted-foreground">
                <span className="truncate">{session.user.email}</span>
                <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Sair</Button>
              </div>
              <div hidden={tab !== "questoes"}><Questoes studyTopic={studyTopic} /></div>
              <div hidden={tab !== "cronograma"}><Cronograma onEstudar={estudar} /></div>
              {tab === "desempenho" && <Desempenho />}
              <div hidden={tab !== "simulado"}><Simulado /></div>
            </>
          )}
        </AuthGate>
      </main>
    </div>
  );
}

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
    const isHtml = (m?: string) => !!m && /<html|<script|<!doctype/i.test(m);
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
    <div className="mt-3">
      <Button variant="outline" size="sm" onClick={ouvir} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <Volume2 />}
        {loading ? "Gerando áudio..." : url ? "Ouvir novamente" : "Ouvir explicação"}
      </Button>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

const card = "rounded-lg border bg-card p-4 sm:p-5 shadow-sm";
const input = "w-full rounded-md border bg-background px-3 py-2";
const btn =
  "rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";

function Questoes({ studyTopic }: { studyTopic: { materia: string; topico: string; id: number } | undefined }) {
  const take = useServerFn(getQuestions);
  const refill = useServerFn(refillBank);
  const [materia, setMateria] = useState<string>(MATERIAS[0] ?? "Língua Portuguesa");
  const [topico, setTopico] = useState("");
  const [dif, setDif] = useState("média");
  const [qtd, setQtd] = useState(3);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [qs, setQs] = useState<BankQuestion[]>([]);
  const [resp, setResp] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sessionMateria, setSessionMateria] = useState("");
  useEffect(() => {
    if (!studyTopic) return;
    setMateria(studyTopic.materia);
    setTopico(studyTopic.topico);
    setOptionsOpen(true);
  }, [studyTopic]);
  const [hist, setHist] = useLocal<Record<string, string[]>>("pcap-hist", {});
  const [stats, setStats] = useLocal<Stats>("pcap-stats", {});

  async function gerar() {
    setLoading(true);
    setErr("");
    try {
      const res = await take({ data: { materia, topico: topico || undefined, quantidade: qtd } });
      if (!res.questions.length) {
        setErr(res.error ?? "Nenhuma questão nova agora. Tente novamente.");
        return;
      }
      setQs(res.questions);
      setSessionMateria(materia);
      setCurrent(0);
      setFinished(false);
      setResp({});
      setHist({ ...hist, [materia]: [...(hist[materia] ?? []), ...res.questions.map((q) => q.id)] });
      // Prepare the next batch in the background so it opens instantly.
      refill({ data: { materia } }).catch((e) => console.error("Falha ao reabastecer o banco:", e));
    } catch (e: any) {
      setErr(e?.message && !/<html|<script/i.test(e.message) ? e.message : "Erro ao buscar questões. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function responder(i: number, a: number) {
    const question = qs[i];
    if (!question || resp[i] !== undefined) return;
    setResp({ ...resp, [i]: a });
    const s = stats[sessionMateria] ?? { certas: 0, total: 0 };
    setStats({ ...stats, [sessionMateria]: { certas: s.certas + (a === question.correta ? 1 : 0), total: s.total + 1 } });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 border-b pb-6 sm:grid-cols-2">
        <div className="flex items-center justify-between sm:col-span-2">
          <h2 className="text-xl">Praticar questões</h2>
          <span className="text-xs font-semibold text-muted-foreground">CESGRANRIO · PC-AP</span>
        </div>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold">Matéria</span>
          <select className={input} value={materia} onChange={(e) => setMateria(e.target.value)}>
            {MATERIAS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <Button variant="ghost" className="justify-start sm:col-span-2" aria-expanded={optionsOpen} onClick={() => setOptionsOpen(!optionsOpen)}><SlidersHorizontal />{optionsOpen ? "Ocultar ajustes" : "Assunto, dificuldade e quantidade"}</Button>
        <label hidden={!optionsOpen} className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold">Tópico (opcional)</span>
          <input className={input} placeholder="Ex: crimes contra a vida, crase..." value={topico} onChange={(e) => setTopico(e.target.value)} />
        </label>
        <label hidden={!optionsOpen} className="space-y-1">
          <span className="text-sm font-semibold">Dificuldade</span>
          <select className={input} value={dif} onChange={(e) => setDif(e.target.value)}>
            <option>fácil</option>
            <option>média</option>
            <option>difícil</option>
          </select>
        </label>
        <label hidden={!optionsOpen} className="space-y-1">
          <span className="text-sm font-semibold">Quantidade</span>
          <select className={input} value={qtd} onChange={(e) => setQtd(+e.target.value)}>
            {[3, 5, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
          <span className="text-xs text-muted-foreground">{(hist[materia] ?? []).length} questões já feitas · Bloco de {qtd} questões</span>
          <Button className={btn} onClick={gerar} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <BookOpen />}{loading ? "Preparando questões..." : qs.length ? "Novo bloco" : "Começar a estudar"}
          </Button>
        </div>
        {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
      </section>

      {loading && <p role="status" className="text-center text-muted-foreground">Preparando {qtd} questões no padrão Cesgranrio…</p>}
      {qs.length > 0 && !finished && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="font-semibold">{sessionMateria}</span>
          <span className="text-muted-foreground">Questão {current + 1} de {qs.length} · {Object.keys(resp).length} respondidas</span>
        </div>
      )}
      {finished && (
        <section className="space-y-4 border-b pb-6" aria-live="polite">
          <h2 className="flex items-center gap-2 text-xl"><CheckCircle2 className="text-success" />Bloco concluído</h2>
          <p className="text-lg font-semibold">{qs.filter((q, i) => resp[i] === q.correta).length} acertos de {qs.length} questões</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setFinished(false); setCurrent(0); }}>Revisar respostas</Button>
            <Button onClick={gerar} disabled={loading}><BookOpen />Novo bloco de {qtd}</Button>
          </div>
        </section>
      )}

      {qs.map((q, i) => {
        if (i !== current || finished) return null;
        const r = resp[i];
        return (
          <div key={i} className={card}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Questão {i + 1} · {q.topico}
            </p>
            <p className="mt-2 whitespace-pre-line font-medium">{q.enunciado}</p>
            <div className="mt-4 space-y-2">
              {q.alternativas.map((alt, a) => {
                let cls = "border bg-background hover:bg-muted";
                if (r !== undefined) {
                  if (a === q.correta) cls = "border-success bg-success text-success-foreground";
                  else if (a === r) cls = "border-destructive bg-destructive text-destructive-foreground";
                  else cls = "border opacity-60";
                }
                return (
                  <Button variant="outline" disabled={r !== undefined} key={a} onClick={() => responder(i, a)} className={`flex h-auto min-h-12 w-full items-start justify-start gap-3 whitespace-normal rounded-md px-3 py-3 text-left transition disabled:opacity-100 ${cls}`}>
                    <span className="font-bold">{"ABCDE"[a]})</span>
                    <span>{alt}</span>
                  </Button>
                );
              })}
            </div>
            {r !== undefined && (
              <div className="mt-4 rounded-md bg-muted p-3 text-sm">
                <p className="font-semibold">{r === q.correta ? "✔ Você acertou!" : `✘ Resposta correta: ${"ABCDE"[q.correta]}`}</p>
                <p className="mt-1">{q.explicacao}</p>
                <AudioExplicacao texto={`${q.enunciado} A resposta correta é a alternativa ${"ABCDE"[q.correta]}. ${q.explicacao}`} />
              </div>
            )}
            <div className="mt-5 flex items-center justify-between gap-2 border-t pt-4">
              <Button variant="ghost" onClick={() => setCurrent(current - 1)} disabled={current === 0}><ArrowLeft />Anterior</Button>
              <Button disabled={r === undefined} onClick={() => current < qs.length - 1 ? setCurrent(current + 1) : setFinished(true)}>{current < qs.length - 1 ? "Próxima" : "Ver resultado"}<ArrowRight /></Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Cronograma({ onEstudar }: { onEstudar: (materia: string, topico: string) => void }) {
  const gen = useServerFn(generateSchedule);
  const [cargo, setCargo] = useState("Agente de Polícia");
  const [horas, setHoras] = useState(3);
  const [dias, setDias] = useState(5);
  const [semanas, setSemanas] = useState(2);
  const [fracas, setFracas] = useState<string[]>([]);
  const [plano, setPlano] = useLocal<ScheduleDay[]>("pcap-plano", []);
  const [feitos, setFeitos] = useLocal<Record<string, boolean>>("pcap-feitos", {});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function gerar() {
    setLoading(true);
    setErr("");
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

  return (
    <div className="space-y-6">
      <div className={`${card} grid gap-4 sm:grid-cols-2`}>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold">Cargo</span>
          <select className={input} value={cargo} onChange={(e) => setCargo(e.target.value)}>
            {["Agente de Polícia", "Oficial de Polícia Civil", "Delegado de Polícia", "Perito Criminal", "Escrivão"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold">Horas por dia</span>
          <input type="number" min={1} max={12} className={input} value={horas} onChange={(e) => setHoras(+e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold">Dias por semana</span>
          <input type="number" min={1} max={7} className={input} value={dias} onChange={(e) => setDias(+e.target.value)} />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold">Semanas</span>
          <select className={input} value={semanas} onChange={(e) => setSemanas(+e.target.value)}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold">Matérias em que tenho mais dificuldade</span>
          <div className="flex flex-wrap gap-2">
            {MATERIAS.map((m) => {
              const on = fracas.includes(m);
              return (
                <Button
                  key={m}
                  onClick={() => setFracas(on ? fracas.filter((f) => f !== m) : [...fracas, m])}
                  className={`rounded-full border px-3 py-1 text-sm ${on ? "border-accent bg-accent text-accent-foreground" : "bg-background"}`}
                >
                  {m}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button className={btn} onClick={gerar} disabled={loading}>
            {loading ? "Montando..." : plano.length ? "Gerar novo cronograma" : "Gerar cronograma"}
          </Button>
        </div>
        {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
      </div>

      {plano.map((d, i) => (
        <section key={i} className="border-t pt-5">
          <h3 className="text-lg">{d.dia}</h3>
          <ul className="mt-3 space-y-2">
            {d.blocos.map((b, j) => {
              const k = `${i}-${j}`;
              return (
                <li key={k}>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-md bg-muted p-3 ${feitos[k] ? "opacity-50" : ""}`}>
                    <input type="checkbox" className="mt-1 accent-primary" checked={!!feitos[k]} onChange={() => setFeitos({ ...feitos, [k]: !feitos[k] })} />
                    <div className="flex-1">
                      <p className="font-semibold">{b.materia}</p>
                      <p className="text-sm text-muted-foreground">{b.topico}</p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="rounded bg-accent px-2 py-0.5 font-semibold text-accent-foreground">{b.tipo}</span>
                      <p className="mt-1 text-muted-foreground">{b.minutos} min</p>
                    </div>
                  </label>
                  <Button variant="ghost" size="sm" className="mt-1" onClick={() => onEstudar(b.materia, b.topico)}><BookOpen />Praticar este assunto<ArrowRight /></Button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Desempenho() {
  const [stats] = useLocal<Stats>("pcap-stats", {});
  const entries = Object.entries(stats);
  if (!entries.length) return <p className="text-center text-muted-foreground">Resolva algumas questões para ver seu desempenho.</p>;
  return (
    <div className="space-y-3">
      {entries.map(([m, s]) => {
        const pct = Math.round((s.certas / s.total) * 100);
        return (
          <div key={m} className={card}>
            <div className="flex justify-between">
              <span className="font-semibold">{m}</span>
              <span className="text-sm text-muted-foreground">{s.certas}/{s.total} · {pct}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className={`h-2 rounded-full ${pct >= 70 ? "bg-success" : pct >= 50 ? "bg-accent" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
