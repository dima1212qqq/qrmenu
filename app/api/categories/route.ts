import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createCategory,
  getCategories,
  getCategoriesForOrganization,
  getMenu,
  getUserOrganization,
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
    const orgId = request.headers.get("x-organization-id") ?? searchParams.get("orgId");

    let categories;

    if (menuId) {
      const menu = await getMenu(menuId);
      if (!menu) {
        return NextResponse.json({ error: "Menu not found" }, { status: 404 });
      }

      const userOrg = await getUserOrganization(user.id, menu.organization_id);
      if (!userOrg) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      categories = await getCategories(menuId);
    } else if (orgId) {
      const userOrg = await getUserOrganization(user.id, orgId);
      if (!userOrg) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      categories = await getCategoriesForOrganization(orgId);
    } else {
      return NextResponse.json({ error: "menuId or orgId is required" }, { status: 400 });
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const { menuId, name, description } = await request.json();

    if (!menuId || !name) {
      return NextResponse.json({ error: "menuId and name are required" }, { status: 400 });
    }

    const menu = await getMenu(menuId);
    if (!menu) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const userOrg = await getUserOrganization(user.id, menu.organization_id);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can create categories" }, { status: 403 });
    }

    const existingCategories = await getCategories(menuId);
    const maxOrder = existingCategories.reduce((max, c) => Math.max(max, c.sort_order), -1);

    const category = await createCategory({
      id: uuidv4(),
      menu_id: menuId,
      name,
      description: description || null,
      sort_order: maxOrder + 1,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
