import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Loader2, Timer } from "lucide-react";
import { generateQuestions, type Question } from "@/lib/ai.functions";

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
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
}

export function Simulado() {
  const gen = useServerFn(generateQuestions);
  const [cargo, setCargo] = useState<Cargo>("investigador");
  const [fase, setFase] = useState<"inicio" | "gerando" | "prova" | "resultado">("inicio");
  const [itens, setItens] = useState<Item[]>([]);
  const [resp, setResp] = useState<Record<number, number>>({});
  const [idx, setIdx] = useState(0);
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState("");
  const [restante, setRestante] = useState(DURACAO);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const prova = PROVAS[cargo];
  const total = prova.materias.reduce((a, [, n]) => a + n, 0);

  useEffect(() => {
    if (fase !== "prova") return;
    timer.current = setInterval(() => setRestante((r) => r - 1), 1000);
    return () => clearInterval(timer.current);
  }, [fase]);
  useEffect(() => {
    if (fase === "prova" && restante <= 0) setFase("resultado");
  }, [restante, fase]);

  async function iniciar() {
    setFase("gerando");
    setErr("");
    setProg(0);
    const tarefas: { materia: string; qtd: number }[] = [];
    for (const [materia, n] of prova.materias) {
      let r = n;
      while (r > 0) { const q = Math.min(r, 4); tarefas.push({ materia, qtd: q }); r -= q; }
    }
    const resultados: Item[][] = new Array(tarefas.length);
    let feitas = 0;
    let i = 0;
    async function worker() {
      while (i < tarefas.length) {
        const k = i++;
        const t = tarefas[k]!;
        let qs: Question[] = [];
        for (let tent = 0; tent < 4 && qs.length === 0; tent++) {
          try {
            qs = await gen({ data: { materia: t.materia, dificuldade: "nível de prova real", quantidade: t.qtd, evitar: [] } });
          } catch (e) {
            console.error(`Falha ao gerar lote de "${t.materia}" (tentativa ${tent + 1}):`, e);
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
        resultados[k] = qs.map((q) => ({ ...q, materia: t.materia }));
        feitas += t.qtd;
        setProg(feitas);
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    const todos = resultados.flat();
    if (todos.length < total * 0.8) {
      setErr("Não foi possível montar o simulado completo agora. Tente novamente em instantes.");
      setFase("inicio");
      return;
    }
    setItens(todos);
    setResp({});
    setIdx(0);
    setRestante(DURACAO);
    setFase("prova");
  }

  const card = "rounded-lg border bg-card p-4 sm:p-5 shadow-sm";

  if (fase === "inicio" || fase === "gerando") {
    return (
      <div className={card}>
        <h2 className="text-xl font-semibold">Simulado da Prova Objetiva</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mesmo formato do edital PC-AP: 80 questões, 5 alternativas, 5h30 de prova, padrão Cesgranrio.
        </p>
        <div className="mt-4 flex gap-2">
          {(Object.keys(PROVAS) as Cargo[]).map((c) => (
            <Button key={c} variant={cargo === c ? "default" : "outline"} disabled={fase === "gerando"} onClick={() => setCargo(c)}>
              {PROVAS[c].nome}
            </Button>
          ))}
        </div>
        <ul className="mt-4 divide-y rounded-md border text-sm">
          {prova.materias.map(([m, n]) => (
            <li key={m} className="flex justify-between gap-3 px-3 py-2"><span>{m}</span><b>{n}</b></li>
          ))}
          <li className="flex justify-between px-3 py-2 font-semibold"><span>Total</span><span>{total}</span></li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Atenção: no concurso, nota zero em qualquer disciplina elimina o candidato.</p>
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        {fase === "gerando" ? (
          <div className="mt-4">
            <p className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Montando o simulado… {prog}/{total} questões</p>
            <div className="mt-2 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary transition-all" style={{ width: `${(prog / total) * 100}%` }} /></div>
            <p className="mt-2 text-xs text-muted-foreground">Isso pode levar alguns minutos. Não feche esta aba.</p>
          </div>
        ) : (
          <Button className="mt-4 w-full" size="lg" onClick={iniciar}>Começar simulado</Button>
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
    const zerou = porMat.filter((x) => x.certas === 0);
    return (
      <div className="space-y-4">
        <div className={card}>
          <h2 className="text-xl font-semibold">Resultado — {prova.nome}</h2>
          <p className="mt-2 text-3xl font-bold">{acertos} / {itens.length} pontos</p>
          <p className="text-sm text-muted-foreground">Tempo usado: {fmt(DURACAO - Math.max(restante, 0))}</p>
          {zerou.length > 0 && (
            <p className="mt-2 text-sm text-destructive">Você zerou {zerou.length} disciplina(s) — no concurso isso eliminaria o candidato.</p>
          )}
          <ul className="mt-4 divide-y rounded-md border text-sm">
            {porMat.map((x) => (
              <li key={x.m} className={`flex justify-between gap-3 px-3 py-2 ${x.certas === 0 ? "text-destructive" : ""}`}>
                <span>{x.m}</span><b>{x.certas}/{x.total}</b>
              </li>
            ))}
          </ul>
          <Button className="mt-4" onClick={() => setFase("inicio")}>Fazer outro simulado</Button>
        </div>
        <h3 className="font-semibold">Gabarito comentado</h3>
        {itens.map((q, i) => (
          <div key={i} className={card}>
            <p className="text-xs font-semibold uppercase text-muted-foreground">{i + 1}. {q.materia}</p>
            <p className="mt-1">{q.enunciado}</p>
            <p className="mt-2 text-sm">
              Sua resposta: <b>{resp[i] != null ? "ABCDE"[resp[i]] : "—"}</b> · Correta: <b>{"ABCDE"[q.correta]}</b>{" "}
              {resp[i] === q.correta ? "✓" : "✗"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{q.explicacao}</p>
          </div>
        ))}
      </div>
    );
  }

  const q = itens[idx]!;
  const respondidas = Object.keys(resp).length;
  return (
    <div className="space-y-4">
      <div className={`${card} flex flex-wrap items-center justify-between gap-2`}>
        <span className="flex items-center gap-2 font-mono font-semibold"><Timer className="size-4" /> {fmt(Math.max(restante, 0))}</span>
        <span className="text-sm">{respondidas}/{itens.length} respondidas</span>
        <Button size="sm" variant="outline" onClick={() => { if (confirm("Entregar o simulado agora?")) setFase("resultado"); }}>
          Entregar prova
        </Button>
      </div>
      <div className={card}>
        <p className="text-xs font-semibold uppercase text-muted-foreground">Questão {idx + 1} de {itens.length} · {q.materia}</p>
        <p className="mt-2 text-lg">{q.enunciado}</p>
        <div className="mt-4 space-y-2">
          {q.alternativas.map((a, k) => (
            <button
              key={k}
              onClick={() => setResp({ ...resp, [idx]: k })}
              className={`w-full rounded-md border px-3 py-3 text-left transition ${resp[idx] === k ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              <b>{"ABCDE"[k]})</b> {a}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-between">
          <Button variant="ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Anterior</Button>
          {idx < itens.length - 1 ? (
            <Button onClick={() => setIdx(idx + 1)}>Próxima</Button>
          ) : (
            <Button onClick={() => { if (confirm("Entregar o simulado?")) setFase("resultado"); }}>Entregar</Button>
          )}
        </div>
      </div>
      <div className={card}>
        <p className="mb-2 text-sm font-semibold">Cartão-resposta</p>
        <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
          {itens.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded border py-1 text-xs ${i === idx ? "ring-2 ring-primary" : ""} ${resp[i] != null ? "bg-primary text-primary-foreground" : "bg-background"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
