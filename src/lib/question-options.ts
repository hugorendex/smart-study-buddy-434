/** Shuffle option indices, then carry the answer with its original text. */
export function shuffleQuestion<T extends { alternativas: string[]; correta: number }>(question: T, random = Math.random): T {
  const indices = question.alternativas.map((_, index) => index);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const left = indices[i];
    const right = indices[j];
    if (left === undefined || right === undefined) continue;
    indices[i] = right;
    indices[j] = left;
  }
  return { ...question, alternativas: indices.map((index) => question.alternativas[index] ?? ""), correta: indices.indexOf(question.correta) };
}