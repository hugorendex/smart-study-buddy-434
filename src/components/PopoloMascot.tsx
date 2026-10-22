import { useState, useEffect, useRef, useCallback } from "react";
import { safeStorage } from "@/lib/safe-storage";
import { Shield, Volume2, VolumeX } from "lucide-react";

export type PopoloMood = "normal" | "feliz" | "pensativo" | "atento" | "dormindo" | "comemorando";

export type StatsData = Record<string, { certas: number; total: number }>;

export type PopoloProps = {
  materiaAtual?: string;
  acertosSeguidos?: number;
  totalAcertos?: number;
  errosPendentes?: number;
  modoSimulado?: boolean;
  stats?: StatsData;
  dataProva?: string;
  cargoDesejado?: string;
  ofensiva?: { dias: number };
  estudosHoje?: { resolvidas: number; certas: number };
  onEstudarMateria?: (materia: string) => void;
  onAbrirErros?: () => void;
};

const AUDIO_URL_OFICIAL = "/audio/oi-eu-sou-o-popolo.mp3";

const DICAS_TATICA_CONCURSO = [
  "Dica de prova: comece lendo o comando final da questão antes do texto longo. Assim você já lê procurando a resposta!",
  "A banca Cesgranrio adora casos práticos! Fique muito atento aos detalhes das alternativas para não cair em pegadinhas.",
  "Direito Penal: preste atenção na diferença entre dolo eventual e culpa consciente. Isso despenca em carreiras policiais!",
  "Direito Constitucional: não deixe de revisar o artigo quinto da Constituição. Direitos e garantias fundamentais caem em quase todas as provas!",
  "Português: cuidado com palavras absolutas como sempre, nunca e jamais nas alternativas. Quase sempre tornam o item incorreto!",
  "Raciocínio Lógico: monte diagramas ou tabelas em vez de tentar resolver tudo de cabeça. Poupa tempo e evita erros bobos!",
  "Direito Administrativo: lembre-se do mnemônico LIMPE: Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência!",
  "História e Geografia do Amapá: revise os marcos da Fortaleza de São José de Macapá e a transição do Território Federal!",
  "Estratégia de simulado: controle seu tempo em cerca de três minutos por questão para não se enrolar no final da prova!",
  "Técnica de eliminação: corte primeiro as duas alternativas com erros óbvios. Suas chances de acertar sobem para cinquenta por cento!",
];

function limparTextoParaFala(texto: string): string {
  return texto
    .replace(/[🤖⭐🔥★^💡🎯✓✕""]/g, "")
    .replace(/\bPC-AP\b/g, "Polícia Civil do Amapá")
    .replace(/\bpopolo\b/gi, "Popólo")
    .replace(/\s+/g, " ")
    .trim();
}

export function PopoloMascot({
  materiaAtual,
  acertosSeguidos = 0,
  totalAcertos = 0,
  errosPendentes = 0,
  modoSimulado = false,
  stats = {},
  dataProva,
  cargoDesejado,
  ofensiva,
  estudosHoje,
  onEstudarMateria,
  onAbrirErros,
}: PopoloProps) {
  const [mood, setMood] = useState<PopoloMood>("normal");
  const [falando, setFalando] = useState(false);
  const [piscando, setPiscando] = useState(false);
  const [interacaoIndex, setInteracaoIndex] = useState(0);
  const [vozesDisponiveis, setVozesDisponiveis] = useState<SpeechSynthesisVoice[]>([]);

  // Carrega e atualiza vozes do sistema (especialmente no Chrome/Edge/Safari)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const carregarVozes = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVozesDisponiveis(v);
    };
    carregarVozes();
    window.speechSynthesis.onvoiceschanged = carregarVozes;
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Controle de Mudo / Som (persistido no localStorage)
  const [somAtivo, setSomAtivo] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const salvo = safeStorage.getItem("popolo_som_ativo");
    return salvo !== "false";
  });

  // Cronômetro de tempo de estudo contínuo da sessão (em segundos)
  const [segundosEstudo, setSegundosEstudo] = useState(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streakAnteriorRef = useRef(acertosSeguidos);

  // Pré-carregamento do áudio oficial
  useEffect(() => {
    try {
      const audio = new Audio(AUDIO_URL_OFICIAL);
      audio.preload = "auto";
    } catch (e) {
      // ignore
    }
  }, []);

  // Piscar de olhos periódico
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setPiscando(true);
      setTimeout(() => setPiscando(false), 160);
    }, 4200);
    return () => clearInterval(blinkInterval);
  }, []);

  // Parar qualquer áudio ou síntese ativa
  const pararFala = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setFalando(false);
  }, []);

  // Reproduz o áudio real original do Popólo ("Oi! Eu sou o Popólo!")
  const reproduzirAudioOficial = useCallback((onFinished?: () => void) => {
    pararFala();
    if (typeof window === "undefined" || !somAtivo) return;

    try {
      setMood("comemorando");
      const audio = new Audio(AUDIO_URL_OFICIAL);
      audioPlayerRef.current = audio;

      audio.onplay = () => {
        setFalando(true);
      };

      audio.onended = () => {
        setFalando(false);
        setMood("normal");
        if (onFinished) onFinished();
      };

      audio.onerror = () => {
        setFalando(false);
        setMood("normal");
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setFalando(false);
          setMood("normal");
        });
      }
    } catch (e) {
      setFalando(false);
      setMood("normal");
    }
  }, [pararFala, somAtivo]);

  // Sintetiza frases com a voz afinada no perfil sonoro exato do Popólo
  const falarTexto = useCallback(
    (texto: string, animacaoMood: PopoloMood = "feliz") => {
      pararFala();
      if (typeof window === "undefined" || !somAtivo) return;

      const textoLimpo = limparTextoParaFala(texto);
      if (!textoLimpo) return;

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(textoLimpo);
        utterance.lang = "pt-BR";
        // Afinação no timbre exato do áudio gravado do Popólo
        utterance.pitch = 1.72;
        utterance.rate = 1.12;

        const vozes = vozesDisponiveis.length > 0 ? vozesDisponiveis : window.speechSynthesis.getVoices();
        const vozPt = vozes.find(
          (v) =>
            v.lang.startsWith("pt") &&
            (v.name.toLowerCase().includes("maria") ||
              v.name.toLowerCase().includes("luciana") ||
              v.name.toLowerCase().includes("brazil") ||
              v.name.toLowerCase().includes("pt-br"))
        ) || vozes.find((v) => v.lang.startsWith("pt"));

        if (vozPt) {
          utterance.voice = vozPt;
        }

        utterance.onstart = () => {
          setFalando(true);
          setMood(animacaoMood);
        };

        utterance.onend = () => {
          setFalando(false);
          setMood("normal");
        };

        utterance.onerror = () => {
          setFalando(false);
          setMood("normal");
        };

        window.speechSynthesis.speak(utterance);
      }
    },
    [pararFala, somAtivo]
  );

  // Monitor de tempo de estudo contínuo para indicar pausa após 1 hora (3600 segundos)
  useEffect(() => {
    const timer = setInterval(() => {
      setSegundosEstudo((prev) => {
        const novo = prev + 1;
        // Ao atingir exatamente 1 hora (3600 segundos)
        if (novo === 3600) {
          if (!modoSimulado && somAtivo) {
            falarTexto(
              "Atenção, policial! Você já está estudando há uma hora sem parar! Hora de levantar, beber uma água bem gelada, esticar o corpo e respirar cinco minutinhos. Seu cérebro precisa dessa pausa para fixar tudo na memória!",
              "atento"
            );
          }
        }
        return novo;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [modoSimulado, somAtivo, falarTexto]);

  // Reação em voz alta quando o aluno atinge sequências de acertos (Streak)
  useEffect(() => {
    if (modoSimulado) return;

    if (acertosSeguidos >= 3 && acertosSeguidos !== streakAnteriorRef.current) {
      if (acertosSeguidos === 3) {
        falarTexto("Muito bom, policial! Três acertos seguidos! Mantenha esse foco!", "comemorando");
      } else if (acertosSeguidos === 5) {
        falarTexto("Incrível! Cinco questões certas seguidas! Você está dominando a matéria!", "comemorando");
      } else if (acertosSeguidos === 10) {
        falarTexto("Espetacular! Dez acertos seguidos! O distintivo da Polícia Civil já é seu!", "comemorando");
      }
    }
    streakAnteriorRef.current = acertosSeguidos;
  }, [acertosSeguidos, modoSimulado, falarTexto]);

  // Diagnóstico das matérias que o aluno mais precisa focar
  const gerarDicaMateria = useCallback(() => {
    const entries = Object.entries(stats).filter(([, s]) => s.total >= 2);

    if (entries.length > 0) {
      // Ordena por menor aproveitamento
      entries.sort((a, b) => a[1].certas / a[1].total - b[1].certas / b[1].total);
      const [piorMateria, s] = entries[0];
      const taxa = Math.round((s.certas / s.total) * 100);

      if (taxa < 65) {
        return `Policial, analisei seu histórico e sua taxa de acertos em ${piorMateria} está em ${taxa} por cento. Recomendo focar nela hoje para garantir esses pontos preciosos na prova!`;
      }
    }

    if (errosPendentes > 0) {
      return `Você tem ${errosPendentes} questões aguardando revisão no seu Caderno de Erros. O grande segredo da aprovação é não repetir os mesmos erros!`;
    }

    return "Para maximizar sua nota de corte, concentre seus estudos em Língua Portuguesa e Direito Penal, que são as matérias com mais peso e questões na prova!";
  }, [stats, errosPendentes]);

  // Gera incentivo de ofensiva e desempenho diário
  const gerarDicaOfensivaEHoje = useCallback(() => {
    const dias = ofensiva?.dias ?? 0;
    const resolvidas = estudosHoje?.resolvidas ?? 0;
    const certas = estudosHoje?.certas ?? 0;
    const taxa = resolvidas > 0 ? Math.round((certas / resolvidas) * 100) : 0;

    if (resolvidas > 0) {
      return `Hoje você já resolveu ${resolvidas} questões com ${taxa}% de acertos! E sua ofensiva está em ${dias} ${dias === 1 ? "dia" : "dias"} seguidos. Continue com foco total!`;
    }
    if (dias > 0) {
      return `Você está com ${dias} ${dias === 1 ? "dia" : "dias"} de ofensiva ativa! Resolva seu primeiro bloco de questões de hoje para não deixar a chama apagar!`;
    }
    return "Comece sua ofensiva hoje mesmo! Pratique um bloco rápido de questões e construa sua rotina de aprovação.";
  }, [ofensiva?.dias, estudosHoje?.resolvidas, estudosHoje?.certas]);

  // Contagem regressiva de dias para a prova do concurso
  const gerarDicaContagemDias = useCallback(() => {
    if (!dataProva) {
      return "Defina a data da sua prova no seu perfil para eu acompanhar sua contagem regressiva diária até o dia da posse!";
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const alvo = new Date(dataProva + "T00:00:00");
    const diffDias = Math.ceil((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias > 1) {
      return `Faltam apenas ${diffDias} dias para a sua prova do concurso! Mantenha a constância diária, cada questão resolvida hoje conta muito!`;
    } else if (diffDias === 1) {
      return "Atenção: sua prova é amanhã! Revise apenas tópicos leves, descanse a mente e durma cedo para render ao máximo!";
    } else if (diffDias === 0) {
      return "Hoje é o grande dia da sua prova! Mantenha a calma, confie em todo o seu estudo e vá buscar o seu distintivo!";
    } else {
      return "Sua prova já passou! Continue resolvendo questões para manter o ritmo afiado para os próximos editais!";
    }
  }, [dataProva]);

  // Alternância de falas ao clicar no mascote
  const interagirComPopolo = () => {
    // Se estiver falando e clicar nele, interrompe imediatamente
    if (falando) {
      pararFala();
      return;
    }

    const passo = interacaoIndex % 6;
    setInteracaoIndex((prev) => prev + 1);

    // 1º passo: toca a voz real oficial gravada ("Oi! Eu sou o Popólo!")
    if (passo === 0) {
      reproduzirAudioOficial();
      return;
    }

    // 2º passo: ofensiva diária e ritmo de estudos de hoje
    if (passo === 1) {
      falarTexto(gerarDicaOfensivaEHoje(), "comemorando");
      return;
    }

    // 3º passo: foco nas matérias de menor desempenho / erros pendentes
    if (passo === 2) {
      falarTexto(gerarDicaMateria(), "pensativo");
      return;
    }

    // 4º passo: contagem de dias para a prova do concurso
    if (passo === 3) {
      falarTexto(gerarDicaContagemDias(), "atento");
      return;
    }

    // 5º passo: dica tática de banca examinadora e concurso policial
    if (passo === 4) {
      const dicaAleatoria = DICAS_TATICA_CONCURSO[Math.floor(Math.random() * DICAS_TATICA_CONCURSO.length)];
      falarTexto(dicaAleatoria, "feliz");
      return;
    }

    // 6º passo: incentivo de foco e hidratação
    if (passo === 5) {
      const minutos = Math.floor(segundosEstudo / 60);
      if (minutos >= 30) {
        falarTexto(`Você já está focado há ${minutos} minutos! Lembre-se de beber água e manter a postura firme. A aprovação é construída bloco a bloco!`, "feliz");
      } else {
        falarTexto("Lembre-se: concurseiro aprovado estuda com foco e constância. Resolva mais um bloco de questões agora para subir sua média!", "feliz");
      }
      return;
    }
  };

  const alternarMudo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSomAtivo((prev) => {
      const novo = !prev;
      if (typeof window !== "undefined") {
        safeStorage.setItem("popolo_som_ativo", String(novo));
      }
      if (!novo) {
        pararFala();
      }
      return novo;
    });
  };

  return (
    <aside
      aria-label="Popólo assistente de estudos"
      className="fixed bottom-24 sm:bottom-20 right-5 z-50 flex flex-col items-end select-none"
    >
      {/* Indicador visual sonoro discreto flutuante apenas quando ele está falando */}
      {falando && (
        <div className="mb-1 flex items-center gap-1 rounded-full bg-amber-500/90 text-slate-950 px-2 py-0.5 text-[10px] font-black shadow-lg animate-bounce">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-ping"></span>
          <span>Falando...</span>
          <div className="flex gap-0.5 items-center ml-0.5">
            <span className="h-2 w-0.5 bg-slate-950 animate-pulse"></span>
            <span className="h-3 w-0.5 bg-slate-950 animate-pulse delay-75"></span>
            <span className="h-1.5 w-0.5 bg-slate-950 animate-pulse delay-150"></span>
          </div>
        </div>
      )}

      {/* Personagem Popólo (Robô Tech com Distintivo Policial) */}
      <div
        className="relative group cursor-pointer"
        onClick={interagirComPopolo}
        title={falando ? "Clique para silenciar o Popólo" : "Clique para ouvir o Popólo falar! 🎈"}
      >
        <div
          className={`relative flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
            mood === "comemorando" ? "animate-bounce" : ""
          } ${falando ? "scale-105" : ""}`}
        >
          {/* Antena com LED tecnológico */}
          <div className="flex flex-col items-center -mb-1">
            <span
              className={`h-2.5 w-2.5 rounded-full border border-background shadow-md transition-colors ${
                falando
                  ? "bg-amber-400 animate-ping"
                  : mood === "comemorando"
                  ? "bg-amber-400 animate-ping"
                  : "bg-emerald-400 animate-pulse"
              }`}
            ></span>
            <span className="h-2.5 w-0.5 bg-slate-400"></span>
          </div>

          {/* Cabeça do Robozinho Tech */}
          <div
            className={`relative h-14 w-16 sm:h-16 sm:w-18 rounded-2xl border-2 ${
              falando
                ? "border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.6)]"
                : "border-accent/60"
            } bg-gradient-to-b from-slate-900 to-slate-800 p-1.5 shadow-2xl flex flex-col items-center justify-between transition-all duration-300`}
          >
            {/* Orelhas / Headset dourado estilo distintivo */}
            <span className="absolute -left-1.5 top-3 h-4 w-2 rounded-l-md bg-accent border border-accent/80"></span>
            <span className="absolute -right-1.5 top-3 h-4 w-2 rounded-r-md bg-accent border border-accent/80"></span>

            {/* Tela dos Olhos Expressivos (Visor digital) */}
            <div className="w-full h-8 rounded-lg bg-black/90 border border-slate-700 flex items-center justify-center gap-2 px-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent pointer-events-none animate-pulse"></div>

              {/* Olho Esquerdo */}
              <div
                className={`transition-all duration-150 flex items-center justify-center ${
                  piscando
                    ? "h-0.5 w-3 bg-cyan-400"
                    : mood === "feliz" || mood === "comemorando"
                    ? "h-3.5 w-3.5 text-cyan-300 text-xs font-black"
                    : "h-3.5 w-3.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                }`}
              >
                {mood === "comemorando" && "★"}
                {mood === "feliz" && "^"}
              </div>

              {/* Olho Direito */}
              <div
                className={`transition-all duration-150 flex items-center justify-center ${
                  piscando
                    ? "h-0.5 w-3 bg-cyan-400"
                    : mood === "feliz" || mood === "comemorando"
                    ? "h-3.5 w-3.5 text-cyan-300 text-xs font-black"
                    : "h-3.5 w-3.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                }`}
              >
                {mood === "comemorando" && "★"}
                {mood === "feliz" && "^"}
              </div>
            </div>

            {/* Painel inferior da boca e identificação policial */}
            <div className="w-full flex items-center justify-between px-1">
              <span className="text-[9px] font-black text-accent tracking-tighter">PC-AP</span>
              {/* Boca animada sincronizada com o áudio */}
              {falando ? (
                <div className="flex gap-0.5 items-center">
                  <span className="h-2 w-1 rounded-full bg-amber-400 animate-bounce"></span>
                  <span className="h-3 w-1 rounded-full bg-amber-400 animate-bounce delay-75"></span>
                  <span className="h-1.5 w-1 rounded-full bg-amber-400 animate-bounce delay-150"></span>
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

          {/* Distintivo / Corpo com nome Popólo e botão discreto de Mudo */}
          <div className="-mt-1 flex items-center justify-center gap-1">
            <div
              className={`flex items-center gap-1 rounded-full border ${
                falando
                  ? "border-amber-400 bg-amber-950/90 text-amber-300"
                  : "border-accent bg-slate-900/90 text-accent"
              } px-2 py-0.5 shadow-md transition-colors`}
            >
              <span className="text-[9px] font-black uppercase">Popólo</span>
            </div>

            {/* Botão miniatura de Mudo para ambientes de estudo / biblioteca */}
            <button
              type="button"
              onClick={alternarMudo}
              className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors shadow ${
                somAtivo
                  ? "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                  : "bg-red-950/80 border-red-500/60 text-red-400 hover:text-red-300"
              }`}
              title={somAtivo ? "Som ativado (clique para mutar)" : "Popólo mutado (clique para ativar som)"}
            >
              {somAtivo ? (
                <Volume2 className="h-2.5 w-2.5" />
              ) : (
                <VolumeX className="h-2.5 w-2.5" />
              )}
            </button>
          </div>
        </div>

        {/* Micro-tooltip ao passar o mouse */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 right-0 bg-popover/90 text-popover-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap border backdrop-blur-sm">
          {falando ? "Clique para parar a fala" : "Toque no Popólo para ouvir! 🎈"}
        </div>
      </div>
    </aside>
  );
}
