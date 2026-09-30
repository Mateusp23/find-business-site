"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { ThemeProvider, useTheme } from "next-themes";
import { Toast } from "@heroui/react";
import { notify } from "@/lib/notify";
import { makeStore, type AppStore } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { setDataAdapter } from "@/lib/data";
import { localAdapter } from "@/lib/data/local";
import { supabaseAdapter } from "@/lib/data/supabase";
import type { UserData } from "@/lib/data/types";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { toSessionUser, type SessionUser } from "@/lib/supabase/session";
import { hydrateLeads } from "@/store/slices/leadsSlice";
import { hydrateAnalysis } from "@/store/slices/analysisSlice";
import { hydrateSettings } from "@/store/slices/settingsSlice";
import { setDataStatus, setUser, signedOut } from "@/store/slices/sessionSlice";
import { importLocalData } from "@/lib/data/importLocal";
import { needsMfaVerification } from "@/lib/supabase/mfa";

function hydrate(store: AppStore, data: UserData) {
  store.dispatch(hydrateLeads(data.leads));
  store.dispatch(hydrateAnalysis(data.analysis));
  store.dispatch(hydrateSettings(data.settings));
}

/** Carrega os dados certos conforme o modo (local) ou o usuário logado (Supabase). */
function useDataBootstrap(store: AppStore) {
  useEffect(() => {
    // Modo local: sem login, dados do navegador.
    if (!isSupabaseConfigured) {
      setDataAdapter(localAdapter);
      localAdapter.load().then((data) => {
        hydrate(store, data);
        store.dispatch(setDataStatus("ready"));
      });
      return;
    }

    const supabase = getSupabaseBrowser()!;
    let loadedFor: string | null = null;

    const boot = async (user: SessionUser | null) => {
      if (!user) {
        setDataAdapter(null);
        return;
      }
      if (loadedFor === user.id) return;
      // 2FA pendente: o banco não libera os dados antes do código (RLS). Espera a verificação.
      if (await needsMfaVerification(supabase)) {
        setDataAdapter(null);
        return;
      }
      if (loadedFor === user.id) return;
      loadedFor = user.id;

      const adapter = supabaseAdapter(supabase, user.id);
      setDataAdapter(adapter);
      store.dispatch(setDataStatus("loading"));
      try {
        let data = await adapter.load();
        const imported = await importLocalData(adapter, data, user);
        if (imported.total > 0) {
          data = await adapter.load();
          notify.success("Dados deste navegador importados para sua conta", {
            description: `${imported.leads} leads e ${imported.analyses} análises de site.`,
          });
        }
        // Perfil novo sem nome (ex.: cadastro por e-mail antigo): usa o nome da conta.
        if (!data.settings.userName && user.name) data.settings.userName = user.name;
        hydrate(store, data);
        store.dispatch(setDataStatus("ready"));
      } catch (err) {
        console.error(err);
        store.dispatch(setDataStatus("error"));
        notify.error("Não foi possível carregar seus dados", err, {
          description: "Confira se o SQL do Supabase foi executado (veja o README).",
        });
      }
    };

    boot(store.getState().session.user);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        loadedFor = null;
        setDataAdapter(null);
        store.dispatch(signedOut());
        return;
      }
      const user = toSessionUser(session?.user);
      // Código do 2FA confirmado: agora os dados podem ser carregados.
      if (event === "MFA_CHALLENGE_VERIFIED") loadedFor = null;
      if (user) {
        store.dispatch(setUser(user));
        // Adiado: o Supabase não permite chamadas dentro deste callback.
        setTimeout(() => boot(user), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [store]);
}

/** Aplica o tema salvo no perfil/ajustes assim que os dados carregam. */
function ThemeSync() {
  const theme = useAppSelector((s) => s.settings.theme);
  const ready = useAppSelector((s) => s.session.dataStatus === "ready");
  const { setTheme } = useTheme();
  useEffect(() => {
    if (ready) setTheme(theme);
  }, [ready, theme, setTheme]);
  return null;
}

export function Providers({
  children,
  initialUser,
  nonce,
}: {
  children: React.ReactNode;
  initialUser: SessionUser | null;
  nonce?: string;
}) {
  const [store] = useState(() =>
    makeStore({
      mode: isSupabaseConfigured ? "supabase" : "local",
      user: initialUser,
      dataStatus: "idle",
    }),
  );
  useDataBootstrap(store);

  return (
    <Provider store={store}>
      <ThemeProvider
        attribute={["class", "data-theme"]}
        defaultTheme="dark"
        enableSystem
        nonce={nonce}
        disableTransitionOnChange
      >
        <ThemeSync />
        {children}
        <Toast.Provider placement="bottom end" />
      </ThemeProvider>
    </Provider>
  );
}
