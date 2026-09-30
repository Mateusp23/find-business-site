import type { User } from "@supabase/supabase-js";

/** Dados do usuário que a interface precisa (serializável para o Redux). */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  /** "email", "google"... usado para mostrar "trocar senha" só para quem tem senha. */
  providers: string[];
}

export function toSessionUser(user: User | null | undefined): SessionUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const providers =
    (user.app_metadata?.providers as string[] | undefined) ??
    (user.app_metadata?.provider ? [user.app_metadata.provider as string] : []);
  return {
    id: user.id,
    email: user.email ?? "",
    name: (meta.full_name as string) || (meta.name as string) || "",
    avatarUrl: (meta.avatar_url as string) || null,
    providers,
  };
}
