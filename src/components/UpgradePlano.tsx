import { useEffect, useState } from "react";
import { Check, CheckCircle2, Copy, Crown, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { createPixPayment, checkPixPayment, PIX_VALOR } from "@/lib/mercadopago.functions";

export const PRECO_PREMIUM = "premium_mensal_brl";

type PlanoInfo = {
  plan: string;
  trial_ends_at: string | null;
  premium_until: string | null;
  ativo: boolean;
};

export function usePlano(userId: string | undefined) {
  const [plano, setPlano] = useState<PlanoInfo | null>(null);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: plan } = await supabase
        .from("user_plans")
        .select("plan, trial_ends_at, premium_until")
        .eq("user_id", userId)
        .maybeSingle();
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .eq("environment", getStripeEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const now = Date.now();
      const trialAtivo = plan?.trial_ends_at ? new Date(plan.trial_ends_at).getTime() > now : false;
      const manualAtivo = plan?.premium_until ? new Date(plan.premium_until).getTime() > now : false;
      const subAtiva =
        !!sub &&
        (["active", "trialing"].includes(sub.status) ||
          (sub.status === "canceled" && sub.current_period_end && new Date(sub.current_period_end).getTime() > now));
      setPlano({
        plan: plan?.plan ?? "trial",
        trial_ends_at: plan?.trial_ends_at ?? null,
        premium_until: plan?.premium_until ?? null,
        ativo: trialAtivo || manualAtivo || !!subAtiva,
      });
    })();
  }, [userId]);
  return plano;
}

function PixPayment({ onConfirmado }: { onConfirmado: () => void }) {
  const [pagamento, setPagamento] = useState<{
    mpPaymentId: number;
    qrCode: string;
    qrCodeBase64: string;
  } | null>(null);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    createPixPayment({ data: {} as never })
      .then((p) => {
        if (!cancelado) setPagamento(p);
      })
      .catch((e) => {
        if (!cancelado) setErro(e instanceof Error ? e.message : "Não foi possível gerar o PIX.");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!pagamento || confirmado) return;
    const timer = setInterval(async () => {
      try {
        const r = await checkPixPayment({ data: { mpPaymentId: pagamento.mpPaymentId } });
        if (r.status === "approved") {
          setConfirmado(true);
          onConfirmado();
        }
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [pagamento, confirmado, onConfirmado]);

  const copiar = async () => {
    if (!pagamento) return;
    try {
      await navigator.clipboard.writeText(pagamento.qrCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* clipboard indisponível */
    }
  };

  if (confirmado) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg border bg-background p-4 text-sm">
        <CheckCircle2 className="h-5 w-5 text-accent" />
        <span>
          <strong>Pagamento confirmado!</strong> Seu acesso Premium foi liberado. Bons estudos!
        </span>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border bg-background p-4" id="pagamento-pix">
      <p className="text-sm font-semibold flex items-center gap-2">
        <QrCode className="h-4 w-4" /> Pague com PIX — R$ {PIX_VALOR.toFixed(2).replace(".", ",")}/mês
      </p>
      {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {pagamento?.qrCodeBase64 ? (
          <img
            src={`data:image/png;base64,${pagamento.qrCodeBase64}`}
            alt="QR Code PIX para pagamento"
            className="h-48 w-48 rounded-md border bg-white p-2"
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-md border text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        <div className="flex-1 space-y-2 text-sm">
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>Abra o app do seu banco e escolha <strong>pagar com PIX</strong>.</li>
            <li>Aponte a câmera para o QR Code ou use o código copia e cola abaixo.</li>
            <li>Confira o valor de <strong>R$ 9,99</strong> e confirme o pagamento.</li>
            <li>Seu acesso Premium é liberado <strong>automaticamente</strong> em segundos.</li>
          </ol>
          {pagamento && (
            <div className="flex flex-col gap-2">
              <code className="w-full break-all rounded-md border bg-muted px-2 py-1 text-xs">
                {pagamento.qrCode}
              </code>
              <Button size="sm" variant="outline" onClick={copiar} className="self-start">
                {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiado ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          )}
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Aguardando confirmação do pagamento…
          </p>
        </div>
      </div>
    </div>
  );
}

export function UpgradeCard({ userId, email }: { userId: string; email?: string }) {
  const plano = usePlano(userId);
  const [pixAberto, setPixAberto] = useState(false);

  if (!plano) return null;

  const diasRestantes = plano.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(plano.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  if (plano.ativo && plano.plan !== "trial") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
        <Crown className="h-4 w-4 text-accent" />
        <span>
          Você é <strong>Premium</strong>. Aproveite todos os recursos!
        </span>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border bg-card p-4">
      {plano.ativo ? (
        <p className="text-sm">
          <strong>Teste grátis:</strong> restam <strong>{diasRestantes} dia(s)</strong> de acesso completo.
        </p>
      ) : (
        <p className="text-sm">
          Seu teste grátis terminou. Assine o <strong>Premium</strong> para continuar estudando sem limites.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => setPixAberto((v) => !v)}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Crown className="h-4 w-4" /> Assinar Premium — R$ 9,99/mês
        </Button>
        <span className="text-xs text-muted-foreground">Pagamento via PIX · liberação após confirmação</span>
      </div>
      {pixAberto && <PixPayment onConfirmado={() => window.location.reload()} />}
    </div>
  );
}
