import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { headers } from "next/headers";
import { Providers } from "./providers";
import { getSupabaseServer } from "@/lib/supabase/server";
import { toSessionUser } from "@/lib/supabase/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find Business",
  description: "Encontre empresas sem site no Google Maps e transforme em clientes.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Usuário já é lido no servidor: a tela abre sem "piscar" entre logado e deslogado.
  const supabase = await getSupabaseServer();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  // Nonce da CSP criado no proxy: scripts inline (ex.: o do tema) precisam dele para rodar.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="pt-BR"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">
        <Providers initialUser={toSessionUser(user)} nonce={nonce}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
