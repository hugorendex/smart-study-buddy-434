import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito ao administrador");
}

export type AuthorizedEmail = {
  id?: string;
  email: string;
  status: "approved" | "blocked";
  created_at: string;
};

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
  authorized: boolean;
  isAdmin: boolean;
};

export type AdminOverview = {
  total: number;
  ativos7dias: number;
  emTrial: number;
  premium: number;
  pagantes: number;
  free: number;
  autorizados: number;
  bloqueados: number;
  receitaTotal: number;
  receitaMes: number;
  receitaErro: string | null;
  usuarios: AdminUser[];
  authorizedEmails: AuthorizedEmail[];
};

async function calcularReceita(env: "sandbox" | "live") {
  try {
    const { createStripeClient } = await import("@/lib/stripe.server");
    const stripe = createStripeClient(env);
    let total = 0, mes = 0;
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    let starting_after: string | undefined;
    for (let i = 0; i < 10; i++) {
      const page = await stripe.invoices.list({ status: "paid", limit: 100, ...(starting_after ? { starting_after } : {}) });
      for (const inv of page.data) {
        if ((inv.currency ?? "").toLowerCase() !== "brl") continue;
        const v = (inv.amount_paid ?? 0) / 100;
        total += v;
        if (inv.created * 1000 >= inicioMes.getTime()) mes += v;
      }
      if (!page.has_more || page.data.length === 0) break;
      starting_after = page.data[page.data.length - 1]?.id;
    }
    return { total, mes, erro: null as string | null };
  } catch {
    return { total: 0, mes: 0, erro: "Não foi possível consultar os pagamentos agora" };
  }
}

/** Verifica se o usuário logado possui permissão para acessar o portal */
export const checkUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Checa se o usuário é administrador
    let isAdmin = false;
    try {
      const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
      isAdmin = !!data;
    } catch {
      // ignore
    }

    const email = String(context.claims?.email ?? "").toLowerCase().trim();

    if (isAdmin) {
      return { authorized: true, isAdmin: true, email };
    }

    // 2. Checa tabela authorized_emails
    try {
      const { data: authRow } = await supabaseAdmin
        .from("authorized_emails" as any)
        .select("status")
        .ilike("email", email)
        .maybeSingle();

      if (authRow) {
        if (authRow.status === "approved") return { authorized: true, isAdmin: false, email };
        if (authRow.status === "blocked") return { authorized: false, isAdmin: false, email };
      }
    } catch {
      // fallback caso a migration da tabela ainda não tenha sido rodada
    }

    // 3. Checa tabela user_plans
    try {
      const { data: plan } = await supabaseAdmin
        .from("user_plans")
        .select("plan, premium_until")
        .eq("user_id", userId)
        .maybeSingle();

      if (plan) {
        if (plan.plan === "approved") return { authorized: true, isAdmin: false, email };
        if (plan.plan === "blocked") return { authorized: false, isAdmin: false, email };
        if (plan.plan === "premium" && (!plan.premium_until || new Date(plan.premium_until).getTime() > Date.now())) {
          return { authorized: true, isAdmin: false, email };
        }
      }
    } catch {
      // ignore
    }

    // Por padrão: bloqueado até o administrador aprovar!
    return { authorized: false, isAdmin: false, email };
  });

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

    let authorizedEmailsList: AuthorizedEmail[] = [];
    const authEmailMap = new Map<string, string>();
    try {
      const { data: aList } = await supabaseAdmin
        .from("authorized_emails" as any)
        .select("id, email, status, created_at")
        .order("created_at", { ascending: false });
      if (aList) {
        authorizedEmailsList = aList as AuthorizedEmail[];
        for (const item of aList) {
          authEmailMap.set((item.email ?? "").toLowerCase().trim(), item.status);
        }
      }
    } catch {
      // table might not exist yet
    }

    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "admin");
    const adminUserIds = new Set((adminRoles ?? []).map((r: any) => r.user_id));

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
      const emailLower = (u.email ?? "").toLowerCase().trim();
      const isAdm = adminUserIds.has(u.id);

      let isAuth = false;
      if (isAdm) {
        isAuth = true;
      } else if (authEmailMap.has(emailLower)) {
        isAuth = authEmailMap.get(emailLower) === "approved";
      } else if (plan?.plan === "approved") {
        isAuth = true;
      } else if (plan?.plan === "blocked") {
        isAuth = false;
      } else if (plan?.plan === "premium") {
        isAuth = true;
      } else {
        isAuth = false; // bloqueado por padrão
      }

      return {
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        plan: plan?.plan ?? "free",
        trial_ends_at: plan?.trial_ends_at ?? null,
        premium_until: plan?.premium_until ?? null,
        sub_status: subByUser.get(u.id) ?? null,
        questoes_respondidas: seenCount.get(u.id) ?? 0,
        authorized: isAuth,
        isAdmin: isAdm,
      };
    });

    const now = Date.now();
    const receita = await calcularReceita(input.environment);
    const pagantes = usuarios.filter((u) => u.sub_status).length;
    const premium = usuarios.filter((u) => u.sub_status || (u.premium_until && new Date(u.premium_until).getTime() > now)).length;
    const autorizadosCount = usuarios.filter((u) => u.authorized).length;
    const bloqueadosCount = usuarios.filter((u) => !u.authorized).length;

    return {
      total: usuarios.length,
      ativos7dias: seenRecent.size,
      emTrial: usuarios.filter((u) => !u.sub_status && u.trial_ends_at && new Date(u.trial_ends_at).getTime() > now).length,
      premium,
      pagantes,
      free: usuarios.length - premium,
      autorizados: autorizadosCount,
      bloqueados: bloqueadosCount,
      receitaTotal: receita.total,
      receitaMes: receita.mes,
      receitaErro: receita.erro,
      usuarios: usuarios.sort((a, b) => b.created_at.localeCompare(a.created_at)),
      authorizedEmails: authorizedEmailsList,
    };
  });

/** Autoriza um e-mail antes ou depois do cadastro */
export const authorizeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido");
    return { email };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      await supabaseAdmin.from("authorized_emails" as any).upsert(
        { email: data.email, status: "approved", updated_at: new Date().toISOString() },
        { onConflict: "email" }
      );
    } catch {
      // table might not exist yet
    }

    try {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const user = authData?.users.find((u) => (u.email ?? "").toLowerCase() === data.email);
      if (user) {
        await supabaseAdmin.from("user_plans").upsert({
          user_id: user.id,
          plan: "approved",
        });
      }
    } catch {
      // ignore
    }

    return { ok: true, email: data.email };
  });

/** Revoga ou bloqueia permissão de um e-mail */
export const revokeEmailAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; userId?: string }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    return { email, userId: data?.userId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      await supabaseAdmin.from("authorized_emails" as any).upsert(
        { email: data.email, status: "blocked", updated_at: new Date().toISOString() },
        { onConflict: "email" }
      );
    } catch {
      // table might not exist
    }

    let uid = data.userId;
    if (!uid) {
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const user = authData?.users.find((u) => (u.email ?? "").toLowerCase() === data.email);
      uid = user?.id;
    }

    if (uid) {
      await supabaseAdmin.from("user_plans").upsert({
        user_id: uid,
        plan: "blocked",
      });
    }

    return { ok: true, email: data.email };
  });

/** Altera permissão de acesso de um usuário (libera ou bloqueia) */
export const toggleUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; email: string; approved: boolean }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    return { userId: data.userId, email, approved: !!data.approved };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const newStatus = data.approved ? "approved" : "blocked";

    try {
      await supabaseAdmin.from("authorized_emails" as any).upsert(
        { email: data.email, status: newStatus, updated_at: new Date().toISOString() },
        { onConflict: "email" }
      );
    } catch {
      // table might not exist
    }

    await supabaseAdmin.from("user_plans").upsert({
      user_id: data.userId,
      plan: newStatus,
    });

    return { ok: true, approved: data.approved };
  });

async function aplicarPremium(userId: string, dias: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const premiumUntil = dias > 0 ? new Date(Date.now() + dias * 86400000).toISOString() : null;
  const { error } = await supabaseAdmin.from("user_plans").upsert({
    user_id: userId,
    plan: dias > 0 ? "approved" : "free",
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
