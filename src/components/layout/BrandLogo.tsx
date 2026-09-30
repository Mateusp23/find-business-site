import Image from "next/image";
import Link from "next/link";

/**
 * Marca do Find Business (arquivo original: public/find-busi.png).
 * - "compact": símbolo + nome em texto (barra lateral)
 * - "full": logo completo com o nome desenhado (telas de login/cadastro)
 */
export function BrandLogo({ variant = "compact" }: { variant?: "compact" | "full" }) {
  if (variant === "full") {
    return (
      <Link href="/" aria-label="Find Business: início" className="block">
        <Image
          src="/brand/logo-full.png"
          alt="Find Business"
          width={640}
          height={358}
          priority
          className="h-auto w-56 sm:w-64"
        />
      </Link>
    );
  }
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Image src="/brand/logo-icon.png" alt="" width={160} height={160} priority className="size-9" />
      <span className="text-base font-semibold">Find Business</span>
    </Link>
  );
}
