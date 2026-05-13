import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserOrganization, getMenu, getCategories, getTags, getDishCategoriesForMenu } from "@/lib/db";
import { generateDishContext } from "@/lib/ai-dish-context";
import { prisma } from "@/lib/prisma";
import type { Dish as AppDish, Category, Tag, DishCategory } from "@/lib/types";

interface GenerateRequest {
  orgId?: string;
  menuId?: string;
  limit?: number;
}

interface GenerateResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

const DEFAULT_LIMIT = 50;
const BATCH_DELAY_MS = 500; // Small delay between dishes to respect OpenAI rate limits

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const body: GenerateRequest = await request.json();
    const { orgId, menuId, limit = DEFAULT_LIMIT } = body;

    if (!orgId && !menuId) {
      return NextResponse.json(
        { error: "orgId or menuId is required" },
        { status: 400 }
      );
    }

    let targetOrgId = orgId;

    if (menuId) {
      const menu = await getMenu(menuId);
      if (!menu) {
        return NextResponse.json({ error: "Menu not found" }, { status: 404 });
      }
      targetOrgId = menu.organization_id;
    }

    if (!targetOrgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const userOrg = await getUserOrganization(user.id, targetOrgId);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can generate AI contexts" },
        { status: 403 }
      );
    }

    // Fetch dishes without aiContext
    const whereClause: any = {
      aiContext: null,
      isAvailable: true,
    };

    if (menuId) {
      whereClause.menuId = menuId;
    } else {
      whereClause.menu = { organizationId: targetOrgId };
    }

    const dishes = await prisma.dish.findMany({
      where: whereClause,
      take: Math.min(limit, 200),
      orderBy: { name: "asc" },
    });

    if (dishes.length === 0) {
      return NextResponse.json({
        message: "No dishes without AI context found",
        result: { processed: 0, succeeded: 0, failed: 0, errors: [] },
      });
    }

    // Preload shared data
    const menuIds = Array.from(new Set(dishes.map((d) => d.menuId)));
    const categoriesMap = new Map<string, Category[]>();
    const dishCategoriesMap = new Map<string, DishCategory[]>();
    const tagsMap = new Map<string, Tag[]>();

    for (const mid of menuIds) {
      const [cats, dcs, tags] = await Promise.all([
        getCategories(mid),
        getDishCategoriesForMenu(mid),
        getTags(targetOrgId!),
      ]);
      categoriesMap.set(mid, cats);
      dishCategoriesMap.set(mid, dcs);
      tagsMap.set(mid, tags);
    }

    const result: GenerateResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    for (const dish of dishes) {
      result.processed++;
      try {
        const cats = categoriesMap.get(dish.menuId) || [];
        const dcs = dishCategoriesMap.get(dish.menuId) || [];
        const tags = tagsMap.get(dish.menuId) || [];

        const dishCats = dcs
          .filter((dc) => dc.dish_id === dish.id)
          .map((dc) => cats.find((c) => c.id === dc.category_id)?.name)
          .filter(Boolean) as string[];
        const dishTag = dish.tagId ? tags.find((t) => t.id === dish.tagId) : null;

        const aiContext = await generateDishContext({
          name: dish.name,
          description: dish.description,
          price: dish.price,
          weight: dish.weight,
          calories: dish.calories,
          allergens: dish.allergens,
          categoryNames: dishCats,
          tagName: dishTag?.name || null,
        });

        if (aiContext) {
          await prisma.dish.update({
            where: { id: dish.id },
            data: { aiContext },
          });
          result.succeeded++;
        } else {
          result.failed++;
          result.errors.push(`${dish.name}: AI returned empty context`);
        }

        // Small delay to respect rate limits
        if (result.processed < dishes.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
      } catch (err) {
        result.failed++;
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${dish.name}: ${msg}`);
        console.error(`[Generate Contexts] Failed for ${dish.id}:`, err);
      }
    }

    return NextResponse.json({
      message: `Processed ${result.processed} dishes`,
      result,
    });
  } catch (error) {
    console.error("[Generate Contexts] Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
