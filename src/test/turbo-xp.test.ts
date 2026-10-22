import { describe, expect, it } from "vitest";
import { calcularXP } from "@/components/Turbo";

describe("XP", () => {
  it("acerto vale 10 XP e erro vale 2 XP", () => {
    expect(calcularXP({ Penal: { certas: 3, total: 5 } }, 0, 0).xp).toBe(34);
  });
  it("começa no nível 1", () => {
    expect(calcularXP({}, 0, 0).nivel).toBe(1);
  });
});
