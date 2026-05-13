import { NextRequest, NextResponse } from "next/server";
import {
  getOrganizationBySlug,
  getMenus,
  getCategories,
  getDishes,
  getDishCategoriesForOrganization,
  getTags,
  getDishOrderCounts,
} from "@/lib/db";
import { getChatProvider } from "@/lib/llm";
import { findRelevantDishes, type SearchResult } from "@/lib/ai-search";
import { buildSystemPrompt, type DishContext, type CartContext } from "@/lib/ai-prompt";
import { checkRateLimit, createRateLimitKey } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import type { Category, Dish, DishCategory, Tag } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CartItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ChatRequest {
  orgSlug: string;
  menuId?: string;
  messages: ChatMessage[];
  sessionId?: string;
  cart?: CartItem[];
  recentRecommendations?: { dishId: string; name: string }[];
}

interface LLMDish {
  id: string;
  confidence: "high" | "medium" | "low";
}

interface LLMSuggestion {
  label: string;
  prompt: string;
}

interface LLMResponse {
  text: string;
  dishes: LLMDish[];
  suggestions: LLMSuggestion[];
}

const MAX_RETRIES = 2;
const MAX_CONTEXT_DISHES = 7;
const LLM_TIMEOUT_MS = 12000;
const MAX_HISTORY_MESSAGES = 10;
const FALLBACK_ASK_CLARIFY =
  "Расскажите чуть подробнее — что сейчас хочется? Что-то сытное или лёгкое, с мясом или без, может быть определённую кухню? 😊";
const FALLBACK_GENERIC =
  "Погодите, я подберу что-нибудь пока размышляю над вашим выбором...";

function logChat(event: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production" || process.env.AI_CHAT_DEBUG === "1") {
    console.log(`[AI Chat] ${event}`, data ? JSON.stringify(data) : "");
  }
}

function extractLastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return messages[i].content;
    }
  }
  return "";
}

function trimHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages;
  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
  const firstUserIdx = trimmed.findIndex((m) => m.role === "user");
  return firstUserIdx > 0 ? trimmed.slice(firstUserIdx) : trimmed;
}

function buildDishContext(
  searchResults: SearchResult[],
  dishes: Dish[],
  categories: Category[],
  tags: Tag[],
  dishCategories: DishCategory[],
  options: { maxDishes?: number } = {}
): DishContext[] {
  const { maxDishes = 20 } = options;

  if (searchResults.length > 0) {
    return searchResults.map((r) => {
      const fullDish = dishes.find((d) => d.id === r.dishId);
      const desc = fullDish?.ai_context || r.description || null;
      return {
        id: r.dishId,
        name: r.name,
        price: r.price,
        description: desc,
        detailedDescription: fullDish?.ai_detailed_context || null,
        categoryName: r.categoryName,
        tagName: r.tagName,
        confidence: r.confidence,
        isAvailable: fullDish ? fullDish.is_available !== false : true,
        calories: fullDish?.calories ?? null,
        weight: fullDish?.weight ?? null,
        allergens: fullDish?.allergens ?? null,
      };
    });
  }

  const available = dishes.filter((d) => d.is_available !== false);
  const catMap = new Map<string, Dish[]>();
  for (const d of available) {
    const dcList = dishCategories.filter((dc) => dc.dish_id === d.id);
    const catName = dcList.length > 0
      ? (categories.find((c) => c.id === dcList[0].category_id)?.name || "_uncategorized")
      : "_uncategorized";
    if (!catMap.has(catName)) catMap.set(catName, []);
    catMap.get(catName)!.push(d);
  }

  const sampled: Dish[] = [];
  const perCat = Math.max(1, Math.floor(maxDishes / Math.max(catMap.size, 1)));
  const catEntries = Array.from(catMap.entries());
  for (const [, catDishes] of catEntries) {
    sampled.push(...catDishes.slice(0, perCat));
    if (sampled.length >= maxDishes) break;
  }

  return sampled.map((d) => {
    const dcList = dishCategories.filter((dc) => dc.dish_id === d.id);
    const catName = dcList.length > 0
      ? (categories.find((c) => c.id === dcList[0].category_id)?.name || "")
      : "";
    const dishTag = d.tag_id ? tags.find((t) => t.id === d.tag_id) : null;
    return {
      id: d.id,
      name: d.name,
      price: d.price,
      description: d.ai_context || d.description || null,
      detailedDescription: d.ai_detailed_context || null,
      categoryName: catName,
      tagName: dishTag?.name || null,
      confidence: "high" as const,
      isAvailable: true,
      calories: d.calories ?? null,
      weight: d.weight ?? null,
      allergens: d.allergens ?? null,
    };
  });
}

function stripReasoning(text: string): string {
  // MiniMax specific: reasoning is wrapped between `\n` markers and separated by `\n\n`
  const reasonEndIdx = text.search(/\n\s+\n\s*\n/);
  if (reasonEndIdx !== -1) {
    return text.slice(reasonEndIdx).replace(/^\n+/, "").trim();
  }
  if (text.startsWith("  \n") || text.startsWith("\n ")) {
    const idx = text.search(/\n\s*\n\s*[^\s]/);
    if (idx !== -1) {
      return text.slice(idx).trim();
    }
  }
  return text
    .replace(/\s*\n?\s*<think>[\s\S]*?<\/think>\s*\n?\s*/g, "\n")
    .replace(/\s*\n?\s*\[think\][\s\S]*?\[\/think\]\s*\n?\s*/g, "\n")
    .replace(/\s*\n?\s*<reasoning>[\s\S]*?<\/reasoning>\s*\n?\s*/g, "\n")
    .replace(/\s*\n?\s*\[reasoning\][\s\S]*?\[\/reasoning\]\s*\n?\s*/g, "\n")
    .replace(/\s*\n?\s*\breasoning:\s*[\s\S]*?(?=\n\n|\n[A-Z]|$)/gi, "\n")
    .trim();
}

function extractJson(raw: string): string {
  const clean = stripReasoning(raw);

  // 1. MiniMax [TOOL_CALL] block
  const toolCallBlock = clean.match(/\[TOOL_CALL\]([\s\S]*?)\[\/TOOL_CALL\]/);
  if (toolCallBlock) {
    const inner = toolCallBlock[1];
    const jsonToTextMatch = inner.match(/\[json_to_text\s*=\s*(\{[\s\S]*?)\]/);
    if (jsonToTextMatch) {
      const candidate = jsonToTextMatch[1];
      let depth = 0, inString = false, escape = false, end = candidate.length;
      for (let i = 0; i < candidate.length; i++) {
        const ch = candidate[i];
        if (escape) { escape = false; continue; }
        if (ch === "\\") { escape = true; continue; }
        if (ch === '"' && !inString) { inString = true; continue; }
        if (ch === '"' && inString) { inString = false; continue; }
        if (!inString) {
          if (ch === "{" || ch === "[") depth++;
          if (ch === "}" || ch === "]") {
            depth--;
            if (depth === 0) { end = i + 1; break; }
          }
        }
      }
      const trimmed = candidate.slice(0, end).trim();
      if (trimmed.length > 0 && trimmed.startsWith("{")) return trimmed;
    }
    const objMatch = inner.match(/(\{[\s\S]*?\})/);
    if (objMatch) {
      const candidate = objMatch[1];
      let depth = 0, inString = false, escape = false, end = candidate.length;
      for (let i = 0; i < candidate.length; i++) {
        const ch = candidate[i];
        if (escape) { escape = false; continue; }
        if (ch === "\\") { escape = true; continue; }
        if (ch === '"' && !inString) { inString = true; continue; }
        if (ch === '"' && inString) { inString = false; continue; }
        if (!inString) {
          if (ch === "{" || ch === "[") depth++;
          if (ch === "}" || ch === "]") {
            depth--;
            if (depth === 0) { end = i + 1; break; }
          }
        }
      }
      const trimmed = candidate.slice(0, end).trim();
      if (trimmed.length > 0 && trimmed.startsWith("{")) return trimmed;
    }
  }

  // 2. Markdown ```json ... ``` block
  const markdownMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch) {
    const inner = markdownMatch[1].trim();
    if (inner.startsWith("{")) return inner;
  }

  // 3. Find first JSON-like object/array
  const idx = clean.search(/[{[]/);
  if (idx !== -1) {
    const candidate = clean.slice(idx);
    let depth = 0;
    let inString = false;
    let escape = false;
    let end = candidate.length;
    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"' && !inString) { inString = true; continue; }
      if (ch === '"' && inString) { inString = false; continue; }
      if (!inString) {
        if (ch === "{" || ch === "[") depth++;
        if (ch === "}" || ch === "]") {
          depth--;
          if (depth === 0) { end = i + 1; break; }
        }
      }
    }
    const trimmed = candidate.slice(0, end).trim();
    if (trimmed.length > 0) return trimmed;
  }

  // 4. Inline backtick JSON
  const inlineMatch = clean.match(/`\s*\{[\s\S]*?\}`/);
  if (inlineMatch) {
    const inner = inlineMatch[0].replace(/^`|`$/g, "").trim();
    if (inner.startsWith("{")) return inner;
  }

  return clean.trim();
}

function tryParseJSON(raw: string): Record<string, unknown> | null {
  const jsonText = extractJson(raw);
  try {
    const parsed = JSON.parse(jsonText);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    // ignore
  }
  return null;
}

function parseLLMResponse(raw: string): LLMResponse | null {
  const obj = tryParseJSON(raw);

  if (obj) {
    let text: string | undefined;
    for (const key of ["text", "content", "message", "answer", "response"]) {
      if (typeof obj[key] === "string") {
        text = (obj[key] as string).trim();
        break;
      }
    }
    if (!text) {
      text = "";
    }

    const dishesRaw = Array.isArray(obj.dishes)
      ? obj.dishes
      : Array.isArray(obj.dish)
        ? obj.dish
        : [];
    const dishes: LLMDish[] = dishesRaw
      .filter(
        (d): d is { id: unknown; confidence?: unknown; dish_id?: unknown } =>
          typeof d === "object" && d !== null && ("id" in d || "dish_id" in d)
      )
      .map((d) => {
        const id = typeof d.id === "string" ? d.id : typeof d.dish_id === "string" ? d.dish_id : "";
        const conf =
          d.confidence === "high" ||
          d.confidence === "medium" ||
          d.confidence === "low"
            ? (d.confidence as "high" | "medium" | "low")
            : "medium";
        return { id, confidence: conf };
      })
      .filter((d) => d.id.length > 0);

    const suggestionsRaw = Array.isArray(obj.suggestions)
      ? obj.suggestions
      : [];
    const suggestions: LLMSuggestion[] = suggestionsRaw
      .filter(
        (s): s is { label: unknown; prompt: unknown } =>
          typeof s === "object" && s !== null && ("label" in s || "prompt" in s)
      )
      .map((s) => ({
        label: String(s.label || s.prompt || "").slice(0, 30),
        prompt: String(s.prompt || s.label || ""),
      }))
      .filter((s) => s.label.length > 0 && s.prompt.length > 0);

    if (text.length > 0) {
      return { text, dishes, suggestions };
    }
  }

  // Attempt 2: no valid JSON, but maybe plain text
  const stripped = stripReasoning(raw)
    .replace(/\[TOOL_CALL\][\s\S]*?\[\/TOOL_CALL\]/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\{[\s\S]*?\}/g, "")
    .trim();

  if (stripped.length > 10) {
    return { text: stripped, dishes: [], suggestions: [] };
  }

  return null;
}

function validateLLMResponse(
  response: LLMResponse,
  availableDishIds: Set<string>,
  cartDishIds: Set<string>,
  foundDishIds: Set<string>
): LLMResponse {
  const seen = new Set<string>();
  const validatedDishes: LLMDish[] = [];
  for (const d of response.dishes) {
    if (seen.has(d.id)) continue;
    if (!foundDishIds.has(d.id) && !availableDishIds.has(d.id)) continue;
    if (cartDishIds.has(d.id)) continue;
    seen.add(d.id);
    validatedDishes.push(d);
    if (validatedDishes.length >= 3) break;
  }

  return {
    text: response.text,
    dishes: validatedDishes,
    suggestions: response.suggestions.slice(0, 2),
  };
}

async function callLLM(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<LLMResponse | null> {
  let lastError: unknown = null;
  const provider = getChatProvider();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), LLM_TIMEOUT_MS);

    try {
      const result = await provider.chatCompletion({
        messages,
        max_tokens: 600,
        temperature: attempt === 0 ? 0.7 : 0.3,
        response_format: { type: "json_object" },
        signal: abortController.signal,
      });

      logChat("llm_raw", { raw: result.text.slice(0, 2000), provider: provider.name });

      const parsed = parseLLMResponse(result.text);
      if (parsed) return parsed;
      lastError = new Error("Invalid LLM JSON response");
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  logChat("llm_failed", {
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });
  return null;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: ChatRequest = await request.json();
    const { orgSlug, menuId, messages, cart, recentRecommendations, sessionId } = body;

    if (!orgSlug || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = createRateLimitKey(ip, sessionId);
    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: Math.ceil(rateLimit.resetIn / 1000) },
        {
          status: 429,
          headers: { "Retry-After": Math.ceil(rateLimit.resetIn / 1000).toString() },
        }
      );
    }

    const organization = await getOrganizationBySlug(orgSlug);
    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const menus = await getMenus(organization.id);
    if (!menus || menus.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const targetMenuIds = menuId && menus.some((m) => m.id === menuId)
      ? [menuId]
      : menus.map((m) => m.id);

    const [categoriesResult, dishesResult, dishCategories, tagsResult] =
      await Promise.all([
        Promise.all(targetMenuIds.map((id) => getCategories(id))).then((cats) => cats.flat()),
        Promise.all(targetMenuIds.map((id) => getDishes(id))).then((ds) => ds.flat()),
        getDishCategoriesForOrganization(organization.id),
        getTags(organization.id),
      ]);

    const categories: Category[] = categoriesResult;
    const dishes: Dish[] = dishesResult;
    const tags: Tag[] = tagsResult;
    const availableDishes = dishes.filter((d) => d.is_available !== false);

    // Fetch order counts for popularity boost
    const orderCounts = await getDishOrderCounts(
      availableDishes.map((d) => d.id),
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    // Determine time-of-day
    const currentHour = new Date().getHours();
    const timeOfDay: "morning" | "noon" | "evening" | "night" =
      currentHour < 11 ? "morning" : currentHour < 16 ? "noon" : currentHour < 22 ? "evening" : "night";

    // --- Phase 1: Semantic search (RAG, instant) ---
    const lastUserMessage = extractLastUserMessage(messages);
    const cartDishIds = new Set((cart || []).map((item) => item.dishId));
    const excludeIds = new Set<string>(cartDishIds);

    let searchResults: SearchResult[] = [];

    if (lastUserMessage.trim().length > 2 && availableDishes.length > 0) {
      try {
        searchResults = await findRelevantDishes(
          lastUserMessage,
          dishes,
          categories,
          tags,
          dishCategories,
          {
            limit: MAX_CONTEXT_DISHES,
            minScore: 0.25,
            excludeDishIds: excludeIds,
            menuIds: targetMenuIds,
            timeOfDay,
            orderCounts,
          }
        );
      } catch (error) {
        logChat("search_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        searchResults = [];
      }
    }

    // --- Phase 2: Build search result dishes (always sent immediately) ---
    const foundDishIds = new Set(searchResults.map((r) => r.dishId));
    const availableDishIds = new Set(availableDishes.map((d) => d.id));

    const searchResultDishesRaw = searchResults
      .filter((r) => !cartDishIds.has(r.dishId) && availableDishIds.has(r.dishId))
      .slice(0, 5)
      .map((r) => {
        const dish = dishes.find((d) => d.id === r.dishId);
        return {
          id: r.dishId,
          name: r.name,
          price: r.price,
          image: dish?.image ?? null,
          description: dish?.description ?? null,
          confidence: r.confidence,
        };
      });

    const isAllLowConfidence =
      searchResults.length > 0 && searchResults.every((r) => r.confidence === "low");

    // --- Phase 3: Build prompt and call LLM ---
    const dishContext: DishContext[] = buildDishContext(
      searchResults,
      dishes,
      categories,
      tags,
      dishCategories,
      { maxDishes: MAX_CONTEXT_DISHES }
    );

    const cartContext: CartContext | undefined =
      cart && cart.length > 0
        ? {
            items: cart.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              price: i.price,
            })),
            total: cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
          }
        : undefined;

    const systemContent = buildSystemPrompt({
      dishes: dishContext,
      cart: cartContext,
      recentRecommendations,
      isAllLowConfidence,
      isVagueQuery:
        searchResults.length === 0 &&
        lastUserMessage.trim().length > 3 &&
        lastUserMessage.split(" ").length <= 4,
      orderCounts,
    });

    const trimmedHistory = trimHistory(messages);
    const openaiMessages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: systemContent },
      ...trimmedHistory.map((m) => ({
        role: m.role,
        content: String(m.content || ""),
      })),
    ];

    // --- Phase 4: Send search_results instantly, then LLM response ---
    const encoder = new TextEncoder();
    let llmResult: LLMResponse | null = null;
    let errorOccurred = false;

    const stream = new ReadableStream({
      async start(controller) {
        const jsonLine = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

        // 1. Send search_results instantly (Phase 1)
        controller.enqueue(
          jsonLine({
            type: "search_results",
            dishes: searchResultDishesRaw,
            isAllLowConfidence,
            meta: { searchResultsCount: searchResults.length },
          })
        );

        // 2. Call LLM asynchronously and stream its response
        try {
          llmResult = await callLLM(openaiMessages);

          if (llmResult) {
            const validated = validateLLMResponse(
              llmResult,
              availableDishIds,
              cartDishIds,
              foundDishIds
            );

            const llmDishes = validated.dishes
              .map((d) => {
                const dish = dishes.find((dd) => dd.id === d.id);
                if (!dish) return null;
                return {
                  id: dish.id,
                  name: dish.name,
                  price: dish.price,
                  image: dish.image ?? null,
                  description: dish.description ?? null,
                  confidence: d.confidence,
                };
              })
              .filter((d): d is NonNullable<typeof d> => d !== null);

            // Check if LLM said "clarify" (no dishes or empty text)
            const needsClarification =
              validated.text.length > 10 &&
              (llmDishes.length === 0 || isAllLowConfidence);

            controller.enqueue(
              jsonLine({
                type: "answer",
                text: validated.text || FALLBACK_GENERIC,
                dishes: llmDishes,
                suggestions: validated.suggestions,
                needsClarification,
              })
            );
          } else {
            errorOccurred = true;
            controller.enqueue(
              jsonLine({
                type: "answer",
                text: FALLBACK_GENERIC,
                dishes: searchResultDishesRaw.length > 0 ? searchResultDishesRaw : [],
                suggestions: [],
                needsClarification: false,
                fallback: true,
              })
            );
          }
        } catch (err) {
          errorOccurred = true;
          controller.enqueue(
            jsonLine({
              type: "answer",
              text: FALLBACK_GENERIC,
              dishes: searchResultDishesRaw.length > 0 ? searchResultDishesRaw : [],
              suggestions: [],
              needsClarification: false,
              fallback: true,
            })
          );
        }

        // 3. Done
        const responseTimeMs = Date.now() - startTime;
        controller.enqueue(
          jsonLine({
            type: "done",
            _meta: {
              searchResultsCount: searchResults.length,
              responseTimeMs,
            },
          })
        );

        // 4. Log analytics (async)
        try {
          const recommendedIds = llmResult
            ? (() => {
                const ids: string[] = [];
                const seen = new Set(cartDishIds);
                for (const d of llmResult.dishes) {
                  if (!seen.has(d.id)) {
                    seen.add(d.id);
                    ids.push(d.id);
                  }
                }
                return ids.join(",");
              })()
            : searchResultDishesRaw.map((d) => d.id).join(",");

          await prisma.aiChatLog.create({
            data: {
              organizationId: organization.id,
              sessionId: sessionId || null,
              userMessage: lastUserMessage,
              aiResponsText: llmResult?.text || FALLBACK_GENERIC,
              recommendedDishIds: recommendedIds || null,
              searchResultsCount: searchResults.length,
              responseTimeMs,
              createdAt: BigInt(Date.now()),
            },
          });
        } catch (logError) {
          logChat("analytics_log_failed", {
            error: logError instanceof Error ? logError.message : String(logError),
          });
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logChat("server_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
