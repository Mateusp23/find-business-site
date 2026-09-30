"use client";

import { useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/supabase/errors";

/** Entrar/cadastrar com Google (OAuth pelo Supabase). */
export function GoogleButton({ next = "/", onError }: { next?: string; onError: (m: string) => void }) {
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } },
    });
    // Sem erro, o navegador já está indo para o Google.
    if (error) {
      setLoading(false);
      onError(authErrorMessage(error));
    }
  };

  return (
    <Button fullWidth variant="tertiary" onPress={signIn} isDisabled={loading}>
      {loading ? (
        <Spinner size="sm" color="current" />
      ) : (
        <span className="grid size-5 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background">
          G
        </span>
      )}
      Continuar com Google
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-separator" />
      ou
      <span className="h-px flex-1 bg-separator" />
    </div>
  );
}
