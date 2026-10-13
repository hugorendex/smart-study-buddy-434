import { describe, expect, it } from "vitest";
import { shuffleQuestion } from "@/lib/question-options";

describe("Question options", () => {
  it("keeps the correct text and all options when the answer moves", () => {
    for (let correct = 0; correct < 5; correct++) {
      const original = { id: "same-question", alternativas: ["one", "two", "three", "four", "five"], correta: correct };
      const shuffled = shuffleQuestion(original, () => 0);
      expect(shuffled.alternativas[shuffled.correta]).toBe(original.alternativas[correct]);
      expect([...shuffled.alternativas].sort()).toEqual([...original.alternativas].sort());
      expect(shuffled.id).toBe(original.id);
      expect(original.alternativas).toEqual(["one", "two", "three", "four", "five"]);
    }
  });
  it("allows the correct answer in every position, including the last", () => {
    const positions = new Set<number>();
    for (let choice = 0; choice < 5; choice++) {
      let call = 0;
      positions.add(shuffleQuestion({ alternativas: ["correct", "b", "c", "d", "e"], correta: 0 }, () => call++ === 0 ? (choice + 0.1) / 5 : 0.99).correta);
    }
    expect([...positions].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});