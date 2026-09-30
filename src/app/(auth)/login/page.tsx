import { LoginForm } from "./LoginForm";
import { LocalModeNotice } from "@/components/auth/LocalModeNotice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { safeNext } from "@/lib/supabase/routes";

export const metadata = { title: "Entrar · Find Business" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (!isSupabaseConfigured) return <LocalModeNotice />;
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const error = typeof params.erro === "string" ? params.erro : null;
  const notice = typeof params.aviso === "string" ? params.aviso : null;
  return <LoginForm next={next} initialError={error} notice={notice} />;
}
