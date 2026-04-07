import { NextRequest, NextResponse } from "next/server";
import { getMenuWithCategories, getTags } from "@/lib/db";
import { createEmbeddings, buildDishText } from "@/lib/embeddings";
import type { Category, Dish, Tag, DishCategory } from "@/lib/types";

interface EmbedMenuRequest {
  menuId: string;
}

interface DishEmbedding {
  id: string;
  vector: number[];
  payload: {
    dishId: string;
    name: string;
    price: number;
    image: string | null;
    text: string;
    tags: string[];
    categoryIds: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: EmbedMenuRequest = await request.json();
    const { menuId } = body;

    if (!menuId) {
      return NextResponse.json({ error: "menuId is required" }, { status: 400 });
    }

    const menuData = await getMenuWithCategories(menuId);
    if (!menuData) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const { menu, dishes, categories, dishCategories } = menuData;
    const tags = await getTags(menu.organization_id);

    const availableDishes = dishes.filter((d) => d.is_available !== false);

    if (availableDishes.length === 0) {
      return NextResponse.json({ embedded: true, count: 0 });
    }

    const embeddings: DishEmbedding[] = [];

    for (const dish of availableDishes) {
      const dishCats = dishCategories
        .filter((dc) => dc.dish_id === dish.id)
        .map((dc) => categories.find((c) => c.id === dc.category_id)?.name)
        .filter(Boolean) as string[];
      const dishTags = dish.tag_id ? tags.find((t: Tag) => t.id === dish.tag_id) : null;

      const text = buildDishText(dish.name, dish.description || null, dishTags ? [dishTags.name] : [], dishCats);

      embeddings.push({
        id: dish.id,
        vector: [], // Will be filled by createEmbeddings
        payload: {
          dishId: dish.id,
          name: dish.name,
          price: dish.price,
          image: dish.image || null,
          text,
          tags: dishTags ? [dishTags.name] : [],
          categoryIds: dishCats,
        },
      });
    }

    const texts = embeddings.map((e) => e.payload.text);
    const vectors = await createEmbeddings(texts);

    for (let i = 0; i < embeddings.length; i++) {
      embeddings[i].vector = vectors[i];
    }

    const qdrantUrl = process.env.QDRANT_URL;
    const qdrantApiKey = process.env.QDRANT_API_KEY;

    if (qdrantUrl) {
      const collectionName = `menu_${menuId}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (qdrantApiKey) {
        headers["api-key"] = qdrantApiKey;
      }

      await fetch(`${qdrantUrl}/collections/${collectionName}`, {
        method: "DELETE",
        headers,
      }).catch(() => {});

      await fetch(`${qdrantUrl}/collections/${collectionName}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          vectors: {
            size: vectors[0].length,
            distance: "Cosine",
          },
        }),
      });

      for (const embedding of embeddings) {
        await fetch(`${qdrantUrl}/collections/${collectionName}/points`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            points: [
              {
                id: embedding.id,
                vector: embedding.vector,
                payload: embedding.payload,
              },
            ],
          }),
        });
      }
    }

    return NextResponse.json({
      embedded: true,
      count: embeddings.length,
    });
  } catch (error) {
    console.error("Embed menu error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
