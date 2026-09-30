"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Gauge, MessageSquareText, Settings, Star, UserRound } from "lucide-react";
import { followUpState, isDue } from "@/lib/followUp";
import { useAppSelector } from "@/store/hooks";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

const NAV = [
  { href: "/", label: "Buscar empresas", icon: Compass },
  { href: "/leads", label: "Leads salvos", icon: Star },
  { href: "/analisar", label: "Analisar site", icon: Gauge },
  { href: "/mensagens", label: "Mensagens", icon: MessageSquareText },
  { href: "/perfil", label: "Perfil", icon: UserRound },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const leadCount = useAppSelector((s) => Object.keys(s.leads.byId).length);
  // Leads com retorno para hoje ou atrasados: aparece em destaque no menu.
  const dueCount = useAppSelector(
    (s) =>
      Object.values(s.leads.byId).filter((l) => isDue(followUpState(l.nextFollowUpOn, l.status)))
        .length,
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col border-b border-separator md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center gap-2.5 px-4 py-4 md:py-5">
          <BrandLogo />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-accent-soft font-medium text-accent-soft-foreground"
                    : "text-muted hover:bg-default hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                {href === "/leads" && dueCount > 0 && (
                  <span
                    className="ml-auto rounded-full bg-warning px-2 text-xs font-medium text-warning-foreground"
                    title={`${dueCount} para retornar hoje`}
                  >
                    {dueCount}
                  </span>
                )}
                {href === "/leads" && dueCount === 0 && leadCount > 0 && (
                  <span className="ml-auto rounded-full bg-default px-2 text-xs text-muted">
                    {leadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden p-3 md:block">
          <UserMenu />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}
