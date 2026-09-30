import Link from "next/link";
import { AuthCard } from "./AuthCard";

/** Mostrado nas telas de login quando o Supabase ainda não foi configurado. */
export function LocalModeNotice() {
  return (
    <AuthCard
      title="Login ainda não configurado"
      description="O app está em modo local: sem contas, com os dados salvos só neste navegador."
    >
      <p className="text-sm text-muted">
        Para ativar login e cadastro, crie o projeto no Supabase e preencha{" "}
        <code className="text-foreground">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
        <code className="text-foreground">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> no{" "}
        <code className="text-foreground">.env.local</code> (passo a passo no README).
      </p>
      <Link href="/" className="text-sm font-medium text-accent hover:underline">
        Continuar sem login →
      </Link>
    </AuthCard>
  );
}
