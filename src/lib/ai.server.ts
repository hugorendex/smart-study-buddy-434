// Server-only AI helpers shared by question and schedule generation.

export class AiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export async function ask(instructions: string, prompt: string): Promise<string> {
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText } = await import("ai");
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("Chave de IA não configurada.", 401);
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
    const status = e?.statusCode ?? e?.status ?? e?.lastError?.statusCode;
    if (status === 429) throw new AiError("Muitas solicitações. Aguarde um pouco e tente de novo.", 429);
    if (status === 402) throw new AiError("Os créditos de IA acabaram. Novas questões voltam a ser criadas quando os créditos forem recarregados.", 402);
    if (status === 403) throw new AiError("A IA está bloqueada no momento para este projeto.", 403);
    throw new AiError("Falha ao gerar conteúdo.", status);
  }
}

export function parseJson(text: string) {
  const m = text.match(/[\[{][\s\S]*[\]}]/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {
      // possibly truncated — salvage below
    }
  }
  const start = text.indexOf("[");
  const lastClose = text.lastIndexOf("}");
  if (start === -1 || lastClose <= start) throw new AiError("Resposta inválida da IA.");
  try {
    return JSON.parse(text.slice(start, lastClose + 1) + "]");
  } catch {
    throw new AiError("Resposta inválida da IA.");
  }
}

export type GenQuestion = {
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
  topico: string;
};

export async function createQuestions(opts: {
  materia: string;
  topico?: string;
  dificuldade: string;
  quantidade: number;
  evitar: string[];
}): Promise<GenQuestion[]> {
  const qtd = Math.min(Math.max(opts.quantidade, 1), 8);
  const text = await ask(
    `Você é um elaborador sênior de questões da banca FUNDAÇÃO CESGRANRIO, especialista em concursos da carreira policial (PC-AP, PC-RJ, PC-ES, PF, PRF). Responda APENAS com JSON válido, sem markdown.

Estilo Cesgranrio que você DEVE seguir:
- Enunciados objetivos, frequentemente com situações-problema curtas do cotidiano policial.
- Alternativas longas e parecidas entre si, com pegadinhas por troca de uma palavra (ex.: "poderá" vs "deverá", "sempre" vs "excepcionalmente").
- Cobrança de lei seca e jurisprudência, com alternativas que misturam artigos/caputs próximos.
- Em Português: interpretação de texto, crase, concordância e regência no padrão Cesgranrio.
- Nunca use "todas as alternativas" nem "nenhuma das alternativas".`,
    `Crie ${qtd} questões INÉDITAS de múltipla escolha (5 alternativas, A a E) de "${opts.materia}"${
      opts.topico ? `, tópico "${opts.topico}"` : ""
    }, dificuldade ${opts.dificuldade}, para o concurso da Polícia Civil do Amapá, no padrão Cesgranrio.
Varie os subtópicos. NÃO repita nem parafraseie nenhuma destas questões já existentes:
${opts.evitar.slice(-40).map((e) => `- ${e}`).join("\n") || "(nenhuma)"}

Seja conciso: enunciados de até 3 linhas, alternativas de até 2 linhas, explicação de no máximo 2 frases citando a lei/regra.
Formato: um array JSON: [{"enunciado":"...","alternativas":["...","...","...","...","..."],"correta":0,"explicacao":"...","topico":"subtópico"}]. "correta" é o índice 0-4. Não inclua letras no texto das alternativas.`,
  );
  const arr = parseJson(text) as GenQuestion[];
  return (Array.isArray(arr) ? arr : [])
    .filter(
      (q) =>
        q?.enunciado &&
        Array.isArray(q.alternativas) &&
        q.alternativas.length >= 4 &&
        Number.isInteger(q.correta) &&
        q.correta >= 0 &&
        q.correta < q.alternativas.length,
    )
    .slice(0, qtd);
}
