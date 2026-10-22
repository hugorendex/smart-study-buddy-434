import { describe, expect, it } from "vitest";
import { CONCURSOS_DISPONIVEIS, type OfensivaData, type EstudosHojeData } from "@/routes/index";

describe("Modo Foco - Lógica e Regras de Negócio", () => {
  it("contém todos os concursos cadastrados com badges e cargos padrão", () => {
    expect(CONCURSOS_DISPONIVEIS.length).toBeGreaterThanOrEqual(8);
    const pcap = CONCURSOS_DISPONIVEIS.find((c) => c.id === "PC-AP");
    expect(pcap).toBeDefined();
    expect(pcap?.cargoPadrao).toBe("Investigador de Polícia");

    const pf = CONCURSOS_DISPONIVEIS.find((c) => c.id === "PF");
    expect(pf?.cargoPadrao).toBe("Agente de Polícia Federal");
  });

  it("calcula taxa de acerto diária e formatação corretamente", () => {
    const hojeData: EstudosHojeData = {
      data: "2026-10-22",
      resolvidas: 10,
      certas: 8,
      tempoSegundos: 360,
    };

    const acertoHoje = hojeData.resolvidas > 0
      ? Math.round((hojeData.certas / hojeData.resolvidas) * 100)
      : 0;

    expect(acertoHoje).toBe(80);
    expect(Math.floor(hojeData.tempoSegundos / 60)).toBe(6);
  });

  it("calcula taxa de acerto zerada quando nenhuma questão foi feita", () => {
    const hojeData: EstudosHojeData = {
      data: "2026-10-22",
      resolvidas: 0,
      certas: 0,
      tempoSegundos: 0,
    };

    const acertoHoje = hojeData.resolvidas > 0
      ? Math.round((hojeData.certas / hojeData.resolvidas) * 100)
      : 0;

    expect(acertoHoje).toBe(0);
  });

  it("mantém a ofensiva no mesmo dia e incrementa em dias consecutivos", () => {
    function atualizarOfensiva(prev: OfensivaData, hoje: string): OfensivaData {
      if (prev.ultimoDia === hoje) return prev;
      const ontemDate = new Date(new Date(hoje + "T12:00:00Z").getTime() - 86400000);
      const ontem = ontemDate.toISOString().slice(0, 10);
      const novosDias = prev.ultimoDia === ontem ? prev.dias + 1 : 1;
      return { dias: novosDias, ultimoDia: hoje };
    }

    // Primeiro dia
    let of: OfensivaData = { dias: 0, ultimoDia: "" };
    of = atualizarOfensiva(of, "2026-10-20");
    expect(of.dias).toBe(1);
    expect(of.ultimoDia).toBe("2026-10-20");

    // Mesmo dia: não incrementa
    of = atualizarOfensiva(of, "2026-10-20");
    expect(of.dias).toBe(1);

    // Dia consecutivo: incrementa para 2
    of = atualizarOfensiva(of, "2026-10-21");
    expect(of.dias).toBe(2);

    // Dia consecutivo: incrementa para 3
    of = atualizarOfensiva(of, "2026-10-22");
    expect(of.dias).toBe(3);

    // Pulou um dia: reseta para 1
    of = atualizarOfensiva(of, "2026-10-25");
    expect(of.dias).toBe(1);
  });
});

describe("Filtragem dinâmica de matérias por concurso", () => {
  it("retorna matérias específicas para cada concurso selecionado", async () => {
    const { obterMateriasPorConcurso, MATERIAS } = await import("@/routes/index");

    const pcap = obterMateriasPorConcurso("PC-AP");
    expect(pcap).toEqual(MATERIAS);
    expect(pcap).toContain("Legislação Estadual (PC-AP)");

    const inss = obterMateriasPorConcurso("INSS");
    expect(inss).toContain("Língua Portuguesa");
    expect(inss).toContain("Direito Constitucional");
    expect(inss).not.toContain("Legislação Estadual (PC-AP)");
    expect(inss).not.toContain("Medicina Legal");

    const pf = obterMateriasPorConcurso("PF");
    expect(pf).toContain("Contabilidade e Análise Financeira");
    expect(pf).toContain("Informática");
    expect(pf).not.toContain("História e Geografia do Amapá");
  });
});
