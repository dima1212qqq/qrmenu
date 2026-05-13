import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createDishCategory, deleteDish, deleteDishCategories, getDish, getMenu, getUserOrganization, updateDish, getCategories, getTags, getDishCategoriesForMenu } from "@/lib/db";
import { generateDishContext, generateDetailedDishContext } from "@/lib/ai-dish-context";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dish = await getDish(params.id);

    if (!dish) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    const menu = await getMenu(dish.menu_id);
    const orgId = request.headers.get("x-organization-id");
    if (!menu || (orgId && menu.organization_id !== orgId)) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    const user = session.user as any;
    const userOrg = await getUserOrganization(user.id, menu.organization_id);
    if (!userOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, price, image, weight, calories, allergens, tag_id, is_available, categoryIds } = body;
    const requestKeys = Object.keys(body);
    const isAvailabilityOnlyUpdate =
      requestKeys.length > 0 &&
      requestKeys.every((key) => key === "is_available") &&
      typeof is_available === "boolean";

    if (userOrg.role !== "owner" && !isAvailabilityOnlyUpdate) {
      return NextResponse.json(
        { error: "Only owners can edit dish details" },
        { status: 403 }
      );
    }

    const updates: {
      name?: string;
      description?: string | null;
      price?: number;
      image?: string | null;
      weight?: string | null;
      calories?: number | null;
      allergens?: string | null;
      tag_id?: string | null;
      is_available?: boolean;
    } = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description || null;
    if (price !== undefined) updates.price = parseFloat(price) || 0;
    if (image !== undefined) updates.image = image || null;
    if (weight !== undefined) updates.weight = (weight === '' || weight === null) ? null : weight;
    if (calories !== undefined) updates.calories = calories === '' || calories === null ? null : (calories ? parseInt(calories) : null);
    if (allergens !== undefined) updates.allergens = allergens || null;
    if (tag_id !== undefined) updates.tag_id = tag_id || null;
    if (is_available !== undefined) updates.is_available = Boolean(is_available);

    const updatedDish = await updateDish(params.id, updates);

    if (categoryIds !== undefined && Array.isArray(categoryIds)) {
      await deleteDishCategories(params.id);
      for (const categoryId of categoryIds) {
        await createDishCategory({ dish_id: params.id, category_id: categoryId });
      }
    }

    // Regenerate AI context if content-relevant fields changed
    const contentChanged =
      name !== undefined ||
      description !== undefined ||
      tag_id !== undefined ||
      categoryIds !== undefined ||
      allergens !== undefined ||
      calories !== undefined ||
      weight !== undefined;

    if (contentChanged && updatedDish) {
      (async () => {
        try {
          const [categories, dishCategories, tags] = await Promise.all([
            getCategories(dish.menu_id),
            getDishCategoriesForMenu(dish.menu_id),
            getTags(menu.organization_id),
          ]);

          const finalTagId = tag_id !== undefined ? tag_id : dish.tag_id;
          const finalCats = categoryIds !== undefined ? categoryIds : [];

          const dishCats = dishCategories
            .filter((dc) => dc.dish_id === params.id)
            .map((dc) => categories.find((c) => c.id === dc.category_id)?.name)
            .filter(Boolean) as string[];

          // If categoryIds were just updated, use them directly since getDishCategoriesForMenu may not reflect yet
          const categoryNames =
            categoryIds !== undefined
              ? (finalCats
                  .map((cid: string) => categories.find((c) => c.id === cid)?.name)
                  .filter(Boolean) as string[])
              : dishCats;

          const dishTag = finalTagId ? tags.find((t) => t.id === finalTagId) : null;

          const [aiContext, aiDetailedContext] = await Promise.all([
            generateDishContext({
              name: updatedDish.name,
              description: updatedDish.description,
              price: updatedDish.price,
              weight: updatedDish.weight,
              calories: updatedDish.calories,
              allergens: updatedDish.allergens,
              categoryNames,
              tagName: dishTag?.name || null,
            }),
            generateDetailedDishContext({
              name: updatedDish.name,
              description: updatedDish.description,
              price: updatedDish.price,
              weight: updatedDish.weight,
              calories: updatedDish.calories,
              allergens: updatedDish.allergens,
              categoryNames,
              tagName: dishTag?.name || null,
            })
          ]);

          if (aiContext || aiDetailedContext) {
            await updateDish(params.id, {
              ...(aiContext ? { ai_context: aiContext } : {}),
              ...(aiDetailedContext ? { ai_detailed_context: aiDetailedContext } : {})
            });
          }
        } catch (err) {
          console.error("[Dishes API] Failed to regenerate AI context:", err);
        }
      })();
    }

    return NextResponse.json(updatedDish);
  } catch (error) {
    console.error("Failed to update dish:", error);
    return NextResponse.json({ error: "Failed to update dish" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dish = await getDish(params.id);

    if (!dish) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    const menu = await getMenu(dish.menu_id);
    const orgId = request.headers.get("x-organization-id");
    if (!menu || (orgId && menu.organization_id !== orgId)) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    const user = session.user as any;
    const userOrg = await getUserOrganization(user.id, menu.organization_id);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can delete dishes" }, { status: 403 });
    }

    await deleteDish(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete dish:", error);
    return NextResponse.json({ error: "Failed to delete dish" }, { status: 500 });
  }
}
