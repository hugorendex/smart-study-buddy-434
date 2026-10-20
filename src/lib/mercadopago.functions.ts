import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PIX_VALOR = 9.99;
const MP_API = "https://api.mercadopago.com";
const NOTIFICATION_URL =
  "https://project--736bd195-fa54-4644-9600-125cb5a4aea5.lovable.app/api/public/payments/mercadopago";

function mpToken(): string {
  const token = process.env["MERCADO_PAGO_ACCESS_TOKEN"];
  if (!token) throw new Error("Pagamento automático ainda não configurado.");
  return token;
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

/** Concede/estende 30 dias de Premium a partir de agora (ou do fim do premium atual). */
export async function grantPremium(userId: string) {
  const db = await admin();
  const { data: plan } = await db
    .from("user_plans")
    .select("premium_until")
    .eq("user_id", userId)
    .maybeSingle();
  const now = Date.now();
  const atual = plan?.premium_until ? new Date(plan.premium_until).getTime() : 0;
  const base = Math.max(now, atual);
  const novoFim = new Date(base + 30 * 86400000).toISOString();
  await db
    .from("user_plans")
    .upsert({ user_id: userId, plan: "premium", premium_until: novoFim }, { onConflict: "user_id" });
}

export async function fetchMpPayment(mpPaymentId: number | string) {
  const res = await fetch(`${MP_API}/v1/payments/${mpPaymentId}`, {
    headers: { Authorization: `Bearer ${mpToken()}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mercado Pago respondeu ${res.status}: ${body}`);
  }
  return (await res.json()) as { id: number; status: string; external_reference?: string };
}

/** Marca o pagamento como aprovado e libera o Premium (idempotente). */
export async function confirmPixPayment(mpPaymentId: number | string) {
  const payment = await fetchMpPayment(mpPaymentId);
  if (payment.status !== "approved") return { status: payment.status, liberado: false };
  const db = await admin();
  const { data: row } = await db
    .from("pix_payments")
    .select("id, user_id, status")
    .eq("mp_payment_id", Number(mpPaymentId))
    .maybeSingle();
  const userId = row?.user_id ?? payment.external_reference;
  if (!userId) return { status: payment.status, liberado: false };
  if (row?.status !== "approved") {
    await db
      .from("pix_payments")
      .update({ status: "approved", paid_at: new Date().toISOString() })
      .eq("mp_payment_id", Number(mpPaymentId));
    await grantPremium(userId);
  }
  return { status: "approved", liberado: true };
}

export const createPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context as any;
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email ?? "cliente@portaldoconcurseiro.com";

    const res = await fetch(`${MP_API}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken()}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${userId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: PIX_VALOR,
        description: "Portal do Concurseiro — Premium mensal",
        payment_method_id: "pix",
        payer: { email },
        external_reference: userId,
        notification_url: NOTIFICATION_URL,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Mercado Pago criar pagamento falhou [${res.status}]: ${body}`);
      throw new Error("Não foi possível gerar o PIX agora. Tente novamente em instantes.");
    }
    const payment = await res.json();
    const tx = payment.point_of_interaction?.transaction_data ?? {};

    await supabase.from("pix_payments").insert({
      user_id: userId,
      mp_payment_id: payment.id,
      amount: PIX_VALOR,
      status: payment.status ?? "pending",
    });

    return {
      mpPaymentId: payment.id as number,
      status: payment.status as string,
      qrCode: (tx.qr_code ?? "") as string,
      qrCodeBase64: (tx.qr_code_base64 ?? "") as string,
    };
  });

export const checkPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ mpPaymentId: z.number() }))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context as any;
    const { data: row } = await supabase
      .from("pix_payments")
      .select("status")
      .eq("mp_payment_id", data.mpPaymentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (row?.status === "approved") return { status: "approved" };
    const result = await confirmPixPayment(data.mpPaymentId);
    return { status: result.status };
  });
