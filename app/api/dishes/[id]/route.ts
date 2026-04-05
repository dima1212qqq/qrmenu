import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createDishCategory, deleteDish, deleteDishCategories, getDish, getMenu, getUserOrganization, updateDish } from "@/lib/db";

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
