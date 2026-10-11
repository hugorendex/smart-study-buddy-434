import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Question = {
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
  topico: string;
};

export const generateExplanationAudio = createServerFn({ method: "POST" })
  .inputValidator(z.object({ texto: z.string().max(2000) }))
  .handler(async ({ data }) => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("Chave de IA não configurada.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-tts-preview",
        contents: [{ role: "user", parts: [{ text: `Explique de forma clara e didática, como um professor de concursos: ${data.texto}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
        },
        stream_format: "audio",
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Muitas solicitações. Aguarde um pouco e tente de novo.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados.");
      throw new Error("Falha ao gerar o áudio.");
    }
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { audio: btoa(bin), mime: res.headers.get("content-type") ?? "audio/wav" };
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
    const { ask, parseJson } = await import("./ai.server");
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
