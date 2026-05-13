import { getEmbeddingProvider } from "@/lib/llm";

export interface DishEmbedding {
  dishId: string;
  text: string;
  name: string;
  price: number;
  image?: string | null;
  tags: string[];
  categoryIds: string[];
}

export async function createEmbedding(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  const result = await provider.createEmbedding(text);
  return result.embedding;
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const provider = getEmbeddingProvider();
  const results = await provider.createEmbeddings(texts);
  return results.map((r) => r.embedding);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function buildDishText(
  name: string,
  description: string | null,
  tags: string[],
  categoryNames: string[],
  aiContext?: string | null
): string {
  const parts: string[] = [name];
  const mainText = aiContext || description;
  if (mainText) {
    parts.push(mainText);
  }
  if (categoryNames.length > 0) {
    parts.push(`категория: ${categoryNames.join(", ")}`);
  }
  if (tags.length > 0) {
    parts.push(`теги: ${tags.join(", ")}`);
  }
  return parts.join(". ");
}

export async function searchDishes(
  dishes: DishEmbedding[],
  query: string,
  limit: number = 5
): Promise<DishEmbedding[]> {
  const queryEmbedding = await createEmbedding(query);

  const dishTexts = dishes.map((d) => d.text);
  const dishEmbeddings = await createEmbeddings(dishTexts);

  const scored = dishes.map((dish, i) => ({
    dish,
    score: cosineSimilarity(queryEmbedding, dishEmbeddings[i]),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.dish);
}
