import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Crown, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { buildPixPayload, PIX_VALOR_PREMIUM } from "@/lib/pix";

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

function PixPayment({ email }: { email: string }) {
  const payload = useMemo(
    () => buildPixPayload(PIX_VALOR_PREMIUM, `PREMIUM${Date.now().toString(36).toUpperCase()}`),
    []
  );
  const [qrUrl, setQrUrl] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(payload, { width: 320, margin: 1 })
      .then(setQrUrl)
      .catch(() => setQrUrl(""));
  }, [payload]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* clipboard indisponível */
    }
  };

  return (
    <div className="mt-4 rounded-lg border bg-background p-4" id="pagamento-pix">
      <p className="text-sm font-semibold flex items-center gap-2">
        <QrCode className="h-4 w-4" /> Pague com PIX — R$ {PIX_VALOR_PREMIUM.toFixed(2).replace(".", ",")}/mês
      </p>
      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {qrUrl ? (
          <img src={qrUrl} alt="QR Code PIX para pagamento" className="h-48 w-48 rounded-md border bg-white p-2" />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-md border text-xs text-muted-foreground">
            Gerando QR Code…
          </div>
        )}
        <div className="flex-1 space-y-2 text-sm">
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>Abra o app do seu banco e escolha <strong>pagar com PIX</strong>.</li>
            <li>Aponte a câmera para o QR Code ou use o código copia e cola abaixo.</li>
            <li>Confira o valor de <strong>R$ 9,99</strong> e confirme o pagamento.</li>
            <li>Seu acesso Premium é liberado em até algumas horas após a confirmação.</li>
          </ol>
          <div className="flex items-center gap-2">
            <code className="max-w-full flex-1 truncate rounded-md border bg-muted px-2 py-1 text-xs">
              {payload}
            </code>
            <Button size="sm" variant="outline" onClick={copiar}>
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiado ? "Copiado!" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Após pagar, envie o comprovante informando seu e-mail de cadastro
            {email ? (
              <>
                {" "}(<strong>{email}</strong>)
              </>
            ) : null}{" "}
            para agilizar a liberação do seu acesso.
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
      {pixAberto && <PixPayment email={email ?? ""} />}
    </div>
  );
}
