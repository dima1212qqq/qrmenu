import { createEmbedding } from "@/lib/embeddings";

interface QdrantSearchResult {
  id: string;
  score: number;
  payload?: {
    dishId?: string;
    name?: string;
    price?: number;
    image?: string | null;
    text?: string;
    tags?: string[];
    categoryIds?: string[];
  };
}

interface SearchOptions {
  limit?: number;
  scoreThreshold?: number;
  excludeDishIds?: Set<string>;
}

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (QDRANT_API_KEY) {
    headers["api-key"] = QDRANT_API_KEY;
  }
  return headers;
}

/**
 * Search a single Qdrant collection.
 */
async function searchCollection(
  collectionName: string,
  query: string,
  limit: number,
  scoreThreshold: number
): Promise<QdrantSearchResult[]> {
  if (!QDRANT_URL) return [];

  const queryVector = await createEmbedding(query);

  const url = `${QDRANT_URL}/collections/${collectionName}/points/search`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      vector: queryVector,
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Qdrant search failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { result?: QdrantSearchResult[] };
  return data.result || [];
}

/**
 * Search multiple menu collections in Qdrant.
 * Returns merged, deduplicated, sorted results.
 */
export async function qdrantSearchDishes(
  menuIds: string[],
  query: string,
  options: SearchOptions = {}
): Promise<
  {
    dishId: string;
    name: string;
    price: number;
    image: string | null;
    description: string | null;
    categoryNames: string[];
    tagNames: string[];
    score: number;
  }[]
> {
  const { limit = 10, scoreThreshold = 0.25, excludeDishIds = new Set<string>() } = options;

  if (!QDRANT_URL || menuIds.length === 0) {
    return [];
  }

  const perCollectionLimit = Math.max(limit, Math.ceil(limit / Math.max(menuIds.length, 1)));

  const searchPromises = menuIds.map(async (menuId) => {
    const collectionName = `menu_${menuId}`;
    try {
      const results = await searchCollection(collectionName, query, perCollectionLimit, scoreThreshold);
      return results.map((r) => ({
        dishId: r.payload?.dishId || String(r.id),
        name: r.payload?.name || "",
        price: r.payload?.price || 0,
        image: r.payload?.image ?? null,
        description: r.payload?.text || null,
        categoryNames: r.payload?.categoryIds || [],
        tagNames: r.payload?.tags || [],
        score: r.score,
      }));
    } catch (err) {
      console.warn(`[Qdrant] Search failed for collection ${collectionName}:`, err);
      return [];
    }
  });

  const allResults = (await Promise.all(searchPromises)).flat();

  // Deduplicate by dishId, keep highest score
  const seen = new Map<string, typeof allResults[0]>();
  for (const r of allResults) {
    if (excludeDishIds.has(r.dishId)) continue;
    const existing = seen.get(r.dishId);
    if (!existing || existing.score < r.score) {
      seen.set(r.dishId, r);
    }
  }

  const unique = Array.from(seen.values());
  unique.sort((a, b) => b.score - a.score);

  return unique.slice(0, limit);
}

/**
 * Upsert vectors into Qdrant collection.
 * Uses batch upsert for efficiency.
 */
export async function qdrantUpsertVectors(
  collectionName: string,
  points: { id: string; vector: number[]; payload: Record<string, unknown> }[]
): Promise<void> {
  if (!QDRANT_URL) return;

  const url = `${QDRANT_URL}/collections/${collectionName}/points`;
  const batchSize = 100;

  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    const res = await fetch(url, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ points: batch }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown error");
      throw new Error(`Qdrant upsert failed: ${res.status} ${text}`);
    }
  }
}

/**
 * Ensure collection exists.
 */
export async function qdrantEnsureCollection(
  collectionName: string,
  vectorSize: number
): Promise<void> {
  if (!QDRANT_URL) return;

  const url = `${QDRANT_URL}/collections/${collectionName}`;

  // First check if collection exists
  const getRes = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });

  if (getRes.ok) {
    return; // Collection already exists
  }

  const res = await fetch(url, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({
      vectors: {
        size: vectorSize,
        distance: "Cosine",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Qdrant create collection failed: ${res.status} ${text}`);
  }
}
