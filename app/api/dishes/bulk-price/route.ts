import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDishesForOrganization, getDishCategoriesForOrganization, updateDish, getUserOrganization } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = request.headers.get("x-organization-id");
    if (!orgId) {
      return NextResponse.json({ error: "x-organization-id header is required" }, { status: 400 });
    }

    const user = (session.user as any);
    const userOrg = await getUserOrganization(user.id, orgId);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can change prices" }, { status: 403 });
    }

    const { percent, categoryId } = await request.json();

    if (percent === undefined || percent === null) {
      return NextResponse.json({ error: "percent is required" }, { status: 400 });
    }

    const allDishes = await getDishesForOrganization(orgId);
    const allDishCategories = await getDishCategoriesForOrganization(orgId);

    let dishesToUpdate;
    if (categoryId) {
      const dishIdsInCategory = allDishCategories
        .filter((dc) => dc.category_id === categoryId)
        .map((dc) => dc.dish_id);
      dishesToUpdate = allDishes.filter((d) => dishIdsInCategory.includes(d.id));
    } else {
      dishesToUpdate = allDishes;
    }

    const multiplier = 1 + (percent / 100);
    const updatedDishes = [];

    for (const dish of dishesToUpdate) {
      const newPrice = Math.round(dish.price * multiplier * 100) / 100;
      const updated = await updateDish(dish.id, { price: newPrice });
      if (updated) {
        updatedDishes.push(updated);
      }
    }

    return NextResponse.json(updatedDishes);
  } catch (error) {
    console.error("Failed to bulk update prices:", error);
    return NextResponse.json({ error: "Failed to bulk update prices" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = request.headers.get("x-organization-id");
    if (!orgId) {
      return NextResponse.json({ error: "x-organization-id header is required" }, { status: 400 });
    }

    const user = (session.user as any);
    const userOrg = await getUserOrganization(user.id, orgId);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can change prices" }, { status: 403 });
    }

    const { dishes } = await request.json();

    if (!Array.isArray(dishes) || dishes.length === 0) {
      return NextResponse.json({ error: "dishes array is required" }, { status: 400 });
    }

    const updatedDishes = [];

    for (const { id, price } of dishes) {
      if (!id || price === undefined || price === null) continue;
      const updated = await updateDish(id, { price });
      if (updated) {
        updatedDishes.push(updated);
      }
    }

    return NextResponse.json(updatedDishes);
  } catch (error) {
    console.error("Failed to bulk update prices:", error);
    return NextResponse.json({ error: "Failed to bulk update prices" }, { status: 500 });
  }
}
