import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { safeStorage } from "@/lib/safe-storage";
import { Award, Brain, Download, Pause, Play, RotateCcw, StickyNote, Timer, Trash2, Trophy } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

type Stats = Record<string, { certas: number; total: number }>;

function useLS<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    const raw = safeStorage.getItem(key);
    if (raw) try { setV(JSON.parse(raw)); } catch {}
  }, [key]);
  const set = (n: T) => { setV(n); safeStorage.setItem(key, JSON.stringify(n)); };
  return [v, set] as const;
}

export function calcularXP(stats: Stats, horasFoco: number, ofensiva: number) {
  let certas = 0, total = 0;
  for (const s of Object.values(stats)) { certas += s.certas; total += s.total; }
  const xp = certas * 10 + (total - certas) * 2 + Math.floor(horasFoco * 30) + ofensiva * 15;
  const nivel = Math.floor(Math.sqrt(xp / 50)) + 1;
  const base = 50 * (nivel - 1) ** 2, prox = 50 * nivel ** 2;
  return { xp, nivel, progresso: (xp - base) / (prox - base), certas, total };
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Award; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Icon className="h-5 w-5 text-accent" /> {title}</h2>
      {children}
    </section>
  );
}

function Pomodoro({ onFoco }: { onFoco: (min: number) => void }) {
  const [modo, setModo] = useState<"foco" | "pausa">("foco");
  const [seg, setSeg] = useState(25 * 60);
  const [rodando, setRodando] = useState(false);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (!rodando) return;
    ref.current = window.setInterval(() => setSeg((s) => s - 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [rodando]);
  useEffect(() => {
    if (seg > 0) return;
    if (modo === "foco") { onFoco(25); setModo("pausa"); setSeg(5 * 60); }
    else { setModo("foco"); setSeg(25 * 60); }
    try { new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play(); } catch {}
  }, [seg, modo, onFoco]);
  const mm = String(Math.floor(seg / 60)).padStart(2, "0"), ss = String(seg % 60).padStart(2, "0");
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{modo === "foco" ? "Foco" : "Pausa"}</p>
      <p className="my-2 font-mono text-5xl font-bold tabular-nums">{mm}:{ss}</p>
      <div className="flex justify-center gap-2">
        <Button onClick={() => setRodando(!rodando)}>{rodando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{rodando ? "Pausar" : "Iniciar"}</Button>
        <Button variant="outline" onClick={() => { setRodando(false); setModo("foco"); setSeg(25 * 60); }}><RotateCcw className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

type Flash = { id: string; frente: string; verso: string; prox: number; intervalo: number };
const FLASH_INICIAIS: Omit<Flash, "id" | "prox" | "intervalo">[] = [
  { frente: "Prazo do inquérito policial (réu preso) — CPP", verso: "10 dias (art. 10 do CPP)." },
  { frente: "Prazo do inquérito policial (réu solto) — CPP", verso: "30 dias, prorrogável." },
  { frente: "Prisão temporária em crime hediondo", verso: "30 dias, prorrogável por igual período." },
  { frente: "Crase antes de palavra masculina?", verso: "Em regra, não ocorre." },
  { frente: "Tentativa — pena", verso: "Reduzida de 1/3 a 2/3 (art. 14, parágrafo único, CP)." },
];

function Flashcards() {
  const [cards, setCards] = useLS<Flash[]>("pcap-flashcards", []);
  const [virado, setVirado] = useState(false);
  const [frente, setFrente] = useState(""); const [verso, setVerso] = useState("");
  useEffect(() => {
    if (!safeStorage.getItem("pcap-flashcards"))
      setCards(FLASH_INICIAIS.map((c, i) => ({ ...c, id: String(i), prox: 0, intervalo: 0 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const agora = Date.now();
  const pendentes = cards.filter((c) => c.prox <= agora);
  const atual = pendentes[0];
  const avaliar = (fator: number) => {
    if (!atual) return;
    const intervalo = fator === 0 ? 0 : Math.max(1, Math.round((atual.intervalo || 1) * fator));
    setCards(cards.map((c) => c.id === atual.id ? { ...c, intervalo, prox: fator === 0 ? agora + 60_000 : agora + intervalo * 86_400_000 } : c));
    setVirado(false);
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{pendentes.length} para revisar hoje · {cards.length} no total</p>
      {atual ? (
        <button type="button" onClick={() => setVirado(!virado)} className="min-h-28 w-full rounded-xl border-2 border-dashed bg-muted/40 p-4 text-left transition hover:bg-muted">
          <p className="font-semibold">{atual.frente}</p>
          {virado ? <p className="mt-3 text-accent-foreground/90 border-t pt-3">{atual.verso}</p> : <p className="mt-3 text-xs text-muted-foreground">Toque para ver a resposta</p>}
        </button>
      ) : <p className="rounded-xl bg-muted/40 p-4 text-sm">Tudo revisado por hoje! 🎉</p>}
      {atual && virado && (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={() => avaliar(0)}>Difícil</Button>
          <Button variant="outline" onClick={() => avaliar(2)}>Médio</Button>
          <Button onClick={() => avaliar(4)}>Fácil</Button>
        </div>
      )}
      <form className="space-y-2 border-t pt-3" onSubmit={(e) => { e.preventDefault(); if (!frente.trim() || !verso.trim()) return; setCards([...cards, { id: crypto.randomUUID(), frente, verso, prox: 0, intervalo: 0 }]); setFrente(""); setVerso(""); }}>
        <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Pergunta (frente)" value={frente} onChange={(e) => setFrente(e.target.value)} />
        <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Resposta (verso)" value={verso} onChange={(e) => setVerso(e.target.value)} />
        <Button type="submit" size="sm" variant="secondary">Adicionar cartão</Button>
      </form>
    </div>
  );
}

type Nota = { id: string; materia: string; texto: string; fav: boolean };
function Anotacoes({ materias }: { materias: string[] }) {
  const [notas, setNotas] = useLS<Nota[]>("pcap-notas", []);
  const [texto, setTexto] = useState(""); const [materia, setMateria] = useState(materias[0] ?? "Geral");
  const [busca, setBusca] = useState("");
  const lista = notas.filter((n) => (n.texto + n.materia).toLowerCase().includes(busca.toLowerCase())).sort((a, b) => Number(b.fav) - Number(a.fav));
  return (
    <div className="space-y-3">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (!texto.trim()) return; setNotas([{ id: crypto.randomUUID(), materia, texto, fav: false }, ...notas]); setTexto(""); }}>
        <select className="rounded-md border bg-background px-2 py-2 text-sm" value={materia} onChange={(e) => setMateria(e.target.value)}>
          {["Geral", ...materias].map((m) => <option key={m}>{m}</option>)}
        </select>
        <input className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" placeholder="Escreva um resumo ou macete..." value={texto} onChange={(e) => setTexto(e.target.value)} />
        <Button type="submit" size="sm">Salvar</Button>
      </form>
      <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="🔎 Buscar nas anotações" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {lista.map((n) => (
          <li key={n.id} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <button type="button" aria-label="Favoritar" onClick={() => setNotas(notas.map((x) => x.id === n.id ? { ...x, fav: !x.fav } : x))}>{n.fav ? "⭐" : "☆"}</button>
            <div className="flex-1"><p className="text-[11px] font-semibold text-muted-foreground">{n.materia}</p><p>{n.texto}</p></div>
            <button type="button" aria-label="Excluir" onClick={() => setNotas(notas.filter((x) => x.id !== n.id))}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
          </li>
        ))}
        {!lista.length && <li className="text-sm text-muted-foreground">Nenhuma anotação ainda.</li>}
      </ul>
    </div>
  );
}

function InstalarApp() {
  const [evento, setEvento] = useState<(Event & { prompt: () => void }) | null>(null);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvento(e as Event & { prompt: () => void }); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  return (
    <div className="space-y-2 text-sm">
      {evento ? <Button onClick={() => evento.prompt()}><Download className="h-4 w-4" /> Instalar no celular</Button> : null}
      <p className="text-muted-foreground">No celular: abra o menu do navegador e toque em <b>“Adicionar à tela inicial”</b> (iPhone: botão Compartilhar → Adicionar à Tela de Início).</p>
    </div>
  );
}

export function Turbo({ stats, ofensiva }: { stats: Stats; ofensiva: number }) {
  const [minutosFoco, setMinutosFoco] = useLS<number>("pcap-foco-min", 0);
  const horas = minutosFoco / 60;
  const { xp, nivel, progresso, certas, total } = calcularXP(stats, horas, ofensiva);
  const radar = useMemo(() => Object.entries(stats).filter(([, s]) => s.total > 0).map(([m, s]) => ({ materia: m.length > 14 ? m.slice(0, 13) + "…" : m, nome: m, pct: Math.round((s.certas / s.total) * 100) })), [stats]);
  const fraca = [...radar].sort((a, b) => a.pct - b.pct)[0];
  const melhorMateria = Object.entries(stats).some(([, s]) => s.total >= 10 && s.certas / s.total >= 0.9);
  const conquistas = [
    { nome: "Primeiro Passo", desc: "Responder 1 questão", ok: total >= 1 },
    { nome: "Maratonista", desc: "100 questões resolvidas", ok: total >= 100 },
    { nome: "Sniper", desc: "90% de acertos em uma matéria (10+)", ok: melhorMateria },
    { nome: "Semana Imbatível", desc: "7 dias seguidos", ok: ofensiva >= 7 },
    { nome: "Foco Total", desc: "10 horas de Pomodoro", ok: horas >= 10 },
    { nome: "Centurião", desc: "100 acertos", ok: certas >= 100 },
  ];
  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-md">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs uppercase opacity-80">Seu nível</p><p className="text-4xl font-black">Nível {nivel}</p></div>
          <Trophy className="h-12 w-12 text-accent" />
        </div>
        <div className="mt-3 h-2 rounded-full bg-primary-foreground/20"><div className="h-2 rounded-full bg-accent" style={{ width: `${Math.min(100, progresso * 100)}%` }} /></div>
        <p className="mt-2 text-xs opacity-80">{xp} XP · {horas.toFixed(1)}h líquidas de foco · {ofensiva} dias de ofensiva</p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Pomodoro" icon={Timer}><Pomodoro onFoco={(m) => setMinutosFoco(minutosFoco + m)} /></Card>
        <Card title="Conquistas" icon={Award}>
          <ul className="grid grid-cols-2 gap-2">
            {conquistas.map((c) => (
              <li key={c.nome} className={`rounded-lg border p-2 text-xs ${c.ok ? "border-accent bg-accent/10" : "opacity-50"}`}>
                <p className="font-bold">{c.ok ? "🏅" : "🔒"} {c.nome}</p><p className="text-muted-foreground">{c.desc}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Flashcards" icon={Brain}><Flashcards /></Card>
        <Card title="Forças e fraquezas" icon={Trophy}>
          {radar.length >= 3 ? (
            <div className="h-56"><ResponsiveContainer><RadarChart data={radar}><PolarGrid /><PolarAngleAxis dataKey="materia" tick={{ fontSize: 10 }} /><Radar dataKey="pct" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.4} /></RadarChart></ResponsiveContainer></div>
          ) : <p className="text-sm text-muted-foreground">Resolva questões de pelo menos 3 matérias para ver o gráfico.</p>}
          {fraca && <p className="mt-2 text-sm">Ponto fraco: <b>{fraca.nome}</b> ({fraca.pct}% de acertos)</p>}
        </Card>
      </div>
      <Card title="Anotações e favoritos" icon={StickyNote}><Anotacoes materias={Object.keys(stats)} /></Card>
      <Card title="Instalar como aplicativo" icon={Download}><InstalarApp /></Card>
    </div>
  );
}
