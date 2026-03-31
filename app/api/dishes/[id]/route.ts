import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createDishCategory, deleteDish, deleteDishCategories, getDish, getMenu, updateDish } from "@/lib/db";

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

    const user = session.user as any;
    const dish = await getDish(params.id);

    if (!dish) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    const menu = await getMenu(dish.menu_id);
    if (!menu || menu.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    const { name, description, price, image, categoryIds } = await request.json();

    const updates: { name?: string; description?: string | null; price?: number; image?: string | null } = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description || null;
    if (price !== undefined) updates.price = parseFloat(price) || 0;
    if (image !== undefined) updates.image = image || null;

    const updatedDish = await updateDish(params.id, updates);

    if (categoryIds !== undefined && Array.isArray(categoryIds)) {
      await deleteDishCategories(params.id);
      for (const categoryId of categoryIds) {
        await createDishCategory({ dish_id: params.id, category_id: categoryId });
      }
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

    const user = session.user as any;
    const dish = await getDish(params.id);

    if (!dish) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    const menu = await getMenu(dish.menu_id);
    if (!menu || menu.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Dish not found" }, { status: 404 });
    }

    await deleteDish(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete dish:", error);
    return NextResponse.json({ error: "Failed to delete dish" }, { status: 500 });
  }
}
