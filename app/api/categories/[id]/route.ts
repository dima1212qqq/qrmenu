import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteCategory, getCategory, getMenu, updateCategory } from "@/lib/db";

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
    const category = await getCategory(params.id);

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const menu = await getMenu(category.menu_id);
    if (!menu || menu.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const { name, description, sort_order, swapWithId } = await request.json();

    if (swapWithId !== undefined) {
      const swapCategory = await getCategory(swapWithId);
      if (!swapCategory || swapCategory.menu_id !== category.menu_id) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }

      const tempOrder = category.sort_order;
      await updateCategory(params.id, { sort_order: swapCategory.sort_order });
      await updateCategory(swapWithId, { sort_order: tempOrder });

      return NextResponse.json({ success: true });
    }

    const updates: { name?: string; description?: string | null; sort_order?: number } = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description || null;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const updatedCategory = await updateCategory(params.id, updates);
    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
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
    const category = await getCategory(params.id);

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const menu = await getMenu(category.menu_id);
    if (!menu || menu.organization_id !== user.organization_id) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    await deleteCategory(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
