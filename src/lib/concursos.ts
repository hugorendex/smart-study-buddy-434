export const MATERIAS = [
  "Língua Portuguesa",
  "Raciocínio Lógico",
  "Estatística e Análise de Dados",
  "Contabilidade e Análise Financeira",
  "Informática",
  "Direito Constitucional",
  "Direito Administrativo",
  "Direito Penal",
  "Direito Processual Penal",
  "Legislação Penal Especial",
  "Direitos Humanos",
  "Criminologia",
  "História e Geografia do Amapá",
  "Legislação Estadual (PC-AP)",
  "Direito Civil/Empresarial e Legislação Complementar",
  "Direito Tributário e Legislação Complementar",
  "Direito Ambiental e Legislação Complementar",
  "Medicina Legal",
] as const;

export type Materia = typeof MATERIAS[number];

export const MATERIAS_POR_CONCURSO: Record<string, string[]> = {
  "PC-AP": [...MATERIAS],
  "PF": [
    "Língua Portuguesa",
    "Informática",
    "Contabilidade e Análise Financeira",
    "Raciocínio Lógico",
    "Estatística e Análise de Dados",
    "Direito Constitucional",
    "Direito Administrativo",
    "Direito Penal",
    "Direito Processual Penal",
    "Legislação Penal Especial",
    "Direitos Humanos",
  ],
  "PRF": [
    "Língua Portuguesa",
    "Raciocínio Lógico",
    "Informática",
    "Direito Constitucional",
    "Direito Administrativo",
    "Direito Penal",
    "Direito Processual Penal",
    "Legislação Penal Especial",
    "Direitos Humanos",
  ],
  "RECEITA": [
    "Língua Portuguesa",
    "Raciocínio Lógico",
    "Estatística e Análise de Dados",
    "Contabilidade e Análise Financeira",
    "Direito Constitucional",
    "Direito Administrativo",
    "Direito Tributário e Legislação Complementar",
  ],
  "INSS": [
    "Língua Portuguesa",
    "Raciocínio Lógico",
    "Informática",
    "Direito Constitucional",
    "Direito Administrativo",
  ],
  "TJ-AP": [
    "Língua Portuguesa",
    "Raciocínio Lógico",
    "Informática",
    "Direito Constitucional",
    "Direito Administrativo",
    "Direito Processual Penal",
    "História e Geografia do Amapá",
    "Legislação Estadual (PC-AP)",
  ],
  "CNU": [
    "Língua Portuguesa",
    "Raciocínio Lógico",
    "Estatística e Análise de Dados",
    "Informática",
    "Direito Constitucional",
    "Direito Administrativo",
    "Direitos Humanos",
  ],
  "GERAL": [...MATERIAS],
};

export function obterMateriasPorConcurso(concurso?: string): string[] {
  if (!concurso) return [...MATERIAS];
  return MATERIAS_POR_CONCURSO[concurso] || [...MATERIAS];
}

export const CONCURSOS_DISPONIVEIS = [
  { id: "PC-AP", nome: "Polícia Civil - AP", badge: "PC-AP", cargoPadrao: "Investigador de Polícia" },
  { id: "PF", nome: "Polícia Federal", badge: "PF", cargoPadrao: "Agente de Polícia Federal" },
  { id: "PRF", nome: "Polícia Rodoviária Federal", badge: "PRF", cargoPadrao: "Policial Rodoviário Federal" },
  { id: "RECEITA", nome: "Receita Federal", badge: "Receita", cargoPadrao: "Auditor-Fiscal" },
  { id: "INSS", nome: "INSS", badge: "INSS", cargoPadrao: "Técnico do Seguro Social" },
  { id: "TJ-AP", nome: "Tribunal de Justiça - AP", badge: "TJ-AP", cargoPadrao: "Técnico Judiciário" },
  { id: "CNU", nome: "Concurso Nacional Unificado", badge: "CNU", cargoPadrao: "Analista em Gestão Pública" },
  { id: "GERAL", nome: "Geral / Outros", badge: "Geral", cargoPadrao: "Carreira Pública" },
] as const;

export type ConcursoInfo = typeof CONCURSOS_DISPONIVEIS[number];

/**
 * Calcula a diferença de dias entre a data da prova e a data de hoje,
 * normalizando os componentes de calendário (ano, mês, dia) no ambiente local
 * para evitar discrepâncias de fuso horário e conflitos de hidratação.
 *
 * Retorna:
 * - null se data inválida ou não informada
 * - número positivo (> 0) se prova no futuro
 * - 0 se prova hoje
 * - número negativo (< 0) se prova já passou
 */
export function calcularDiasRestantes(dataProva?: string | null): number | null {
  if (!dataProva || typeof dataProva !== "string") return null;
  const partes = dataProva.trim().split("-");
  if (partes.length !== 3) return null;

  const ano = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  const dia = parseInt(partes[2], 10);

  if (isNaN(ano) || isNaN(mes) || isNaN(dia)) return null;

  const target = new Date(ano, mes - 1, dia);
  const now = new Date();
  const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = target.getTime() - hoje.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
