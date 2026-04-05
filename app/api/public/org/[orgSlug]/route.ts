import { NextRequest, NextResponse } from "next/server";
import { getCategories, getDishCategoriesForMenu, getDishes, getMenus, getOrganizationBySlug, getTags } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  try {
    const { orgSlug } = params;

    const org = await getOrganizationBySlug(orgSlug);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const menus = await getMenus(org.id);
    const tags = await getTags(org.id);

    const menusWithCategories = await Promise.all(
      menus.map(async (menu) => {
        const [categories, dishes, dishCategories] = await Promise.all([
          getCategories(menu.id),
          getDishes(menu.id),
          getDishCategoriesForMenu(menu.id),
        ]);
        const visibleDishes = dishes.filter((d) => d.is_available !== false);
        return {
          ...menu,
          categories,
          dishes: visibleDishes,
          dishCategories,
        };
      })
    );

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      menus: menusWithCategories,
      tags,
      settings: {
        showWaiterButton: org.settings.showWaiterButton,
      },
    });
  } catch (error) {
    console.error("Failed to fetch organization menus:", error);
    return NextResponse.json({ error: "Failed to fetch menus" }, { status: 500 });
  }
}
