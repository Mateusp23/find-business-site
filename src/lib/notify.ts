import { toast } from "@heroui/react";

/**
 * Feedback padrão do app: toasts no canto inferior direito (Toast.Provider em providers.tsx).
 *
 * Regra de uso:
 * - Resultado de ação / resposta de API (salvou, falhou, enviou, copiou) → notify.*
 * - Erro de validação de um campo → inline, embaixo do campo (Zod + React Hook Form)
 * - Estado permanente da tela (modo demonstração, lista vazia) → na própria página
 */

// O mesmo aviso disparado várias vezes seguidas aparece uma vez só. Cobre, por exemplo,
// vários salvamentos falhando juntos e o React (modo dev) rodando um efeito duas vezes.
const recent = new Map<string, number>();
const DEDUPE_MS = 2500;

function once(key: string) {
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < DEDUPE_MS) return false;
  recent.set(key, now);
  return true;
}

const key = (kind: string, title: string, description: unknown) =>
  `${kind}|${title}|${typeof description === "string" ? description : ""}`;

type Options = {
  description?: React.ReactNode;
  action?: { label: string; onPress: () => void };
};

function opts({ description, action }: Options = {}, timeout?: number) {
  return {
    description,
    timeout,
    actionProps: action ? { children: action.label, onPress: action.onPress } : undefined,
  };
}

export const notify = {
  success(title: string, o?: Options) {
    if (!once(key("success", title, o?.description))) return "";
    return toast.success(title, opts(o));
  },
  info(title: string, o?: Options) {
    if (!once(key("info", title, o?.description))) return "";
    return toast.info(title, opts(o));
  },
  warning(title: string, o?: Options) {
    if (!once(key("warning", title, o?.description))) return "";
    return toast.warning(title, opts(o, 6000));
  },
  /** Erros ficam mais tempo na tela. `error` pode ser um Error, erro do RTK Query, do Supabase ou texto. */
  error(title: string, error?: unknown, o?: Options) {
    const description = o?.description ?? (error === undefined ? undefined : errorMessage(error));
    if (!once(key("error", title, description))) return "";
    return toast.danger(title, opts({ ...o, description }, 7000));
  },
  /** Toast com spinner que fica aberto até ser atualizado com notify.update(). */
  loading(title: string, o?: Options) {
    return toast(title, { ...opts(o, 0), isLoading: true });
  },
  update(
    id: string,
    title: string,
    o?: Options & {
      variant?: "default" | "success" | "warning" | "danger";
      done?: boolean;
    },
  ) {
    return toast.update(id, title, {
      ...opts(o, o?.done ? 5000 : 0),
      variant: o?.variant,
      isLoading: !o?.done,
    });
  },
  dismiss(id: string) {
    if (id) toast.close(id);
  },
};

/** Tira uma mensagem legível de qualquer tipo de erro que o app encontra. */
export function errorMessage(error: unknown): string {
  if (!error) return "Erro inesperado.";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const e = error as {
      status?: unknown;
      data?: { error?: string } | unknown;
      error?: string;
      message?: string;
    };
    // RTK Query (fetchBaseQuery): { status, data: { error, code, ref } } — formato de src/lib/api/errors.ts
    if ("status" in e && e.status !== undefined) {
      const data = e.data as { error?: string; ref?: string } | undefined;
      if (data && typeof data === "object" && data.error) {
        return data.ref ? `${data.error} (código ${data.ref})` : data.error;
      }
      if (e.status === "FETCH_ERROR") return "Sem conexão com o servidor. Verifique sua internet.";
      if (e.status === "TIMEOUT_ERROR") return "O servidor demorou demais para responder.";
      // Resposta que não é JSON (ex.: página de erro 500/404 do servidor).
      const original = (e as { originalStatus?: number }).originalStatus;
      if (e.status === "PARSING_ERROR") {
        return `Erro inesperado no servidor${original ? ` (HTTP ${original})` : ""}.`;
      }
      if (typeof e.status === "number" && e.status >= 500) {
        return `Erro inesperado no servidor (HTTP ${e.status}).`;
      }
      if (e.message) return e.message;
      return `Erro ${String(e.status)}.`;
    }
    if (e.message) return e.message;
    if (e.error) return e.error;
  }
  return "Erro inesperado.";
}
