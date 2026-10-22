import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { shuffleQuestion } from "./question-options";

export type BankQuestion = {
  id: string;
  materia: string;
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
  topico: string;
};

const PAUSE_MSG =
  "Os créditos de IA acabaram, e o banco não tem mais questões inéditas desta matéria para você. Tente outra matéria ou volte quando os créditos forem recarregados.";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function aiPaused(): Promise<boolean> {
  const db = await admin();
  const { data } = await db.from("ai_pause").select("paused_until").eq("id", 1).maybeSingle();
  return !!data?.paused_until && new Date(data.paused_until) > new Date();
}

async function setPause(minutes: number, reason: string) {
  const db = await admin();
  await db.from("ai_pause").upsert({ id: 1, paused_until: new Date(Date.now() + minutes * 60000).toISOString(), reason });
}

/** Generates new questions with AI and stores them in the shared bank. */
async function fillBank(materia: string, topico: string | undefined, qtd: number) {
  const { createQuestions, AiError } = await import("./ai.server");
  const db = await admin();
  const { data: recent } = await db
    .from("questions")
    .select("enunciado")
    .eq("materia", materia)
    .order("created_at", { ascending: false })
    .limit(40);
  try {
    const qs = await createQuestions({
      materia,
      topico,
      dificuldade: "nível de prova real",
      quantidade: qtd,
      evitar: (recent ?? []).map((r) => r.enunciado.slice(0, 140)),
    });
    if (qs.length) {
      await db.from("questions").upsert(
        qs.map((q) => ({
          materia,
          topico: q.topico ?? "",
          enunciado: q.enunciado,
          alternativas: q.alternativas,
          correta: q.correta,
          explicacao: q.explicacao ?? "",
        })),
        { onConflict: "materia,enunciado", ignoreDuplicates: true },
      );
    }
  } catch (e) {
    if (e instanceof AiError && (e.status === 402 || e.status === 403)) await setPause(30, e.message);
    throw e;
  }
}

function toDto(rows: any[]): BankQuestion[] {
  return rows.map((r) => shuffleQuestion({
    id: r.id,
    materia: r.materia,
    enunciado: r.enunciado,
    alternativas: r.alternativas as string[],
    correta: r.correta,
    explicacao: r.explicacao,
    topico: r.topico,
  }));
}


async function assertUserAuthorized(supabase: any, userId: string, email?: string) {
  try {
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (isAdmin) return;
  } catch {}

  const emailLower = (email ?? "").toLowerCase().trim();
  const db = await admin();

  if (emailLower) {
    try {
      const { data: authRow } = await (db as any).from("authorized_emails").select("status").ilike("email", emailLower).maybeSingle();
      if (authRow?.status === "approved") return;
      if (authRow?.status === "blocked") throw new Error("Acesso bloqueado pelo administrador.");
    } catch (e: any) {
      if (e?.message?.includes("bloqueado")) throw e;
    }
  }

  try {
    const { data: plan } = await db.from("user_plans").select("plan, premium_until").eq("user_id", userId).maybeSingle();
    if (plan?.plan === "approved") return;
    if (plan?.plan === "premium" && (!plan.premium_until || new Date(plan.premium_until).getTime() > Date.now())) return;
    if (plan?.plan === "blocked") throw new Error("Acesso bloqueado pelo administrador.");
  } catch (e: any) {
    if (e?.message?.includes("bloqueado")) throw e;
  }

  throw new Error("Acesso restrito. Seu e-mail aguarda liberação pelo administrador.");
}

/** Returns questions this student has never seen, taking from the bank first. */
export const getQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ materia: z.string().min(1), topico: z.string().optional(), quantidade: z.number().int().min(1).max(20) }))
  .handler(async ({ data, context }) => {
    await assertUserAuthorized(context.supabase, context.userId, context.claims?.email);
    const take = async (n: number) => {
      const { data: rows, error } = await context.supabase.rpc("take_questions", {
        _materia: data.materia,
        _topico: data.topico ?? "",
        _limit: n,
      });
      if (error) throw new Error("Não foi possível buscar questões.");
      return toDto(rows ?? []);
    };
    let out = await take(data.quantidade);
    // A topic filter may be too narrow; fall back to the whole subject.
    if (out.length < data.quantidade && data.topico) {
      out = out.concat(await context.supabase.rpc("take_questions", { _materia: data.materia, _topico: "", _limit: data.quantidade - out.length }).then((r) => toDto(r.data ?? [])));
    }
    if (out.length >= data.quantidade) return { questions: out, error: null as string | null };
    if (await aiPaused()) return { questions: out, error: out.length ? null : PAUSE_MSG };
    try {
      await fillBank(data.materia, data.topico, Math.min(Math.max(data.quantidade - out.length + 2, 4), 8));
    } catch (e: any) {
      return { questions: out, error: out.length ? null : e?.message ?? "Falha ao gerar questões." };
    }
    out = out.concat(await take(data.quantidade - out.length));
    return { questions: out, error: out.length ? null : "Não foi possível montar o bloco agora. Tente novamente." };
  });

/** Background top-up: keeps a few unseen questions ready for this student. One small batch per call, locked per subject. */
export const refillBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ materia: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    await assertUserAuthorized(context.supabase, context.userId, context.claims?.email);
    const { data: unseen } = await context.supabase.rpc("count_unseen", { _materia: data.materia });
    if ((unseen ?? 0) >= 8) return { ok: true, skipped: true };
    if (await aiPaused()) return { ok: false, skipped: true };
    const db = await admin();
    const now = new Date().toISOString();
    await db.from("bank_refill_locks").upsert({ materia: data.materia, locked_until: now }, { onConflict: "materia", ignoreDuplicates: true });
    const { data: lock } = await db
      .from("bank_refill_locks")
      .update({ locked_until: new Date(Date.now() + 90_000).toISOString() })
      .eq("materia", data.materia)
      .lt("locked_until", now)
      .select("materia");
    if (!lock?.length) return { ok: true, skipped: true };
    try {
      await fillBank(data.materia, undefined, 6);
      return { ok: true, skipped: false };
    } catch {
      return { ok: false, skipped: false };
    } finally {
      await db.from("bank_refill_locks").update({ locked_until: new Date().toISOString() }).eq("materia", data.materia);
    }
  });

export const getMyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("user_seen_questions").select("materia");
    const counts: Record<string, number> = {};
    for (const r of data ?? []) counts[r.materia] = (counts[r.materia] ?? 0) + 1;
    return counts;
  });

/** Reserve a complete exam atomically; never call AI or consume a partial exam. */
export const getSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ cargo: z.enum(["investigador", "delegado"]) }))
  .handler(async ({ data, context }) => {
    await assertUserAuthorized(context.supabase, context.userId, context.claims?.email);
    const { data: result, error } = await context.supabase.rpc("take_simulado", { _cargo: data.cargo });
    if (error) {
      console.error("take_simulado failed", error);
      return { questions: [] as (BankQuestion & { materia: string })[], error: "Não foi possível montar o simulado agora. Tente novamente." };
    }
    const r = (result ?? {}) as { questions?: any[]; error?: string | null };
    const questions = toDto(r.questions ?? []);
    return { questions, error: (r.error ?? null) as string | null };
  });

  