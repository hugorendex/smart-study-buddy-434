import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  X,
  Volume2,
  VolumeX,
  ChevronRight,
  Shield,
  Minimize2,
  Maximize2,
  Square,
  Baby,
  Bot,
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
  "Dica de ouro: quando estiver em dúvida entre duas, procure palavras muito extremas como sempre, nunca e jamais.",
  "Raciocínio Lógico: monte tabelas-verdade ou diagramas de Venn, não tente fazer tudo de cabeça!",
  "Direito Administrativo: decore os princípios do LIMPE e os atos administrativos, seus requisitos e atributos!",
  "História e Geografia do Amapá: estude bem a criação do Território Federal e a Batalha da Fortaleza de São José!",
  "Já bebeu água hoje? O cérebro hidratado processa informações 14% mais rápido!",
  "Descanso faz parte do estudo: após 50 minutos de foco, 5 minutos de pausa ajudam a consolidar a memória.",
];

function limparTextoParaFala(texto: string): string {
  return texto
    .replace(/[🤖⭐🔥★^💡🎯✓✕""]/g, "")
    .replace(/\bPC-AP\b/g, "Polícia Civil do Amapá")
    .replace(/\s+/g, " ")
    .trim();
}

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

  // Perfil da voz: "crianca" (padrão) ou "robo"
  const [perfilVoz, setPerfilVoz] = useState<"crianca" | "robo">(() => {
    if (typeof window === "undefined") return "crianca";
    const salvo = localStorage.getItem("popolo_perfil_voz");
    return salvo === "robo" ? "robo" : "crianca";
  });

  // Controle de Voz / Áudio (Web Speech API)
  const [vozAtiva, setVozAtiva] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const salvo = localStorage.getItem("popolo_voz_ativa");
    return salvo !== null ? salvo === "true" : true;
  });
  const [falando, setFalando] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Piscar de olhos periódico estilo Clippy
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setPiscando(true);
      setTimeout(() => setPiscando(false), 200);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  const falaAtual = useMemo(() => {
    if (falaCustomizada) return falaCustomizada;
    if (modoSimulado) return "Estou em Modo Foco acompanhando seu Simulado. Força na prova!";
    if (errosPendentes > 5) {
      return `Aviso do Popolo: Você tem ${errosPendentes} erros no Caderno de Erros. Vale a pena revisar antes de dormir!`;
    }
    return DICAS_GERAIS[dicaIndex % DICAS_GERAIS.length];
  }, [falaCustomizada, modoSimulado, errosPendentes, dicaIndex]);

  // Função para executar a fala com voz de criança (pitch elevado, timbre jovem e alegre)
  const falarTexto = useCallback(
    (texto: string, perfilOverride?: "crianca" | "robo") => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      try {
        window.speechSynthesis.cancel();

        const textoLimpo = limparTextoParaFala(texto);
        if (!textoLimpo) return;

        const utterance = new SpeechSynthesisUtterance(textoLimpo);
        utterance.lang = "pt-BR";

        const perfil = perfilOverride || perfilVoz;

        if (perfil === "crianca") {
          // Ajustes acústicos para tom infantil: pitch alto (1.68) e fala ágil (1.1)
          utterance.pitch = 1.68;
          utterance.rate = 1.1;
        } else {
          // Tom robótico clássico
          utterance.pitch = 1.15;
          utterance.rate = 1.05;
        }

        // Tentar obter voz em português com timbre mais suave/feminino que soa perfeitamente infantil com pitch alto
        const voices = window.speechSynthesis.getVoices();
        const vozInfantilPt =
          voices.find(
            (v) =>
              v.lang.toLowerCase().includes("pt") &&
              (v.name.toLowerCase().includes("francisca") ||
                v.name.toLowerCase().includes("maria") ||
                v.name.toLowerCase().includes("luciana") ||
                v.name.toLowerCase().includes("vitória") ||
                v.name.toLowerCase().includes("vitoria") ||
                v.name.toLowerCase().includes("leticia") ||
                v.name.toLowerCase().includes("google português"))
          ) ||
          voices.find((v) => v.lang.toLowerCase() === "pt-br") ||
          voices.find((v) => v.lang.toLowerCase().startsWith("pt"));

        if (vozInfantilPt) {
          utterance.voice = vozInfantilPt;
        }

        utterance.onstart = () => setFalando(true);
        utterance.onend = () => setFalando(false);
        utterance.onerror = () => setFalando(false);

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Erro ao sintetizar voz do Popolo:", e);
        setFalando(false);
      }
    },
    [perfilVoz]
  );

  const pararFala = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setFalando(false);
  }, []);

  // Alternar voz e salvar preferência
  const toggleVoz = useCallback(() => {
    setVozAtiva((prev) => {
      const novo = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("popolo_voz_ativa", String(novo));
        if (!novo) {
          pararFala();
        }
      }
      return novo;
    });
  }, [pararFala]);

  // Alternar entre voz de criança e robô
  const alternarPerfilVoz = useCallback(() => {
    setPerfilVoz((prev) => {
      const novo = prev === "crianca" ? "robo" : "crianca";
      if (typeof window !== "undefined") {
        localStorage.setItem("popolo_perfil_voz", novo);
      }
      // Falar exemplo para demonstrar a mudança
      const fraseExemplo =
        novo === "crianca"
          ? "Oba! Agora eu tô com voz de criança! Vamos estudar juntos?"
          : "Bip bop! Voz de robô ativada para o serviço!";
      falarTexto(fraseExemplo, novo);
      return novo;
    });
  }, [falarTexto]);

  // Reação a sequências de acertos
  useEffect(() => {
    if (acertosSeguidos >= 3) {
      setMood("comemorando");
      const frase = `Eba! Demais! ${acertosSeguidos} acertos seguidos! Você tá arrasando nos estudos!`;
      setFalaCustomizada(frase);
      setBalaoAberto(true);
      if (vozAtiva && !modoSimulado) {
        falarTexto(frase);
      }
      const timer = setTimeout(() => {
        setMood("normal");
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [acertosSeguidos, vozAtiva, modoSimulado, falarTexto]);

  // Silenciar ou recolher em modo simulado
  useEffect(() => {
    if (modoSimulado) {
      pararFala();
      setMinimizado(true);
      setMood("atento");
      setBalaoAberto(false);
    }
  }, [modoSimulado, pararFala]);

  function proximaDica() {
    setFalaCustomizada(null);
    const proximoIndex = dicaIndex + 1;
    setDicaIndex(proximoIndex);
    setMood("normal");
    const proxima = DICAS_GERAIS[proximoIndex % DICAS_GERAIS.length];
    if (vozAtiva && !modoSimulado) {
      falarTexto(proxima);
    }
  }

  function interagirComPopolo() {
    const frasesCrianca = [
      "Oi! Eu sou o Popolo! Sabia que quem estuda todo dia passa na prova rapidinho?",
      "Olha só meu distintivo de policial mirim! Ele brilha quando você acerta!",
      "Força aí! Não desiste que o distintivo da PC-AP tá te esperando!",
      "Eba! Que questão legal, vamos acertar essa juntos?",
      "Tô torcendo muito por você! Foco total nas questões!",
      "Bip bop! Minha bateria tá 100% cheia pra te ajudar a passar!",
    ];
    const novaFrase = frasesCrianca[brincadeiraContador % frasesCrianca.length];
    setBrincadeiraContador((prev) => prev + 1);
    setFalaCustomizada(novaFrase);
    setMood("feliz");
    setBalaoAberto(true);
    setMinimizado(false);

    if (vozAtiva && !modoSimulado) {
      falarTexto(novaFrase);
    }
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
            if (vozAtiva && !modoSimulado) {
              falarTexto(falaAtual);
            }
          }}
          className="group relative flex items-center gap-2 rounded-full border-2 border-accent bg-card px-3 py-2 shadow-xl hover:scale-105 transition-all duration-300"
          title="Clique para chamar o Popolo"
        >
          {/* Avatar mini */}
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-inner">
            <span className="text-sm">🧒</span>
            {falando && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            )}
            {!falando && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
              </span>
            )}
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
              <span className="text-xs font-bold text-accent">Popolo</span>
              
              {/* Seletor de voz infantil */}
              <button
                type="button"
                onClick={alternarPerfilVoz}
                className={`ml-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border transition-colors ${
                  perfilVoz === "crianca"
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-500 hover:bg-amber-500/25"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                }`}
                title="Clique para alternar entre Voz de Criança e Voz de Robô"
              >
                {perfilVoz === "crianca" ? (
                  <>
                    <Baby className="h-2.5 w-2.5" /> Voz Criança
                  </>
                ) : (
                  <>
                    <Bot className="h-2.5 w-2.5" /> Voz Robô
                  </>
                )}
              </button>

              {falando && (
                <span className="flex items-center gap-0.5 ml-1">
                  <span className="h-2 w-0.5 bg-cyan-400 animate-pulse"></span>
                  <span className="h-3 w-0.5 bg-cyan-400 animate-pulse delay-75"></span>
                  <span className="h-1.5 w-0.5 bg-cyan-400 animate-pulse delay-150"></span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Botão de Ligar/Desligar Voz */}
              <button
                type="button"
                onClick={toggleVoz}
                className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                  vozAtiva
                    ? "text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={vozAtiva ? "Voz ativada (clique para silenciar)" : "Voz desligada (clique para ativar som)"}
              >
                {vozAtiva ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  pararFala();
                  setMinimizado(true);
                }}
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Minimizar Popolo"
              >
                <Minimize2 className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  pararFala();
                  setBalaoAberto(false);
                }}
                className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
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
          <div className="mt-3 pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={proximaDica}
                className="text-[11px] h-7 px-2 font-semibold text-muted-foreground hover:text-foreground"
              >
                Outra dica <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>

              {/* Botão para ouvir a fala atual */}
              <Button
                variant={falando ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  if (falando) {
                    pararFala();
                  } else {
                    falarTexto(falaAtual);
                  }
                }}
                className="text-[11px] h-7 px-2 text-accent hover:text-accent font-semibold"
                title="Reproduzir fala em áudio de criança"
              >
                {falando ? (
                  <>
                    <Square className="h-2.5 w-2.5 mr-1 fill-current" /> Parar
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3 w-3 mr-1" /> Ouvir voz
                  </>
                )}
              </Button>
            </div>

            {errosPendentes > 0 && onAbrirErros && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  pararFala();
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
        <div className={`relative flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-110 ${mood === "comemorando" ? "animate-bounce" : ""} ${falando ? "scale-105" : ""}`}>
          
          {/* Antena com LED piscante */}
          <div className="flex flex-col items-center -mb-1">
            <span className={`h-2.5 w-2.5 rounded-full border border-background shadow-md transition-colors ${falando ? "bg-cyan-400 animate-ping" : mood === "comemorando" ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"}`}></span>
            <span className="h-2.5 w-0.5 bg-slate-400"></span>
          </div>

          {/* Cabeça do Robozinho Tech */}
          <div className={`relative h-14 w-16 sm:h-16 sm:w-18 rounded-2xl border-2 ${falando ? "border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]" : "border-accent/60"} bg-gradient-to-b from-slate-900 to-slate-800 p-1.5 shadow-2xl flex flex-col items-center justify-between transition-all duration-300`}>
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
              {/* Boca animada quando falando */}
              {falando ? (
                <div className="flex gap-0.5 items-center">
                  <span className="h-2 w-1 rounded-full bg-cyan-300 animate-bounce"></span>
                  <span className="h-3 w-1 rounded-full bg-cyan-300 animate-bounce delay-75"></span>
                  <span className="h-1.5 w-1 rounded-full bg-cyan-300 animate-bounce delay-150"></span>
                </div>
              ) : (
                <div className="flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
                  <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
                  <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
                </div>
              )}
              <Shield className="h-2.5 w-2.5 text-accent" />
            </div>
          </div>

          {/* Distintivo / Corpo miniatura estilo distintivo policial */}
          <div className="-mt-1 flex items-center justify-center">
            <div className={`flex items-center gap-1 rounded-full border ${falando ? "border-cyan-400 bg-cyan-950/90" : "border-accent bg-slate-900/90"} px-2 py-0.5 shadow-md transition-colors`}>
              <span className="text-[9px] font-black text-accent uppercase">Popolo</span>
            </div>
          </div>
        </div>

        {/* Efeito tooltip ao passar o mouse */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap border">
          {falando ? "Falando com voz de criança..." : "Clique para ouvir o Popolo! 🎈"}
        </div>
      </div>
    </aside>
  );
}
