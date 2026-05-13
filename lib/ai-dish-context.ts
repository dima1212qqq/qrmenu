import { getChatProvider } from "@/lib/llm";

export interface DishContextInput {
  name: string;
  description?: string | null;
  price: number;
  weight?: string | null;
  calories?: number | null;
  allergens?: string | null;
  categoryNames: string[];
  tagName?: string | null;
}

const SYSTEM_PROMPT = `Ты — эксперт по кулинарии. На основе данных о блюде создай обогащённый текст для семантического поиска.

Правила:
- Пиши на русском языке.
- Используй только информацию из предоставленных данных и кулинарные знания о названии блюда. Не выдумывай ингредиенты и характеристики.
- Название блюда — главный источник информации. Используй кулинарные знания чтобы понять что это за блюдо.
- Контекст ДОЛЖЕН содержать: тип блюда, характеристики (острое, сытное, лёгкое, сладкое и т.д.), возможные предпочтения гостей, с чем сочетается.
- Обязательно укажи вкусовые характеристики если они известны для этого типа блюда (острое для пепперони/чили, нежное для крем-супа, хрустящее для жареного и т.д.)
- Не используй markdown, списки, номера. Простой связный текст через запятые.
- Максимум 300 символов. Минимум 50 символов.
- Не упоминай цену и вес — они есть в отдельных полях.
- Если описание пустое — сформируй контекст из названия, категории и тега, используя кулинарные знания.

Примеры:
"Пицца Пепперони — классическая итальянская пицца, острая, пикантная, с пепперони и сыром. Подойдёт любителям острого, итальянской кухни. Отлично сочетается с томатным соком."
"Цезарь с курицей — популярный салат, лёгкий, свежий, с курицей, сухариками и соусом цезарь. Для любителей салатов и лёгких блюд. Хорош как закуска или самостоятельное блюдо."
"Борщ — традиционный русский суп, наваристый, сытный, со свёклой и мясом. Для любителей первых блюд, домашней кухни. Отлично со сметаной и чесночными пампушками."`;

export async function generateDishContext(
  input: DishContextInput
): Promise<string | null> {
  const provider = getChatProvider();

  const parts: string[] = [];
  parts.push(`Название: ${input.name}`);
  if (input.description) parts.push(`Описание: ${input.description}`);
  if (input.categoryNames.length > 0)
    parts.push(`Категории: ${input.categoryNames.join(", ")}`);
  if (input.tagName) parts.push(`Тег: ${input.tagName}`);
  if (input.allergens) parts.push(`Аллергены: ${input.allergens}`);
  if (input.calories) parts.push(`Калории: ${input.calories}`);
  if (input.weight) parts.push(`Вес: ${input.weight}`);

  const userContent = parts.join("\n");

  try {
    const result = await provider.chatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const text = result.text.trim();
    if (text.length < 10) return null;
    return text;
  } catch (error) {
    console.error("[AI Dish Context] Generation failed:", error);
    return null;
  }
}

const DETAILED_SYSTEM_PROMPT = `Ты — шеф-повар и профессиональный сомелье элитного ресторана. Твоя задача — создать подробный, аппетитный и профессиональный разбор блюда для использования искусственным интеллектом в ответах гостям.

Правила:
- Пиши на русском языке.
- Опиши профиль вкуса (баланс кислого, сладкого, соленого, умами и т.д.).
- Расскажи о возможных способах приготовления и текстуре.
- Дай рекомендации по сочетанию (напитки, гарниры или другие блюда).
- Если блюдо имеет интересную историю или культурную особенность — упомяни её.
- Используй красивый, "вкусный" литературный язык.
- Используй переносы строк для структуры, но не используй сложные markdown-таблицы.
- Максимум 1000 символов, минимум 300 символов.
- Не указывай цены и граммовки.
- Опирайся на название блюда и его описание, используй свои знания о классических рецептах.`;

export async function generateDetailedDishContext(
  input: DishContextInput
): Promise<string | null> {
  const provider = getChatProvider();

  const parts: string[] = [];
  parts.push(`Название: ${input.name}`);
  if (input.description) parts.push(`Описание: ${input.description}`);
  if (input.categoryNames.length > 0)
    parts.push(`Категории: ${input.categoryNames.join(", ")}`);
  if (input.tagName) parts.push(`Тег: ${input.tagName}`);
  if (input.allergens) parts.push(`Аллергены: ${input.allergens}`);

  const userContent = parts.join("\n");

  try {
    const result = await provider.chatCompletion({
      messages: [
        { role: "system", content: DETAILED_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 600,
      temperature: 0.5,
    });

    const text = result.text.trim();
    if (text.length < 50) return null;
    return text;
  } catch (error) {
    console.error("[AI Detailed Dish Context] Generation failed:", error);
    return null;
  }
}
