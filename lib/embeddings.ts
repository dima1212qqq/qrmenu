import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return response.data.map((item) => item.embedding);
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
  categoryNames: string[]
): string {
  const parts = [
    name,
    description,
    ...tags,
    ...categoryNames,
  ].filter(Boolean);
  return parts.join(", ");
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

export { openai };
