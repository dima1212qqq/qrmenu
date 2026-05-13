import { createEmbedding, createEmbeddings, cosineSimilarity, buildDishText } from "@/lib/embeddings";
import { qdrantSearchDishes } from "@/lib/qdrant";
import type { Dish, Category, Tag, DishCategory } from "@/lib/types";

export interface SearchResult {
  dishId: string;
  name: string;
  price: number;
  image: string | null;
  description: string | null;
  categoryName: string;
  tagName: string | null;
  score: number;
  confidence: "high" | "medium" | "low";
}

export interface SearchOptions {
  limit?: number;
  minScore?: number;
  excludeDishIds?: Set<string>;
  preferCategories?: string[];
  menuIds?: string[];
  timeOfDay?: "morning" | "noon" | "evening" | "night";
  orderCounts?: Map<string, number>;
}

const DEFAULT_LIMIT = 7;
const DEFAULT_MIN_SCORE = 0.25;

const CHARACTERISTIC_MAP: Record<string, string[]> = {
  "остр": ["пикантн", "жгуч", "чили", "перец", "специи", "остр", "халапеньо", "табаско", "васаби", "имбирь"],
  "сытн": ["плотн", "калорийн", "больш", "мясн", "тяжёл", "наварист", "порци", "сытн", "большой"],
  "лёгк": ["легк", "диетич", "низкокалор", "салат", "овощн", "нежирн", "воздушн"],
  "сладк": ["десерт", "торт", "морожен", "сладк", "шоколад", "выпечк", "кекс", "блин", "варень", "крем"],
  "мясн": ["мяс", "говядин", "свинин", "куриц", "стейк", "бургер", "котлет", "шашлык", "бекон", "ветчин", "колбас", "сосиск"],
  "рыбн": ["рыб", "лосос", "тун", "морепродукт", "креветк", "кальмар", "краб", "устриц", "миди"],
  "веган": ["растительн", "без мяса", "овощ", "веган", "тофу", "боб"],
  "вегетариан": ["без мяса", "овощ", "сыр", "творог", "вегетариан"],
  "горяч": ["горяч", "тёпл", "тепл", "суп", "борщ", "жарк"],
  "холодн": ["холодн", "прохладн", "окрошк", "морожен", "холод"],
  "напитк": ["напитк", "сок", "кофе", "чай", "лимонад", "коктейл", "пив", "вин", "вод", "латте", "капучин", "эспресс"],
  "десерт": ["десерт", "сладк", "торт", "морожен", "чизкейк", "пирож", "тирамису", "пудинг", "мусс"],
  "завтрак": ["завтрак", "яичниц", "блин", "каш", "омлет", "сырник", "тост"],
  "суп": ["суп", "борщ", "щи", "окрош", "бульон", "солянк", "уха", "крем-суп"],
  "салат": ["салат", "цезарь", "греческ", "овощн"],
  "пицц": ["пицц", "маргарит", "пепперон", "четыр", "сырн"],
  "бургер": ["бургер", "гамбургер", "чизбургер", "фастфуд"],
  "паст": ["паст", "макарон", "спагетт", "карбонара", "феттучин", "равиол", "лазань"],
  "закуск": ["закуск", "тапас", "начос", "чипс", "брускетт", "тартар"],
  "гарнир": ["гарнир", "картошк", "картофел", "рис", "гречк", "кукуруз"],
  "соус": ["соус", "подлив", "заправк", "дрезинг", "чесночн", "томатн"],
  "дет": ["дет", "без острых", "нежн", "порци", "маленьк"],
};

function enrichQuery(query: string): string {
  const lower = query.toLowerCase().trim();
  const expansions = new Set<string>([query]);

  for (const [keyword, synonyms] of Object.entries(CHARACTERISTIC_MAP)) {
    if (lower.includes(keyword)) {
      for (const s of synonyms.slice(0, 5)) {
        expansions.add(s);
      }
    }
  }

  if (expansions.size <= 1) return query;

  return Array.from(expansions).join(" ");
}

function keywordMatchScore(query: string, dishText: string): number {
  const lower = query.toLowerCase().trim();
  const textLower = dishText.toLowerCase();
  let score = 0;

  let matchedCategory = false;
  for (const [keyword, synonyms] of Object.entries(CHARACTERISTIC_MAP)) {
    if (lower.includes(keyword)) {
      const allTerms = [keyword, ...synonyms];
      for (const term of allTerms) {
        if (textLower.includes(term)) {
          score += 0.35;
          matchedCategory = true;
          break;
        }
      }
      if (matchedCategory) break;
    }
  }

  const queryWords = lower.split(/\s+/).filter((w) => w.length > 2);
  for (const word of queryWords) {
    if (textLower.includes(word)) {
      score += 0.15;
    }
  }

  return Math.min(score, 1.0);
}

interface CacheEntry {
  embedding: number[];
  lastUsed: number;
}
const EMBEDDING_CACHE_LIMIT = 2000;
const embeddingCache = new Map<string, CacheEntry>();

function evictOldestIfNeeded() {
  if (embeddingCache.size <= EMBEDDING_CACHE_LIMIT) return;
  const toDrop = Math.ceil(EMBEDDING_CACHE_LIMIT * 0.1);
  const entries = Array.from(embeddingCache.entries()).sort(
    (a, b) => a[1].lastUsed - b[1].lastUsed
  );
  for (let i = 0; i < toDrop && i < entries.length; i++) {
    embeddingCache.delete(entries[i][0]);
  }
}

async function getDishEmbeddings(texts: string[]): Promise<number[][]> {
  const now = Date.now();
  const result: (number[] | null)[] = new Array(texts.length).fill(null);
  const missingIdx: number[] = [];
  const missingTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const cached = embeddingCache.get(texts[i]);
    if (cached) {
      cached.lastUsed = now;
      result[i] = cached.embedding;
    } else {
      missingIdx.push(i);
      missingTexts.push(texts[i]);
    }
  }

  if (missingTexts.length > 0) {
    const fresh = await createEmbeddings(missingTexts);
    for (let i = 0; i < missingIdx.length; i++) {
      const idx = missingIdx[i];
      result[idx] = fresh[i];
      embeddingCache.set(texts[idx], { embedding: fresh[i], lastUsed: now });
    }
    evictOldestIfNeeded();
  }

  return result as number[][];
}

function getTimeOfDay(hour: number): "morning" | "noon" | "evening" | "night" {
  if (hour < 11) return "morning";
  if (hour < 16) return "noon";
  if (hour < 22) return "evening";
  return "night";
}

/** Boost score for categories that match the time of day */
function timeOfDayBoost(
  dishCats: string[],
  timeOfDay?: "morning" | "noon" | "evening" | "night"
): number {
  if (!timeOfDay) return 0;

  const catLower = dishCats.map((c) => c.toLowerCase());
  const boostTerms: Record<string, string[]> = {
    morning: ["завтрак", "кофе", "чай", "капучино", "латте", "эспрессо", "блины", "омлет", "сырники", "тост"],
    noon: ["обед", "суп", "бизнес", "ланч", "первое", "второе"],
    evening: ["ужин", "горячее", "мясо", "рыба", "паста", "пицца"],
    night: ["закуска", "бургер", "шаурма", "кебаб", "пончик"],
  };

  const terms = boostTerms[timeOfDay] || [];
  for (const term of terms) {
    if (catLower.some((c) => c.includes(term))) return 0.08;
  }
  return 0;
}

/** Boost score for popular dishes */
function popularityBoost(
  dishId: string,
  orderCounts?: Map<string, number>
): number {
  if (!orderCounts || orderCounts.size === 0) return 0;
  const count = orderCounts.get(dishId) || 0;
  if (count >= 10) return 0.1;
  if (count >= 5) return 0.06;
  if (count >= 1) return 0.03;
  return 0;
}

export async function findRelevantDishes(
  query: string,
  dishes: Dish[],
  categories: Category[],
  tags: Tag[],
  dishCategories: DishCategory[],
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    limit = DEFAULT_LIMIT,
    minScore = DEFAULT_MIN_SCORE,
    excludeDishIds = new Set<string>(),
    preferCategories = [],
    menuIds,
    timeOfDay,
    orderCounts,
  } = options;

  const availableDishes = dishes.filter(
    (d) => d.is_available !== false && !excludeDishIds.has(d.id)
  );

  if (availableDishes.length === 0 || !query.trim()) {
    return [];
  }

  // --- Phase 1: Try Qdrant search (fast, O(1) per collection) ---
  let qdrantResults: SearchResult[] = [];

  if (menuIds && menuIds.length > 0) {
    try {
      const rawQdrant = await qdrantSearchDishes(menuIds, query, {
        limit: limit + 3,
        scoreThreshold: minScore,
        excludeDishIds,
      });

      // Map Qdrant results to SearchResult, enriching with full dish data
      qdrantResults = rawQdrant
        .map((r) => {
          const fullDish = dishes.find((d) => d.id === r.dishId);
          if (!fullDish) return null;
          return {
            dishId: r.dishId,
            name: fullDish.name,
            price: fullDish.price,
            image: fullDish.image || null,
            description: fullDish.description || null,
            categoryName: r.categoryNames[0] || "",
            tagName: r.tagNames[0] || null,
            score: r.score,
            confidence:
              r.score >= 0.65 ? "high" : r.score >= 0.45 ? "medium" : "low",
          } as SearchResult;
        })
        .filter((r): r is SearchResult => r !== null);

      // Boost by time of day and popularity
      for (const r of qdrantResults) {
        let boost = 0;
        const dc = dishCategories
          .filter((dc) => dc.dish_id === r.dishId)
          .map((dc) => categories.find((c) => c.id === dc.category_id)?.name || "");
        boost += timeOfDayBoost(dc, timeOfDay);
        boost += popularityBoost(r.dishId, orderCounts);
        r.score = Math.min(1, r.score + boost);
      }

      // Re-sort after boosting and filter duplicates
      const seen = new Set<string>();
      qdrantResults = qdrantResults
        .filter((r) => {
          if (seen.has(r.dishId)) return false;
          seen.add(r.dishId);
          return true;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      if (qdrantResults.length > 0) {
        return qdrantResults;
      }
    } catch (err) {
      console.warn("[AI Search] Qdrant search failed, falling back to local:", err);
      // Fall through to local search
    }
  }

  // --- Phase 2: Local embedding + cosine search (fallback) ---

  const dishData = availableDishes.map((dish) => {
    const dishCats = dishCategories
      .filter((dc) => dc.dish_id === dish.id)
      .map((dc) => categories.find((c) => c.id === dc.category_id)?.name)
      .filter(Boolean) as string[];
    const dishTag = dish.tag_id ? tags.find((t) => t.id === dish.tag_id) : null;
    const text = buildDishText(
      dish.name,
      dish.description || null,
      dishTag ? [dishTag.name] : [],
      dishCats,
      dish.ai_context || null
    );
    return { dish, text, dishCats, dishTagName: dishTag?.name || null };
  });

  const enrichedQuery = enrichQuery(query);

  let queryEmbedding: number[];
  let dishEmbeddings: number[][];

  try {
    const dishTexts = dishData.map((d) => d.text);
    [queryEmbedding, dishEmbeddings] = await Promise.all([
      createEmbedding(enrichedQuery),
      getDishEmbeddings(dishTexts),
    ]);
  } catch (error) {
    console.error("[AI Search] Embedding creation failed:", error);
    return [];
  }

  const scored = dishData.map((data, i) => {
    let semanticScore = cosineSimilarity(queryEmbedding, dishEmbeddings[i]);

    if (preferCategories.length > 0) {
      const hasPreferredCategory = data.dishCats.some((c) =>
        preferCategories.includes(c)
      );
      if (hasPreferredCategory) {
        semanticScore = Math.min(1, semanticScore * 1.15);
      }
    }

    const kwScore = keywordMatchScore(query, data.text);

    let combinedScore =
      kwScore > 0
        ? Math.min(1, semanticScore * 0.6 + kwScore * 0.4)
        : semanticScore;

    // Apply time-of-day and popularity boosts (Phase 2 additions)
    combinedScore += timeOfDayBoost(data.dishCats, timeOfDay);
    combinedScore += popularityBoost(data.dish.id, orderCounts);
    combinedScore = Math.min(1, combinedScore);

    return { ...data, score: combinedScore, semanticScore };
  });

  scored.sort((a, b) => b.score - a.score);

  let results = scored.filter((item) => item.score >= minScore);

  if (results.length === 0) {
    const fallbackMinScore = 0.15;
    results = scored.filter((item) => item.score >= fallbackMinScore);
  }

  const diversified: typeof results = [];
  const categoryCount: Record<string, number> = {};
  const remaining: typeof results = [];

  for (const item of results) {
    const cat = item.dishCats[0] || "_uncategorized";
    if ((categoryCount[cat] || 0) < 2) {
      diversified.push(item);
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    } else {
      remaining.push(item);
    }
    if (diversified.length >= limit) break;
  }
  for (const item of remaining) {
    if (diversified.length >= limit) break;
    diversified.push(item);
  }

  results = diversified;

  if (results.length === 0) {
    const fallbackMinScore = 0.15;
    results = scored.filter((item) => item.score >= fallbackMinScore);
  }

  return results.slice(0, limit).map((item) => {
    const confidence: "high" | "medium" | "low" =
      item.score >= 0.65 ? "high" : item.score >= 0.45 ? "medium" : "low";

    return {
      dishId: item.dish.id,
      name: item.dish.name,
      price: item.dish.price,
      image: item.dish.image || null,
      description: item.dish.description || null,
      categoryName: item.dishCats[0] || "",
      tagName: item.dishTagName,
      score: item.score,
      confidence,
    };
  });
}
