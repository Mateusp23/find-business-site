import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança aplicados a TODAS as respostas (páginas, /api, arquivos).
 * A Content-Security-Policy (com nonce por requisição) é definida no src/proxy.ts.
 */
const securityHeaders = [
  // Impede o navegador de "adivinhar" o tipo de arquivo.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Não deixa outro site abrir o app dentro de um iframe (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Envia só o domínio (sem caminho/parâmetros) para outros sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Recursos do navegador que o app não usa ficam desligados.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  // Isola a janela do app de popups de outros sites.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Só HTTPS por 2 anos (ignorado em http://localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Respostas da API nunca ficam em cache (dados de cada usuário).
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
