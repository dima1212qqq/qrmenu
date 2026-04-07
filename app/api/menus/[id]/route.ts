import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deleteMenu,
  getCategories,
  getDishCategoriesForMenu,
  getDishes,
  getMenu,
  getUserOrganization,
  updateMenu,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const menu = await getMenu(params.id);

    if (!menu) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const userOrg = await getUserOrganization(user.id, menu.organization_id);
    if (!userOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [categories, dishes, dishCategories] = await Promise.all([
      getCategories(params.id),
      getDishes(params.id),
      getDishCategoriesForMenu(params.id),
    ]);

    return NextResponse.json({
      ...menu,
      categories,
      dishes,
      dishCategories,
    });
  } catch (error) {
    console.error("Failed to fetch menu:", error);
    return NextResponse.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}

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
    const menu = await getMenu(params.id);

    if (!menu) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const userOrg = await getUserOrganization(user.id, menu.organization_id);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can update menus" }, { status: 403 });
    }

    const updates = await request.json();
    const updatedMenu = await updateMenu(params.id, updates);

    return NextResponse.json(updatedMenu);
  } catch (error) {
    console.error("Failed to update menu:", error);
    return NextResponse.json({ error: "Failed to update menu" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const menu = await getMenu(params.id);

    if (!menu) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const userOrg = await getUserOrganization(user.id, menu.organization_id);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can update menus" }, { status: 403 });
    }

    const updates = await request.json();
    const updatedMenu = await updateMenu(params.id, updates);

    return NextResponse.json(updatedMenu);
  } catch (error) {
    console.error("Failed to update menu:", error);
    return NextResponse.json({ error: "Failed to update menu" }, { status: 500 });
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

    const orgId = request.headers.get("x-organization-id");
    if (!orgId) {
      return NextResponse.json({ error: "x-organization-id header is required" }, { status: 400 });
    }

    const menu = await getMenu(params.id);

    if (!menu || menu.organization_id !== orgId) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    const user = session.user as any;
    const userOrg = await getUserOrganization(user.id, orgId);
    if (!userOrg || userOrg.role !== "owner") {
      return NextResponse.json({ error: "Only owners can delete menus" }, { status: 403 });
    }

    await deleteMenu(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete menu:", error);
    return NextResponse.json({ error: "Failed to delete menu" }, { status: 500 });
  }
}
