/** Nichos sugeridos no campo "Tipo de empresa" (o usuário pode digitar outro). */
export const NICHES = [
  "Academia",
  "Advocacia",
  "Arquitetura",
  "Autoescola",
  "Auto elétrica",
  "Barbearia",
  "Buffet e eventos",
  "Chaveiro",
  "Clínica médica",
  "Clínica de estética",
  "Clínica veterinária",
  "Confeitaria",
  "Contabilidade",
  "Corretora de seguros",
  "Dedetização",
  "Dentista",
  "Eletricista",
  "Encanador",
  "Engenharia",
  "Escola de idiomas",
  "Farmácia",
  "Fisioterapia",
  "Floricultura",
  "Fotógrafo",
  "Hamburgueria",
  "Hotel",
  "Imobiliária",
  "Lavanderia",
  "Loja de móveis",
  "Marcenaria",
  "Materiais de construção",
  "Nutricionista",
  "Oficina mecânica",
  "Ótica",
  "Padaria",
  "Pet shop",
  "Pizzaria",
  "Pousada",
  "Psicólogo",
  "Restaurante",
  "Salão de beleza",
  "Serralheria",
  "Vidraçaria",
];

export interface Service {
  id: string;
  label: string;
  /** Como o serviço aparece no meio de uma frase: "Eu faço {pitch}". */
  pitch: string;
}

export const SERVICES: Service[] = [
  { id: "site", label: "Criação de site", pitch: "criação de sites" },
  { id: "landing", label: "Landing page", pitch: "páginas de vendas (landing pages)" },
  { id: "loja", label: "Loja virtual", pitch: "lojas virtuais" },
  { id: "gmn", label: "Otimização do Google Meu Negócio", pitch: "otimização de perfil no Google" },
  { id: "trafego", label: "Tráfego pago", pitch: "anúncios no Google e no Instagram" },
];

export const LIMIT_OPTIONS = [20, 40, 60];

export function serviceById(id: string) {
  return SERVICES.find((s) => s.id === id) ?? SERVICES[0];
}

/** Os 27 estados não mudam: lista fixa evita uma chamada ao IBGE. */
export const ESTADOS = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
].map(([sigla, nome]) => ({ id: sigla, label: nome }));
