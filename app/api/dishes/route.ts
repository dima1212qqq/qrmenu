import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createDish,
  createDishCategory,
  getDishes,
  getDishesForOrganization,
  getMenu,
} from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get("menuId");

    let dishes;

    if (menuId) {
      const menu = await getMenu(menuId);
      if (!menu || menu.organization_id !== user.organization_id) {
        return NextResponse.json({ error: "Menu not found" }, { status: 404 });
      }
      dishes = await getDishes(menuId);
    } else {
      dishes = await getDishesForOrganization(user.organization_id);
    }

    return NextResponse.json(dishes);
  } catch (error) {
    console.error("Failed to fetch dishes:", error);
    return NextResponse.json({ error: "Failed to fetch dishes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { menuId, name, description, price, image, weight, calories, allergens, tag_id, categoryIds } = await request.json();

    if (!menuId || !name || price === undefined) {
      return NextResponse.json({ error: "menuId, name and price are required" }, { status: 400 });
    }

    const menu = await getMenu(menuId);
    if (!menu || menu.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const dishId = uuidv4();
    const dish = await createDish({
      id: dishId,
      menu_id: menuId,
      name,
      description: description || null,
      price: parseFloat(price) || 0,
      image: image || null,
      weight: weight || null,
      calories: calories ? parseInt(calories) : null,
      allergens: allergens || null,
      tag_id: tag_id || null,
    });

    if (categoryIds && Array.isArray(categoryIds)) {
      for (const categoryId of categoryIds) {
        await createDishCategory({ dish_id: dishId, category_id: categoryId });
      }
    }

    return NextResponse.json(dish, { status: 201 });
  } catch (error) {
    console.error("Failed to create dish:", error);
    return NextResponse.json({ error: "Failed to create dish" }, { status: 500 });
  }
}
