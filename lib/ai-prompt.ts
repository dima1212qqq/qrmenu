export interface DishContext {
  id: string;
  name: string;
  price: number;
  description: string | null;
  detailedDescription?: string | null;
  categoryName: string;
  tagName: string | null;
  confidence: "high" | "medium" | "low";
  isAvailable: boolean;
  calories: number | null;
  weight: string | null;
  allergens: string | null;
}

export interface CartContext {
  items: { name: string; quantity: number; price: number }[];
  total: number;
}

const SYSTEM_PROMPT_BASE = `Ты — помощник в ресторане. Отвечаешь на вопросы гостей о меню и помогаешь с выбором.
Кратко (1-3 предложения), без эмодзи, без канцелярита.
Запоминай предпочтения и отказы из диалога.
НЕ предлагай блюда, если гость не просит совета — отвечай только на его вопрос.`;

const CONTEXT_RULES = `ПРАВИЛА КОНТЕКСТА:
- Рекомендуй ТОЛЬКО блюда из списка БЛЮДА ниже — не придумывай блюда, цены и описания
- Не предлагай блюда из КОРЗИНЫ повторно (их нельзя добавить ещё раз)
- Если гость отказался от блюда — больше не предлагай
- Нет подходящего блюда — скажи честно, попроси уточнить`;

const RESPONSE_FORMAT = `ФОРМАТ ОТВЕТА (строго валидный JSON, ничего вне объекта):
{"text":"ответ гостю (обязательно непустая строка)","dishes":[{"id":"id_из_списка","confidence":"high|medium|low"}],"suggestions":[{"label":"кнопка до 20 симв","prompt":"текст при нажатии"}]}

Правила:
- text: обычный текст для гостя, без разметки. Никогда не пустой.
- dishes: массив рекомендуемых блюд. ПУСТОЙ массив [] если: отвечаешь на вопрос без рекомендации, гость не просит совета, блюдах спрашивают информацию
- id берёшь ТОЛЬКО из списка БЛЮДА
- confidence: high=точно рекомендуешь, medium=возможно подойдёт, low=ближайшее совпадение
- При low/medium формулируй мягко: "возможно, подойдёт…", "из похожего есть…"
- suggestions: 0-2 кнопки для продолжения, label коротким глаголом/фразой`;

const QUERY_TYPE_RULES = `ТИПЫ ЗАПРОСОВ (определяй по смыслу сообщения):
- Информация о блюде ("из чего...", "что внутри...", "есть ли аллергены"): ответь на вопрос, dishes = [], suggestions = []
- Прямая рекомендация ("что посоветуешь", "хочу...", "подскажи что взять"): предложи 1-3 блюда, dishes с id
- Запрос по характеристике ("что-то острое", "сытное", "лёгкое"): предложи подходящие из списка
- Категория ("какие супы есть", "покажи десерты"): перечисли из этой категории, dishes = []
- Сравнение ("что лучше", "чем отличается"): сравни по описаниям, dishes = []
- Вежливость ("спасибо", "ок", "понял"): кратко ответь, dishes = [], suggestions = []`;

const SPECIAL_RULES = `СПЕЦИАЛЬНЫЕ ЗАПРОСЫ:
- Веган: без мяса, птицы, рыбы, яиц, молочных, мёда
- Вегетарианец: без мяса, птицы, рыбы
- Аллергия: уточни аллерген, исключи
- С ребёнком: блюда без острых специй
- Сравнение блюд: опирайся на описания из контекста
- "что к X / чем дополнить X": рекомендуй из ДРУГИХ категорий, не из той же, что X`;

const CLARIFICATION_RULE = `РЕЖИМ УТОЧНЕНИЯ (важно):
Если блюда найдены, но НЕТ точного совпадения (confidence: low) — или запрос слишком короткий и размытый (например "что-нибудь", "не знаю") — НЕ рекомендуй блюда сразу.
Вместо этого:
1. Задай ОДИН уточняющий вопрос (легкое/сытное, острое/сладкое, с мясом/рыбой)
2. dishes = []
3. Добавь suggestions: 2 кнопки для выбора
Пример: text="Расскажите подробнее — что сейчас хочется?", dishes=[], suggestions=[{"label":"Что-то сытное","prompt":"Хочу сытно поесть"},{"label":"Лёгкое блюдо","prompt":"Хочу что-то лёгкое"}]`;

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "утро (завтрак)";
  if (hour < 16) return "обед";
  if (hour < 21) return "ужин";
  return "поздний вечер";
}

export function buildSystemPrompt(context: {
  dishes: DishContext[];
  cart?: CartContext;
  recentRecommendations?: { dishId: string; name: string }[];
  triggerType?: string;
  newItem?: { id: string; name: string };
  isAllLowConfidence?: boolean;
  isVagueQuery?: boolean;
  orderCounts?: Map<string, number>;
}): string {
  const timeOfDay = getTimeOfDay();

  const parts: string[] = [
    SYSTEM_PROMPT_BASE,
    "",
    CONTEXT_RULES,
    "",
    RESPONSE_FORMAT,
    "",
    QUERY_TYPE_RULES,
    "",
    SPECIAL_RULES,
    "",
    CLARIFICATION_RULE,
    "",
    `ВРЕМЯ: сейчас ${timeOfDay}. Учитывай при рекомендациях.`,
  ];

  if (context.isVagueQuery || context.isAllLowConfidence) {
    parts.push(
      "",
      `РЕЖИМ: запрос гостя РАЗМЫТЫЙ или совпадение слабое → задай уточняющий вопрос (1-2 предложения), dishes = [], suggestions = 2 кнопки с вариантами.`
    );
  }

  const allLowConfidence =
    context.dishes.length > 0 &&
    context.dishes.every((d) => d.confidence === "low");

  if (context.dishes.length > 0) {
    if (allLowConfidence) {
      parts.push(
        "",
        "БЛЮДА (точного совпадения нет, ниже — ближайшие варианты; предложи мягко или попроси уточнить):"
      );
    } else if (context.dishes.length > 10) {
      parts.push(
        "",
        "БЛЮДА (полное меню — выбери САМЫЕ подходящие по запросу, максимум 3. Разнообразь по категориям):"
      );
    } else {
      parts.push("", "БЛЮДА:");
    }
    for (const dish of context.dishes) {
      const avail = dish.isAvailable ? "" : " (недоступно — не предлагать)";
      const conf =
        dish.confidence !== "high"
          ? ` [match: ${dish.confidence}]`
          : "";
      const tag = dish.tagName ? ` #${dish.tagName}` : "";
      const cat = dish.categoryName ? ` (${dish.categoryName})` : "";
      const cal = dish.calories ? ` ${dish.calories} ккал` : "";
      const popular =
        (context.orderCounts?.get(dish.id) || 0) >= 5
          ? ` [популярное: ${context.orderCounts!.get(dish.id)} заказов]`
          : "";
      parts.push(
        `[${dish.id}] ${dish.name} — ${dish.price}₽${cat}${tag}${cal}${popular}${avail}${conf}`
      );
      if (dish.detailedDescription) {
        parts.push(`  Детальный разбор: ${dish.detailedDescription}`);
      } else if (dish.description) {
        const desc =
          dish.description.length > 200
            ? dish.description.substring(0, 200) + "…"
            : dish.description;
        parts.push(`  ${desc}`);
      }
    }
  } else {
    parts.push(
      "",
      "БЛЮДА: подходящих блюд не найдено. Честно скажи гостю и попроси уточнить. dishes = []."
    );
  }

  if (context.cart && context.cart.items.length > 0) {
    const items = context.cart.items
      .map((i) => `- ${i.name} (${i.quantity} шт, ${i.price}₽/шт)`)
      .join("\n");
    parts.push(
      "",
      "КОРЗИНА (уже выбрано, НЕ предлагай повторно):",
      items,
      `Итого: ${context.cart.total}₽`
    );
  }

  if (
    context.recentRecommendations &&
    context.recentRecommendations.length > 0
  ) {
    const recs = context.recentRecommendations
      .map((r) => r.name)
      .join(", ");
    parts.push(
      "",
      `УЖЕ РЕКОМЕНДОВАЛ в этом диалоге: ${recs}. Старайся предлагать новое, но если это лучший вариант — можно повторить.`
    );
  }

  if (context.triggerType === "cart_update" && context.newItem) {
    parts.push(
      "",
      `СОБЫТИЕ: гость добавил "${context.newItem.name}". Кратко одобри выбор (1 фраза). dishes = []. suggestions = [].`
    );
  }

  return parts.join("\n");
}
