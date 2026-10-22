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
  Captions,
  Play,
  Mic,
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


const AUDIO_URL_OFICIAL = "/audio/oi-eu-sou-o-popolo.mp3";
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
    .replace(/\bPC-AP\b/g, "Polícia Civil do Amapá").replace(/\bpopolo\b/gi, "Popólo")
    .replace(/\s+/g, " ")
    .trim();
}

interface WordToken {
  id: number;
  text: string;
  start: number;
  end: number;
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

  // Perfil da voz: "oficial" (áudio real enviado), "crianca" ou "robo"
  const [perfilVoz, setPerfilVoz] = useState<"oficial" | "crianca" | "robo">(() => {
    if (typeof window === "undefined") return "oficial";
    const salvo = localStorage.getItem("popolo_perfil_voz");
    if (salvo === "robo" || salvo === "crianca" || salvo === "oficial") return salvo;
    return "oficial";
  });
  const [audioRealTocando, setAudioRealTocando] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Controle de Voz / Áudio (Web Speech API)
  const [vozAtiva, setVozAtiva] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const salvo = localStorage.getItem("popolo_voz_ativa");
    return salvo !== null ? salvo === "true" : true;
  });

  // Controle de Legenda Sincronizada (Closed Caption)
  const [legendaAtiva, setLegendaAtiva] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const salvo = localStorage.getItem("popolo_legenda_ativa");
    return salvo !== null ? salvo === "true" : true;
  });

  const [falando, setFalando] = useState(false);
  const [palavraAtivaIndex, setPalavraAtivaIndex] = useState<number | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pré-carregamento do arquivo de áudio real oficial
  useEffect(() => {
    try {
      const audio = new Audio(AUDIO_URL_OFICIAL);
      audio.preload = "auto";
    } catch (e) {
      // ignore
    }
  }, []);

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
      return `Aviso do Popólo: Você tem ${errosPendentes} erros no Caderno de Erros. Vale a pena revisar antes de dormir!`;
    }
    return DICAS_GERAIS[dicaIndex % DICAS_GERAIS.length];
  }, [falaCustomizada, modoSimulado, errosPendentes, dicaIndex]);

  // Tokeniza a fala atual em palavras com posições para sincronia precisa
  const tokensPalavras = useMemo<WordToken[]>(() => {
    const tokens: WordToken[] = [];
    const regex = /\S+/g;
    let match;
    let id = 0;
    while ((match = regex.exec(falaAtual)) !== null) {
      tokens.push({
        id: id++,
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    return tokens;
  }, [falaAtual]);

  // Limpar timer de fallback de legenda
  const limparTimerFallback = useCallback(() => {
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  const pararFala = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setAudioRealTocando(false);
    limparTimerFallback();
    setFalando(false);
    setPalavraAtivaIndex(null);
  }, [limparTimerFallback]);

  // Reproduz o arquivo de áudio real do Popólo com sincronização precisa de boca e legenda
  const reproduzirAudioOficial = useCallback((onFinished?: () => void) => {
    pararFala();
    if (typeof window === "undefined") return;

    try {
      setFalaCustomizada("Oi! Eu sou o Popólo! 🎈");
      setMood("comemorando");
      setBalaoAberto(true);
      setMinimizado(false);

      const audio = new Audio(AUDIO_URL_OFICIAL);
      audioPlayerRef.current = audio;

      audio.onplay = () => {
        setFalando(true);
        setAudioRealTocando(true);
        setPalavraAtivaIndex(0);
      };

      // Sincroniza as palavras da frase com os tempos reais do áudio de 1.82s
      audio.ontimeupdate = () => {
        const t = audio.currentTime;
        if (t < 0.40) {
          setPalavraAtivaIndex(0); // "Oi!"
        } else if (t < 0.72) {
          setPalavraAtivaIndex(1); // "Eu"
        } else if (t < 0.96) {
          setPalavraAtivaIndex(2); // "sou"
        } else if (t < 1.18) {
          setPalavraAtivaIndex(3); // "o"
        } else {
          setPalavraAtivaIndex(4); // "Popólo!"
        }
      };

      audio.onended = () => {
        setFalando(false);
        setAudioRealTocando(false);
        setPalavraAtivaIndex(null);
        if (onFinished) {
          onFinished();
        } else {
          setTimeout(() => setMood("normal"), 2000);
        }
      };

      audio.onerror = (e) => {
        console.warn("Erro ao reproduzir áudio real do Popólo:", e);
        setFalando(false);
        setAudioRealTocando(false);
        setPalavraAtivaIndex(null);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay do áudio real bloqueado pelo navegador:", err);
          setFalando(false);
          setAudioRealTocando(false);
        });
      }
    } catch (e) {
      console.warn("Falha ao iniciar áudio oficial:", e);
    }
  }, [pararFala]);

  // Iniciar animação de legenda sem som (modo leitura silenciosa sincronizada)
  const iniciarLegendaSilenciosa = useCallback(
    (tokens: WordToken[]) => {
      limparTimerFallback();
      setFalando(true);
      let idx = 0;
      setPalavraAtivaIndex(0);

      // Velocidade média de leitura: ~220ms por palavra
      fallbackIntervalRef.current = setInterval(() => {
        idx++;
        if (idx < tokens.length) {
          setPalavraAtivaIndex(idx);
        } else {
          limparTimerFallback();
          setFalando(false);
          setPalavraAtivaIndex(null);
        }
      }, 240);
    },
    [limparTimerFallback]
  );

  // Função para executar a fala e sincronizar legenda palavra por palavra
  const falarTexto = useCallback(
    (texto: string, perfilOverride?: "oficial" | "crianca" | "robo") => {
      pararFala();

      const perfil = perfilOverride || perfilVoz;
      const ehApresentacao = texto.toLowerCase().includes("sou o popólo") || texto.toLowerCase().includes("sou o popolo");

      if (perfil === "oficial" && ehApresentacao) {
        if (vozAtiva) {
          reproduzirAudioOficial();
          return;
        }
      }

      const tokens = tokensPalavras;
      if (tokens.length === 0) return;

      // Se a voz estiver desativada pelo usuário, executa a legenda visual sincronizada!
      if (!vozAtiva) {
        if (legendaAtiva) {
          iniciarLegendaSilenciosa(tokens);
        }
        return;
      }

      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        if (legendaAtiva) {
          iniciarLegendaSilenciosa(tokens);
        }
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const textoLimpo = limparTextoParaFala(texto);
        if (!textoLimpo) return;

        const utterance = new SpeechSynthesisUtterance(textoLimpo);
        utterance.lang = "pt-BR";

        const perfil = perfilOverride || perfilVoz;

        if (perfil === "oficial") {
          utterance.pitch = 1.72; // Afinada com a frequência de ~516Hz do áudio real gravado
          utterance.rate = 1.12;
        } else if (perfil === "crianca") {
          utterance.pitch = 1.68;
          utterance.rate = 1.1;
        } else {
          utterance.pitch = 1.15;
          utterance.rate = 1.05;
        }

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

        let boundaryFired = false;

        // Sincronização em tempo real de cada palavra falada (Web Speech boundary)
        utterance.onboundary = (event) => {
          if (event.name === "word") {
            boundaryFired = true;
            limparTimerFallback();
            const charIdx = event.charIndex;
            // Encontra a palavra correspondente na lista de tokens
            const matchIndex = tokens.findIndex(
              (t) => charIdx >= t.start && charIdx <= t.end + 2
            );
            if (matchIndex !== -1) {
              setPalavraAtivaIndex(matchIndex);
            }
          }
        };

        utterance.onstart = () => {
          setFalando(true);
          setPalavraAtivaIndex(0);

          // Fallback caso o navegador não emita onboundary (ex: alguns navegadores mobile)
          setTimeout(() => {
            if (!boundaryFired) {
              let fallbackIdx = 0;
              fallbackIntervalRef.current = setInterval(() => {
                fallbackIdx++;
                if (fallbackIdx < tokens.length) {
                  setPalavraAtivaIndex(fallbackIdx);
                } else {
                  limparTimerFallback();
                }
              }, 230);
            }
          }, 350);
        };

        utterance.onend = () => {
          limparTimerFallback();
          setFalando(false);
          setPalavraAtivaIndex(null);
        };

        utterance.onerror = () => {
          limparTimerFallback();
          setFalando(false);
          setPalavraAtivaIndex(null);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("Erro ao sintetizar voz do Popólo:", e);
        if (legendaAtiva) {
          iniciarLegendaSilenciosa(tokens);
        } else {
          setFalando(false);
          setPalavraAtivaIndex(null);
        }
      }
    },
    [tokensPalavras, vozAtiva, legendaAtiva, perfilVoz, pararFala, limparTimerFallback, iniciarLegendaSilenciosa]
  );

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

  // Alternar legenda sincronizada e salvar preferência
  const toggleLegenda = useCallback(() => {
    setLegendaAtiva((prev) => {
      const novo = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("popolo_legenda_ativa", String(novo));
      }
      return novo;
    });
  }, []);

  // Alternar entre voz oficial gravada, voz de criança e robô
  const alternarPerfilVoz = useCallback(() => {
    setPerfilVoz((prev) => {
      let novo: "oficial" | "crianca" | "robo";
      if (prev === "oficial") novo = "crianca";
      else if (prev === "crianca") novo = "robo";
      else novo = "oficial";

      if (typeof window !== "undefined") {
        localStorage.setItem("popolo_perfil_voz", novo);
      }
      if (novo === "oficial") {
        reproduzirAudioOficial();
      } else {
        const fraseExemplo =
          novo === "crianca"
            ? "Oba! Agora eu tô com voz de criança! Vamos estudar juntos?"
            : "Bip bop! Voz de robô ativada para o serviço!";
        falarTexto(fraseExemplo, novo);
      }
      return novo;
    });
  }, [reproduzirAudioOficial, falarTexto]);

  // Reação a sequências de acertos
  useEffect(() => {
    if (acertosSeguidos >= 3) {
      setMood("comemorando");
      const frase = `Eba! Demais! ${acertosSeguidos} acertos seguidos! Você tá arrasando nos estudos!`;
      setFalaCustomizada(frase);
      setBalaoAberto(true);
      if (!modoSimulado) {
        falarTexto(frase);
      }
      const timer = setTimeout(() => {
        setMood("normal");
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [acertosSeguidos, modoSimulado, falarTexto]);

  // Silenciar ou recolher em modo simulado
  useEffect(() => {
    if (modoSimulado) {
      pararFala();
      setMinimizado(true);
      setMood("atento");
      setBalaoAberto(false);
    }
  }, [modoSimulado, pararFala]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      pararFala();
    };
  }, [pararFala]);

  function proximaDica() {
    setFalaCustomizada(null);
    const proximoIndex = dicaIndex + 1;
    setDicaIndex(proximoIndex);
    setMood("normal");
    const proxima = DICAS_GERAIS[proximoIndex % DICAS_GERAIS.length];
    if (!modoSimulado) {
      falarTexto(proxima);
    }
  }

  function interagirComPopolo() {
    setMood("comemorando");
    setBalaoAberto(true);
    setMinimizado(false);

    // Na primeira interação ou alternada com perfil oficial, toca a voz gravada real!
    if (perfilVoz === "oficial" && (brincadeiraContador % 2 === 0 || brincadeiraContador === 0)) {
      setFalaCustomizada("Oi! Eu sou o Popólo! 🎈");
      setBrincadeiraContador((prev) => prev + 1);
      if (!modoSimulado && vozAtiva) {
        reproduzirAudioOficial();
      }
      return;
    }

    const frasesCrianca = [
      "Olha só meu distintivo de policial mirim! Ele brilha quando você acerta!",
      "Força aí! Não desiste que o distintivo da PC-AP tá te esperando!",
      "Eba! Que questão legal, vamos acertar essa juntos?",
      "Tô torcendo muito por você! Foco total nas questões!",
      "Bip bop! A bateria do Popólo tá 100% cheia pra te ajudar a passar!",
      "O Popólo tá aqui torcendo muito pela sua posse na PC-AP!",
      "Força nos estudos! Com o Popólo do seu lado, a aprovação vem mais rápido!",
    ];
    const novaFrase = frasesCrianca[brincadeiraContador % frasesCrianca.length];
    setBrincadeiraContador((prev) => prev + 1);
    setFalaCustomizada(novaFrase);

    if (!modoSimulado) {
      falarTexto(novaFrase);
    }
  }

  // Se o aluno minimizou totalmente
  if (minimizado) {
    return (
      <aside aria-label="Popólo assistente minimizado" className="fixed bottom-24 sm:bottom-20 right-5 z-50">
        <button
          type="button"
          onClick={() => {
            setMinimizado(false);
            setBalaoAberto(true);
            if (!modoSimulado) {
              falarTexto(falaAtual);
            }
          }}
          className="group relative flex items-center gap-2 rounded-full border-2 border-accent bg-card px-3 py-2 shadow-xl hover:scale-105 transition-all duration-300"
          title="Clique para chamar o Popólo"
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
            Popólo
          </span>
          <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Popólo assistente" className="fixed bottom-24 sm:bottom-20 right-5 z-50 flex flex-col items-end pointer-events-none select-none">
      {/* Balão de Fala estilo Clippy do Windows com Legenda Sincronizada */}
      {balaoAberto && (
        <div className="pointer-events-auto mb-2 max-w-[290px] sm:max-w-[340px] rounded-2xl border-2 border-accent/40 bg-card/95 backdrop-blur-md p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300 relative text-foreground">
          {/* Triângulo / Cauda do Balão apontando para o Robô */}
          <div className="absolute -bottom-2 right-8 h-3 w-3 rotate-45 border-r-2 border-b-2 border-accent/40 bg-card"></div>

          {/* Cabeçalho do Balão */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-accent/20 text-accent text-xs font-bold">
                ⭐
              </span>
              <span className="text-xs font-bold text-accent">Popólo</span>
              
              {/* Seletor de voz oficial / criança / robô */}
              <button
                type="button"
                onClick={alternarPerfilVoz}
                className={`ml-1 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border transition-colors ${
                  perfilVoz === "oficial"
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30"
                    : perfilVoz === "crianca"
                    ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/25"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                }`}
                title="Clique para alternar: Voz Real Gravada, Voz de Criança ou Robô"
              >
                {perfilVoz === "oficial" ? (
                  <>
                    <Mic className="h-2.5 w-2.5 text-amber-400" /> Voz Real
                  </>
                ) : perfilVoz === "crianca" ? (
                  <>
                    <Baby className="h-2.5 w-2.5" /> Criança
                  </>
                ) : (
                  <>
                    <Bot className="h-2.5 w-2.5" /> Robô
                  </>
                )}
              </button>

              {falando && (
                <span className="flex items-center gap-0.5 ml-1" title="Reproduzindo agora">
                  <span className="h-2 w-0.5 bg-cyan-400 animate-pulse"></span>
                  <span className="h-3 w-0.5 bg-cyan-400 animate-pulse delay-75"></span>
                  <span className="h-1.5 w-0.5 bg-cyan-400 animate-pulse delay-150"></span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Botão de Legenda Sincronizada [CC] */}
              <button
                type="button"
                onClick={toggleLegenda}
                className={`h-6 px-1.5 rounded flex items-center gap-1 text-[10px] font-black border transition-colors ${
                  legendaAtiva
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
                }`}
                title={legendaAtiva ? "Legenda ativada (clique para ocultar)" : "Legenda desativada (clique para ativar)"}
              >
                <Captions className="h-3.5 w-3.5" />
                <span>CC</span>
              </button>

              {/* Botão de Ligar/Desligar Voz */}
              <button
                type="button"
                onClick={toggleVoz}
                className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${
                  vozAtiva
                    ? "text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                title={vozAtiva ? "Voz ligada (clique para silenciar)" : "Voz desligada (clique para ativar som)"}
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
                title="Minimizar Popólo"
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

          {/* Texto com sincronização palavra por palavra (karaoke teleprompter) */}
          <div className="relative">
            <p className="text-xs leading-relaxed text-foreground font-medium">
              {tokensPalavras.map((token, index) => {
                const isActive = falando && palavraAtivaIndex === index;
                const isPast = falando && palavraAtivaIndex !== null && index < palavraAtivaIndex;

                if (isActive) {
                  return (
                    <span
                      key={token.id}
                      className="inline-block px-1 py-0.5 mx-0.5 rounded-md bg-amber-400/25 text-amber-500 dark:text-amber-300 font-extrabold shadow-sm scale-110 transition-transform duration-100 border border-amber-400/40"
                    >
                      {token.text}{" "}
                    </span>
                  );
                }

                if (isPast && legendaAtiva) {
                  return (
                    <span key={token.id} className="text-foreground/90 transition-colors">
                      {token.text}{" "}
                    </span>
                  );
                }

                return (
                  <span
                    key={token.id}
                    className={`transition-colors ${
                      falando && legendaAtiva ? "text-muted-foreground/80" : "text-foreground"
                    }`}
                  >
                    {token.text}{" "}
                  </span>
                );
              })}
            </p>

            {/* Faixa de Legenda Sincronizada em Destaque (Closed Caption) */}
            {legendaAtiva && falando && palavraAtivaIndex !== null && (
              <div className="mt-2.5 rounded-lg bg-slate-950/90 border border-amber-400/40 px-2.5 py-1.5 shadow-lg flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
                <span className="flex h-4 px-1 items-center justify-center rounded bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-wider">
                  CC
                </span>
                <span className="text-[11px] font-bold text-amber-200 truncate">
                  {tokensPalavras[palavraAtivaIndex]?.text || "..."}
                </span>
                {!vozAtiva && (
                  <span className="ml-auto text-[9px] text-muted-foreground">
                    Modo Silencioso
                  </span>
                )}
              </div>
            )}
          </div>

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

              {/* Botão para tocar a voz real gravada diretamente */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => reproduzirAudioOficial()}
                className="text-[11px] h-7 px-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-bold"
                title="Reproduzir o áudio oficial com a voz real do Popólo"
              >
                <Mic className="h-3 w-3 mr-1 text-amber-400" /> Voz Real
              </Button>

              {/* Botão para ouvir ou acompanhar legenda */}
              <Button
                variant={falando ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  if (falando) {
                    pararFala();
                  } else if (falaAtual.toLowerCase().includes("sou o popólo") || falaAtual.toLowerCase().includes("sou o popolo")) {
                    reproduzirAudioOficial();
                  } else {
                    falarTexto(falaAtual);
                  }
                }}
                className="text-[11px] h-7 px-2 text-accent hover:text-accent font-semibold"
                title={vozAtiva ? "Reproduzir fala em áudio e legenda" : "Acompanhar legenda sincronizada sem som"}
              >
                {falando ? (
                  <>
                    <Square className="h-2.5 w-2.5 mr-1 fill-current" /> Parar
                  </>
                ) : vozAtiva ? (
                  <>
                    <Volume2 className="h-3 w-3 mr-1" /> Ouvir
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1 fill-current" /> Ver legenda
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
            <span className={`h-2.5 w-2.5 rounded-full border border-background shadow-md transition-colors ${falando ? "bg-amber-400 animate-ping" : mood === "comemorando" ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"}`}></span>
            <span className="h-2.5 w-0.5 bg-slate-400"></span>
          </div>

          {/* Cabeça do Robozinho Tech */}
          <div className={`relative h-14 w-16 sm:h-16 sm:w-18 rounded-2xl border-2 ${falando ? "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]" : "border-accent/60"} bg-gradient-to-b from-slate-900 to-slate-800 p-1.5 shadow-2xl flex flex-col items-center justify-between transition-all duration-300`}>
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

          {/* Distintivo / Corpo miniatura estilo distintivo policial */}
          <div className="-mt-1 flex items-center justify-center">
            <div className={`flex items-center gap-1 rounded-full border ${falando ? "border-amber-400 bg-amber-950/90" : "border-accent bg-slate-900/90"} px-2 py-0.5 shadow-md transition-colors`}>
              <span className="text-[9px] font-black text-accent uppercase">Popólo</span>
            </div>
          </div>
        </div>

        {/* Efeito tooltip ao passar o mouse */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 right-0 bg-popover text-popover-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap border">
          {falando ? "Falando com legenda sincronizada..." : "Clique para falar com o Popólo! 🎈"}
        </div>
      </div>
    </aside>
  );
}
