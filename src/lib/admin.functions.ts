import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito ao administrador");
}

export type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  plan: string;
  trial_ends_at: string | null;
  premium_until: string | null;
  sub_status: string | null;
  questoes_respondidas: number;
};

export type AdminOverview = {
  total: number;
  ativos7dias: number;
  emTrial: number;
  premium: number;
  pagantes: number;
  free: number;
  receitaTotal: number;
  receitaMes: number;
  receitaErro: string | null;
  usuarios: AdminUser[];
};

async function calcularReceita(env: "sandbox" | "live") {
  try {
    const { createStripeClient } = await import("@/lib/stripe.server");
    const stripe = createStripeClient(env);
    let total = 0, mes = 0;
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    let starting_after: string | undefined;
    for (let i = 0; i < 10; i++) {
      const page = await stripe.invoices.list({ status: "paid", limit: 100, starting_after });
      for (const inv of page.data) {
        if ((inv.currency ?? "").toLowerCase() !== "brl") continue;
        const v = (inv.amount_paid ?? 0) / 100;
        total += v;
        if (inv.created * 1000 >= inicioMes.getTime()) mes += v;
      }
      if (!page.has_more || page.data.length === 0) break;
      starting_after = page.data[page.data.length - 1].id;
    }
    return { total, mes, erro: null as string | null };
  } catch {
    return { total: 0, mes: 0, erro: "Não foi possível consultar os pagamentos agora" };
  }
}

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: "sandbox" | "live" }) => {
    if (data?.environment !== "sandbox" && data?.environment !== "live") throw new Error("Ambiente inválido");
    return data;
  })
  .handler(async ({ data: input, context }): Promise<AdminOverview> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const users = authData?.users ?? [];

    const { data: plans } = await supabaseAdmin.from("user_plans").select("*");
    const { data: subs } = await supabaseAdmin.from("subscriptions").select("user_id,status,environment");
    const { data: seen } = await supabaseAdmin.from("user_seen_questions").select("user_id,seen_at");

    const planByUser = new Map((plans ?? []).map((p: any) => [p.user_id, p]));
    const subByUser = new Map<string, string>();
    for (const s of subs ?? []) {
      if (["active", "trialing"].includes(s.status)) subByUser.set(s.user_id, s.status);
    }
    const seenCount = new Map<string, number>();
    const seenRecent = new Set<string>();
    const seteDias = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const r of seen ?? []) {
      seenCount.set(r.user_id, (seenCount.get(r.user_id) ?? 0) + 1);
      if (new Date(r.seen_at).getTime() > seteDias) seenRecent.add(r.user_id);
    }

    const usuarios: AdminUser[] = users.map((u) => {
      const plan = planByUser.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        plan: plan?.plan ?? "trial",
        trial_ends_at: plan?.trial_ends_at ?? null,
        premium_until: plan?.premium_until ?? null,
        sub_status: subByUser.get(u.id) ?? null,
        questoes_respondidas: seenCount.get(u.id) ?? 0,
      };
    });

    const now = Date.now();
    const receita = await calcularReceita(input.environment);
    const pagantes = usuarios.filter((u) => u.sub_status).length;
    const premium = usuarios.filter((u) => u.sub_status || (u.premium_until && new Date(u.premium_until).getTime() > now)).length;
    return {
      total: usuarios.length,
      ativos7dias: seenRecent.size,
      emTrial: usuarios.filter((u) => !u.sub_status && u.trial_ends_at && new Date(u.trial_ends_at).getTime() > now).length,
      premium,
      pagantes,
      free: usuarios.length - premium,
      receitaTotal: receita.total,
      receitaMes: receita.mes,
      receitaErro: receita.erro,
      usuarios: usuarios.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  });

async function aplicarPremium(userId: string, dias: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const premiumUntil = dias > 0 ? new Date(Date.now() + dias * 86400000).toISOString() : null;
  const { error } = await supabaseAdmin.from("user_plans").upsert({
    user_id: userId,
    plan: dias > 0 ? "premium" : "free",
    premium_until: premiumUntil,
  });
  if (error) throw new Error("Não foi possível atualizar o plano");
}

export const setUserPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; dias: number }) => {
    if (!/^[a-f0-9-]{36}$/i.test(data.userId)) throw new Error("Usuário inválido");
    if (!Number.isInteger(data.dias) || data.dias < 0 || data.dias > 3650) throw new Error("Dias inválidos");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await aplicarPremium(data.userId, data.dias);
    return { ok: true };
  });

export const setPremiumByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; dias: number }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) throw new Error("E-mail inválido");
    if (!Number.isInteger(data.dias) || data.dias < 1 || data.dias > 3650) throw new Error("Dias inválidos");
    return { email, dias: data.dias };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const user = authData?.users.find((u) => (u.email ?? "").toLowerCase() === data.email);
    if (!user) throw new Error("Nenhum usuário cadastrado com esse e-mail. Peça para a pessoa criar a conta primeiro.");
    await aplicarPremium(user.id, data.dias);
    return { ok: true };
  });
