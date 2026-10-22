import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  X,
  Volume2,
  VolumeX,
  Eye,
  ChevronRight,
  Smile,
  Shield,
  Zap,
  Coffee,
  RotateCcw,
  Minimize2,
  Maximize2,
} from "lucide-react";

export type PopoloMood = "normal" | "feliz" | "pensativo" | "atento" | "dormindo" | "comemorando";

export type PopoloProps = {
  materiaAtual?: string;
  acertosSeguidos?: number;
  totalAcertos?: number;
  errosPendentes?: number;
  modoSimulado?: boolean;
  onEstudarMateria?: (materia: string) => void;
  onAbrirErros?: () => void;
};

const DICAS_GERAIS = [
  "A banca Cesgranrio adora casos práticos! Leia o comando com atenção para não cair em pegadinhas.",
  "Direito Penal: preste atenção na diferença entre dolo eventual e culpa consciente!",
  "Constitucional: direitos e garantias fundamentais despencam na prova da PC-AP. Não pule o art. 5º!",
  "Português: crase antes de palavra feminina é regra, mas cuidado com as exceções e expressões adverbiais.",
  "Dica de ouro: quando estiver em dúvida entre duas, procure palavras muito extremas como 'sempre', 'nunca' e 'jamais'.",
  "Raciocínio Lógico: monte tabelas-verdade ou diagramas de Venn, não tente fazer tudo de cabeça!",
  "Direito Administrativo: decore os princípios do LIMPE e os atos administrativos (requisitos e atributos)!",
  "História e Geografia do Amapá: estude bem a criação do Território Federal e a Batalha da Fortaleza de São José!",
  "Já bebeu água hoje? O cérebro hidratado processa informações 14% mais rápido!",
  "Descanso faz parte do estudo: após 50 minutos de foco, 5 minutos de pausa ajudam a consolidar a memória.",
];

export function PopoloMascot({
  materiaAtual,
  acertosSeguidos = 0,
  totalAcertos = 0,
  errosPendentes = 0,
  modoSimulado = false,
  onEstudarMateria,
  onAbrirErros,
}: PopoloProps) {
  const [minimizado, setMinimizado] = useState(false);
  const [balaoAberto, setBalaoAberto] = useState(true);
  const [mood, setMood] = useState<PopoloMood>("normal");
  const [dicaIndex, setDicaIndex] = useState(0);
  const [falaCustomizada, setFalaCustomizada] = useState<string | null>(null);
  const [piscando, setPiscando] = useState(false);
  const [brincadeiraContador, setBrincadeiraContador] = useState(0);

  // Piscar de olhos periódico estilo Clippy
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setPiscando(true);
      setTimeout(() => setPiscando(false), 200);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Reação a sequências de acertos
  useEffect(() => {
    if (acertosSeguidos >= 3) {
      setMood("comemorando");
      setFalaCustomizada(`Sensacional! 🔥 ${acertosSeguidos} acertos seguidos! Você tá pronto pra ser aprovado!`);
      setBalaoAberto(true);
      const timer = setTimeout(() => {
        setMood("normal");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [acertosSeguidos]);

  // Silenciar ou recolher em modo simulado
  useEffect(() => {
    if (modoSimulado) {
      setMinimizado(true);
      setMood("atento");
      setBalaoAberto(false);
    }
  }, [modoSimulado]);

  const falaAtual = useMemo(() => {
    if (falaCustomizada) return falaCustomizada;
    if (modoSimulado) return "Estou em Modo Foco acompanhando seu Simulado. Força na prova!";
    if (errosPendentes > 5) {
      return `Aviso do Popolo: Você tem ${errosPendentes} erros no Caderno de Erros. Vale a pena revisar antes de dormir!`;
    }
    return DICAS_GERAIS[dicaIndex % DICAS_GERAIS.length];
  }, [falaCustomizada, modoSimulado, errosPendentes, dicaIndex]);

  function proximaDica() {
    setFalaCustomizada(null);
    setDicaIndex((prev) => prev + 1);
    setMood("normal");
  }

  function interagirComPopolo() {
    const frasesEngracadas = [
      "Bip bop! 🤖 Pronto para o plantão policial!",
      "Aprovado em 1º lugar no concurso de robôs!",
      "Sabia que meu distintivo brilha no escuro? ⭐",
      "Quem estuda, a Cesgranrio não derruba!",
      "Ei, parei de piscar por 1 segundo pra você ler a questão!",
      "Vem cá, já fez seu bloco de questões de hoje?",
      "Popolo na escuta: foco total no gabarito!",
    ];
    const novaFrase = frasesEngracadas[brincadeiraContador % frasesEngracadas.length];
    setBrincadeiraContador((prev) => prev + 1);
    setFalaCustomizada(novaFrase);
    setMood("feliz");
    setBalaoAberto(true);
    setMinimizado(false);
  }

  // Se o aluno minimizou totalmente
  if (minimizado) {
    return (
      <aside aria-label="Popolo assistente minimizado" className="fixed bottom-20 sm:bottom-6 right-4 z-40">
        <button
          type="button"
          onClick={() => {
            setMinimizado(false);
            setBalaoAberto(true);
          }}
          className="group relative flex items-center gap-2 rounded-full border-2 border-accent bg-card px-3 py-2 shadow-xl hover:scale-105 transition-all duration-300"
          title="Clique para chamar o Popolo"
        >
          {/* Avatar mini */}
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-inner">
            <span className="text-sm">🤖</span>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
            </span>
          </div>
          <span className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">
            Popolo
          </span>
          <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Popolo assistente" className="fixed bottom-20 sm:bottom-6 right-4 z-40 flex flex-col items-end pointer-events-none select-none">
      {/* Balão de Fala estilo Clippy do Windows */}
      {balaoAberto && (
        <div className="pointer-events-auto mb-2 max-w-[280px] sm:max-w-[320px] rounded-2xl border-2 border-accent/40 bg-card/95 backdrop-blur-md p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300 relative text-foreground">
          {/* Triângulo / Cauda do Balão apontando para o Robô */}
          <div className="absolute -bottom-2 right-8 h-3 w-3 rotate-45 border-r-2 border-b-2 border-accent/40 bg-card"></div>

          {/* Cabeçalho do Balão */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-accent/20 text-accent text-xs font-bold">
                ⭐
              </span>
              <span className="text-xs font-bold text-accent">Dica do Popolo</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMinimizado(true)}
                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Minimizar Popolo"
              >
                <Minimize2 className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setBalaoAberto(false)}
                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Fechar fala"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Texto da fala */}
          <p className="text-xs leading-relaxed text-foreground font-medium">
            "{falaAtual}"
          </p>

          {/* Ações do Balão */}
          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={proximaDica}
              className="text-[11px] h-7 px-2 font-semibold text-muted-foreground hover:text-foreground"
            >
              Outra dica <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
            {errosPendentes > 0 && onAbrirErros && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAbrirErros();
                  setBalaoAberto(false);
                }}
                className="text-[11px] h-7 px-2 border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold"
              >
                Revisar {errosPendentes} erros
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Personagem Popolo (Clippy Robô com Distintivo) */}
      <div className="pointer-events-auto relative group cursor-pointer" onClick={interagirComPopolo}>
        {/* Anel de destaque / distintivo */}
        <div className={`relative flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-110 ${mood === "comemorando" ? "animate-bounce" : ""}`}>
          
          {/* Antena com LED piscante */}
          <div className="flex flex-col items-center -mb-1">
            <span className={`h-2.5 w-2.5 rounded-full border border-background shadow-md transition-colors ${mood === "comemorando" ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"}`}></span>
            <span className="h-2.5 w-0.5 bg-slate-400"></span>
          </div>

          {/* Cabeça do Robozinho Tech */}
          <div className="relative h-14 w-16 sm:h-16 sm:w-18 rounded-2xl border-2 border-accent/60 bg-gradient-to-b from-slate-900 to-slate-800 p-1.5 shadow-2xl flex flex-col items-center justify-between">
            {/* Orelhas / Headset dourado estilo distintivo */}
            <span className="absolute -left-1.5 top-3 h-4 w-2 rounded-l-md bg-accent border border-accent/80"></span>
            <span className="absolute -right-1.5 top-3 h-4 w-2 rounded-r-md bg-accent border border-accent/80"></span>

            {/* Tela dos Olhos Expressivos (Visor digital) */}
            <div className="w-full h-8 rounded-lg bg-black/90 border border-slate-700 flex items-center justify-center gap-2 px-1 relative overflow-hidden">
              {/* Scanline decorativo */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent pointer-events-none animate-pulse"></div>

              {/* Olho Esquerdo */}
              <div className={`transition-all duration-150 flex items-center justify-center ${piscando ? "h-0.5 w-3 bg-cyan-400" : mood === "feliz" || mood === "comemorando" ? "h-3.5 w-3.5 text-cyan-300 text-xs font-black" : "h-3.5 w-3.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"}`}>
                {mood === "comemorando" && "★"}
                {mood === "feliz" && "^"}
              </div>

              {/* Olho Direito */}
              <div className={`transition-all duration-150 flex items-center justify-center ${piscando ? "h-0.5 w-3 bg-cyan-400" : mood === "feliz" || mood === "comemorando" ? "h-3.5 w-3.5 text-cyan-300 text-xs font-black" : "h-3.5 w-3.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"}`}>
                {mood === "comemorando" && "★"}
                {mood === "feliz" && "^"}
              </div>
            </div>

            {/* Boca / Painel inferior */}
            <div className="w-full flex items-center justify-between px-1">
              <span className="text-[9px] font-black text-accent tracking-tighter">PC-AP</span>
              {/* Sorriso led */}
              <div className="flex gap-0.5">
                <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
                <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
                <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
              </div>
              <Shield className="h-2.5 w-2.5 text-accent" />
            </div>
          </div>

          {/* Distintivo / Corpo miniatura estilo distintivo policial */}
          <div className="-mt-1 flex items-center justify-center">
            <div className="flex items-center gap-1 rounded-full border border-accent bg-slate-900/90 px-2 py-0.5 shadow-md">
              <span className="text-[9px] font-black text-accent uppercase">Popolo</span>
            </div>
          </div>
        </div>

        {/* Efeito tooltip ao passar o mouse */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap border">
          Clique no Popolo! 🤖
        </div>
      </div>
    </aside>
  );
}
