import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/payments.functions";

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

export function UpgradeCard({ userId }: { userId: string }) {
  const plano = usePlano(userId);
  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [erro, setErro] = useState("");

  if (!plano) return null;

  const diasRestantes = plano.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(plano.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  if (plano.ativo && plano.plan !== "trial") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border bg-card p-3 text-sm">
        <Crown className="h-4 w-4 text-accent" />
        <span>Você é <strong>Premium</strong>. Aproveite todos os recursos!</span>
      </div>
    );
  }

  const fetchClientSecret = async (): Promise<string> => {
    const result = await createCheckoutSession({
      data: {
        priceId: PRECO_PREMIUM,
        returnUrl: window.location.href,
        environment: getStripeEnvironment(),
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Não foi possível iniciar o pagamento");
    return result.clientSecret;
  };

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
          onClick={() => { setErro(""); setCheckoutAberto(true); }}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Crown className="h-4 w-4" /> Assinar Premium — R$ 9,99/mês
        </Button>
        <span className="text-xs text-muted-foreground">Pague com PIX ou cartão · cancele quando quiser</span>
      </div>
      {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
      {checkoutAberto && (
        <div className="mt-4" id="checkout">
          <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}
    </div>
  );
}

export function PaymentTestModeBanner() {
  const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"];
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        O pagamento em produção ainda não está configurado.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-xs text-foreground">
        Pagamentos em modo de teste no preview — nenhuma cobrança real é feita.
      </div>
    );
  }
  return null;
}
