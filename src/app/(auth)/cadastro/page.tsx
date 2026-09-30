import { SignupForm } from "./SignupForm";
import { LocalModeNotice } from "@/components/auth/LocalModeNotice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeNext } from "@/lib/supabase/routes";

export const metadata = { title: "Criar conta · Find Business" };

export default async function CadastroPage({ searchParams }: PageProps<"/cadastro">) {
  if (!isSupabaseConfigured) return <LocalModeNotice />;
  const params = await searchParams;
  return <SignupForm next={safeNext(typeof params.next === "string" ? params.next : null)} />;
}
