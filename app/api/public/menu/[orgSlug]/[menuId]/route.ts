import { NextRequest, NextResponse } from "next/server";
import { getCategories, getDishCategoriesForMenu, getDishes, getMenu, getOrganizationBySlug, getTags } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { orgSlug: string; menuId: string } }
) {
  try {
    const { orgSlug, menuId } = params;

    const org = await getOrganizationBySlug(orgSlug);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const menu = await getMenu(menuId);
    if (!menu || menu.organization_id !== org.id) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const [categories, dishes, dishCategories, tags] = await Promise.all([
      getCategories(menuId),
      getDishes(menuId),
      getDishCategoriesForMenu(menuId),
      getTags(org.id),
    ]);

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      menu: {
        ...menu,
        categories,
        dishes,
        dishCategories,
        tags,
        settings: {
          ...menu.settings,
          showWaiterButton: org.settings.showWaiterButton,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch public menu:", error);
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}
