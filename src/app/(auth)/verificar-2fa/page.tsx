import { VerifyMfaForm } from "./VerifyMfaForm";
import { LocalModeNotice } from "@/components/auth/LocalModeNotice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeNext } from "@/lib/supabase/routes";

export const metadata = { title: "Verificação em duas etapas · Find Business" };

export default async function VerificarMfaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseConfigured) return <LocalModeNotice />;
  const params = await searchParams;
  return <VerifyMfaForm next={safeNext(typeof params.next === "string" ? params.next : null)} />;
}
