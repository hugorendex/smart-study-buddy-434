import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

function verifySignature(request: Request, dataId: string): boolean {
  const secret = process.env["MERCADO_PAGO_WEBHOOK_SECRET"];
  if (!secret) return false;
  const signature = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(
    signature.split(",").map((kv) => kv.split("=") as [string, string])
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/payments/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const body = await request.json().catch(() => ({}));
        const dataId =
          url.searchParams.get("data.id") ?? String(body?.data?.id ?? "");
        const type = url.searchParams.get("type") ?? body?.type ?? "";

        if (!dataId || !verifySignature(request, dataId)) {
          return new Response("Assinatura inválida", { status: 401 });
        }
        if (type !== "payment") {
          return new Response("ok");
        }
        try {
          const { confirmPixPayment } = await import("@/lib/mercadopago.functions");
          await confirmPixPayment(dataId);
        } catch (err) {
          console.error("Erro ao confirmar PIX:", err);
          return new Response("erro interno", { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
