import { NextRequest, NextResponse } from "next/server";
import { getMenuWithCategories } from "@/lib/db";
import { openai, buildDishText, searchDishes, type DishEmbedding } from "@/lib/embeddings";
import type { Menu, Category, Dish, Tag, DishCategory } from "@/lib/types";

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
  menuId: string;
  messages: ChatMessage[];
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  relevantDishes: Dish[];
  cart: CartItem[];
}

const SYSTEM_PROMPT = `Ты — вежливый и знающий ассистент в ресторане.
Твоя задача — помочь гостю выбрать блюдо из доступного меню.

Правила:
1. Отвечай кратко и по делу (2-4 предложения)
2. Всегда упоминай цену и название блюда
3. Если запрос размытый — задай уточняющий вопрос
4. Предлагай релевантные блюда из меню
5. Если гость спрашивает про что-то вне меню — вежливо откажи и предложи альтернативу
6. Когда рекомендуешь блюдо, включай его ID в формате [DISH_ID:id] чтобы гость мог добавить в заказ

Стиль общения:
- Дружелюбный, но профессиональный
- Используй эмодзи sparingly (1-2 на сообщение)
- Избегай канцелярита

Меню доступно в контексте. Используй его для ответов.`;

function buildMenuContext(
  dishes: Dish[],
  categories: Category[],
  tags: Tag[],
  dishCategories: DishCategory[]
): string {
  const dishesWithCategories = dishes.map((dish) => {
    const dishCats = dishCategories
      .filter((dc) => dc.dish_id === dish.id)
      .map((dc) => categories.find((c) => c.id === dc.category_id)?.name)
      .filter(Boolean);
    const dishTags = dish.tag_id ? tags.find((t) => t.id === dish.tag_id) : null;
    return {
      dish,
      categories: dishCats as string[],
      tags: dishTags ? [dishTags.name] : [],
    };
  });

  let context = "МЕНЮ РЕСТОРАНА:\n\n";

  for (const { dish, categories, tags } of dishesWithCategories) {
    const text = buildDishText(dish.name, dish.description || null, tags, categories);
    context += `[DISH_ID:${dish.id}] ${dish.name} - ${dish.price}₽\n`;
    context += `   ${text}\n`;
    if (!dish.is_available) {
      context += "   (временно недоступно)\n";
    }
    context += "\n";
  }

  return context;
}

function extractDishIds(text: string): string[] {
  const regex = /\[DISH_ID:([^\]]+)\]/g;
  const ids: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { menuId, messages } = body;

    if (!menuId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const menuData = await getMenuWithCategories(menuId);
    if (!menuData) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const { menu, categories, dishes, dishCategories } = menuData;
    const tags = [] as Tag[];

    const menuContext = buildMenuContext(dishes, categories, tags, dishCategories);
    const systemMessage = {
      role: "system" as const,
      content: `${SYSTEM_PROMPT}\n\n${menuContext}`,
    };

    const availableDishes = dishes.filter((d) => d.is_available !== false);

    const openaiMessages = [systemMessage, ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || "Извините, произошла ошибка.";

    let relevantDishes: Dish[] = [];
    const mentionedDishIds = extractDishIds(responseText);

    if (mentionedDishIds.length > 0) {
      relevantDishes = dishes.filter((d) => mentionedDishIds.includes(d.id));
    } else {
      const dishEmbeddings: DishEmbedding[] = dishes
        .filter((d) => d.is_available !== false)
        .map((dish) => {
          const dishCats = dishCategories
            .filter((dc) => dc.dish_id === dish.id)
            .map((dc) => categories.find((c) => c.id === dc.category_id)?.name)
            .filter(Boolean) as string[];
          const dishTags = dish.tag_id ? tags.find((t) => t.id === dish.tag_id) : null;
          return {
            dishId: dish.id,
            text: buildDishText(dish.name, dish.description || null, dishTags ? [dishTags.name] : [], dishCats),
            name: dish.name,
            price: dish.price,
            image: dish.image || null,
            tags: dishTags ? [dishTags.name] : [],
            categoryIds: dishCats,
          };
        });

      const lastUserMessage = messages.filter((m) => m.role === "user").pop()?.content || "";
      if (lastUserMessage.length > 2) {
        try {
          const searchResults = await searchDishes(dishEmbeddings, lastUserMessage, 3);
          relevantDishes = dishes.filter((d) => searchResults.some((r) => r.dishId === d.id));
        } catch {
          relevantDishes = [];
        }
      }
    }

    return NextResponse.json({
      response: responseText,
      relevantDishes,
      cart: [],
    } as ChatResponse);
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
