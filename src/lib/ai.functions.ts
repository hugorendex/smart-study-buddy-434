import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ask(instructions: string, prompt: string): Promise<string> {
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText } = await import("ai");
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("Chave de IA não configurada.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: instructions,
    messages: [{ role: "user", content: prompt }],
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    return await result.text;
  } catch (e: any) {
    const status = e?.statusCode ?? e?.status;
    if (status === 429) throw new Error("Muitas solicitações. Aguarde um pouco e tente de novo.");
    if (status === 402) throw new Error("Créditos de IA esgotados.");
    throw new Error(e?.message ?? "Falha ao gerar conteúdo.");
  }
}

function parseJson(text: string) {
  const m = text.match(/[\[{][\s\S]*[\]}]/);
  if (!m) throw new Error("Resposta inválida da IA.");
  return JSON.parse(m[0]);
}

export type Question = {
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
  topico: string;
};

export const generateQuestions = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      materia: z.string(),
      topico: z.string().optional(),
      dificuldade: z.string(),
      quantidade: z.number(),
      evitar: z.array(z.string()),
    }),
  )
  .handler(async ({ data }) => {
    const qtd = Math.min(Math.max(data.quantidade, 1), 10);
    const text = await ask(
      "Você é um elaborador de questões de concursos públicos no estilo das bancas FGV e Cebraspe, especialista no edital da Polícia Civil do Amapá (PC-AP). Responda APENAS com JSON válido.",
      `Crie ${qtd} questões INÉDITAS de múltipla escolha (5 alternativas, A a E) de "${data.materia}"${
        data.topico ? `, tópico "${data.topico}"` : ""
      }, dificuldade ${data.dificuldade}, para o concurso da Polícia Civil do Amapá.
Varie os subtópicos. NÃO repita nem parafraseie nenhuma destas questões já feitas pelo aluno:
${data.evitar.slice(-60).map((e) => `- ${e}`).join("\n") || "(nenhuma)"}

Formato: um array JSON: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"explicação didática citando a lei/regra","topico":"subtópico"}]. "correta" é o índice 0-4. Não inclua letras no texto das alternativas.`,
    );
    const arr = parseJson(text) as Question[];
    return arr
      .filter((q) => q?.enunciado && Array.isArray(q.alternativas) && q.alternativas.length >= 4)
      .slice(0, qtd);
  });

export type ScheduleDay = { dia: string; blocos: { materia: string; topico: string; minutos: number; tipo: string }[] };

export const generateSchedule = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      cargo: z.string(),
      horasDia: z.number(),
      diasSemana: z.number(),
      semanas: z.number(),
      fracas: z.array(z.string()),
      materias: z.array(z.string()),
    }),
  )
  .handler(async ({ data }) => {
    const text = await ask(
      "Você é um coach de concursos policiais experiente. Responda APENAS com JSON válido.",
      `Monte um cronograma de estudos de ${Math.min(data.semanas, 4)} semana(s) para o cargo de ${data.cargo} da Polícia Civil do Amapá.
Matérias: ${data.materias.join(", ")}.
${data.horasDia}h por dia, ${data.diasSemana} dias por semana. Matérias em que o aluno tem dificuldade (dar mais peso): ${data.fracas.join(", ") || "nenhuma"}.
Inclua revisões e blocos de resolução de questões, alterne matérias, use tópicos reais do edital.
Formato: array JSON de dias: [{"dia":"Semana 1 - Segunda","blocos":[{"materia":"...","topico":"...","minutos":60,"tipo":"Teoria|Questões|Revisão"}]}]`,
    );
    return parseJson(text) as ScheduleDay[];
  });
