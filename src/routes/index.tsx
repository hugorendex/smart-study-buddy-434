import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  generateQuestions,
  generateSchedule,
  type Question,
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
];

type Stats = Record<string, { certas: number; total: number }>;

function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw) setV(JSON.parse(raw));
  }, [key]);
  const set = (n: T) => {
    setV(n);
    localStorage.setItem(key, JSON.stringify(n));
  };
  return [v, set] as const;
}

function Index() {
  const [tab, setTab] = useState<"questoes" | "cronograma" | "desempenho">("questoes");
  return (
    <div className="min-h-screen">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 pb-8 pt-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">Polícia Civil do Amapá</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Aprova PC-AP</h1>
          <p className="mt-2 max-w-lg opacity-80">Questões inéditas geradas por IA, sem repetição, e um cronograma feito para você.</p>
          <nav className="mt-6 flex gap-2 overflow-x-auto">
            {(
              [
                ["questoes", "Questões"],
                ["cronograma", "Cronograma"],
                ["desempenho", "Desempenho"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab === k ? "bg-accent text-accent-foreground" : "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                }`}
              >
                {l}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {tab === "questoes" && <Questoes />}
        {tab === "cronograma" && <Cronograma />}
        {tab === "desempenho" && <Desempenho />}
      </main>
    </div>
  );
}

const card = "rounded-xl border bg-card p-5 shadow-sm";
const input = "w-full rounded-md border bg-background px-3 py-2";
const btn =
  "rounded-md bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";

function Questoes() {
  const gen = useServerFn(generateQuestions);
  const [materia, setMateria] = useState(MATERIAS[0]);
  const [topico, setTopico] = useState("");
  const [dif, setDif] = useState("média");
  const [qtd, setQtd] = useState(5);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [qs, setQs] = useState<Question[]>([]);
  const [resp, setResp] = useState<Record<number, number>>({});
  const [hist, setHist] = useLocal<Record<string, string[]>>("pcap-hist", {});
  const [stats, setStats] = useLocal<Stats>("pcap-stats", {});

  async function gerar() {
    setLoading(true);
    setErr("");
    try {
      const res = await gen({
        data: { materia, topico: topico || undefined, dificuldade: dif, quantidade: qtd, evitar: hist[materia] ?? [] },
      });
      const seen = new Set((hist[materia] ?? []).map((s) => s.toLowerCase()));
      const novas = res.filter((q) => !seen.has(q.enunciado.slice(0, 140).toLowerCase()));
      setQs(novas);
      setResp({});
      setHist({ ...hist, [materia]: [...(hist[materia] ?? []), ...novas.map((q) => q.enunciado.slice(0, 140))] });
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao gerar questões.");
    } finally {
      setLoading(false);
    }
  }

  function responder(i: number, a: number) {
    if (resp[i] !== undefined) return;
    setResp({ ...resp, [i]: a });
    const s = stats[materia] ?? { certas: 0, total: 0 };
    setStats({ ...stats, [materia]: { certas: s.certas + (a === qs[i].correta ? 1 : 0), total: s.total + 1 } });
  }

  return (
    <div className="space-y-6">
      <div className={`${card} grid gap-4 sm:grid-cols-2`}>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold">Matéria</span>
          <select className={input} value={materia} onChange={(e) => setMateria(e.target.value)}>
            {MATERIAS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold">Tópico (opcional)</span>
          <input className={input} placeholder="Ex: crimes contra a vida, crase..." value={topico} onChange={(e) => setTopico(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold">Dificuldade</span>
          <select className={input} value={dif} onChange={(e) => setDif(e.target.value)}>
            <option>fácil</option>
            <option>média</option>
            <option>difícil</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold">Quantidade</span>
          <select className={input} value={qtd} onChange={(e) => setQtd(+e.target.value)}>
            {[3, 5, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between gap-3 sm:col-span-2">
          <span className="text-xs text-muted-foreground">{(hist[materia] ?? []).length} questões já feitas nesta matéria — nenhuma se repetirá.</span>
          <button className={btn} onClick={gerar} disabled={loading}>
            {loading ? "Gerando..." : "Gerar questões"}
          </button>
        </div>
        {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
      </div>

      {loading && <p className="text-center text-muted-foreground">A IA está elaborando questões inéditas… isso pode levar alguns segundos.</p>}

      {qs.map((q, i) => {
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
                  <button key={a} onClick={() => responder(i, a)} className={`flex w-full gap-3 rounded-md px-3 py-2 text-left transition ${cls}`}>
                    <span className="font-bold">{"ABCDE"[a]})</span>
                    <span>{alt}</span>
                  </button>
                );
              })}
            </div>
            {r !== undefined && (
              <div className="mt-4 rounded-md bg-muted p-3 text-sm">
                <p className="font-semibold">{r === q.correta ? "✔ Você acertou!" : `✘ Resposta correta: ${"ABCDE"[q.correta]}`}</p>
                <p className="mt-1">{q.explicacao}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Cronograma() {
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
                <button
                  key={m}
                  onClick={() => setFracas(on ? fracas.filter((f) => f !== m) : [...fracas, m])}
                  className={`rounded-full border px-3 py-1 text-sm ${on ? "border-accent bg-accent text-accent-foreground" : "bg-background"}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <button className={btn} onClick={gerar} disabled={loading}>
            {loading ? "Montando..." : plano.length ? "Gerar novo cronograma" : "Gerar cronograma"}
          </button>
        </div>
        {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
      </div>

      {plano.map((d, i) => (
        <div key={i} className={card}>
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
                </li>
              );
            })}
          </ul>
        </div>
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
