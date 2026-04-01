import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteTag, getTag, updateTag } from "@/lib/db";

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
    if (user.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tag = await getTag(params.id);
    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const { name, emoji } = await request.json();

    const updates: { name?: string; emoji?: string } = {};
    if (name !== undefined) updates.name = name.trim();
    if (emoji !== undefined) updates.emoji = emoji.trim();

    const updatedTag = await updateTag(params.id, updates);

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error("Failed to update tag:", error);
    return NextResponse.json({ error: "Failed to update tag" }, { status: 500 });
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
    if (user.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tag = await getTag(params.id);
    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await deleteTag(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete tag:", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}
